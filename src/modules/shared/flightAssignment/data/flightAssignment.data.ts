import * as demo from "./flightAssignment.demo"
import { withDemo } from "@/modules/shared/session/demoSession"
import { utcClock } from "@/modules/shared/base/myBase"
import type {
  Assignee,
  CrewSlot,
  FlightStatus,
  PlannedFlight,
  ScheduleDay,
  SlotCandidates,
  SlotRole,
} from "@/modules/shared/flightAssignment/types/flightAssignment.types"
import apiClient from "@/service/api-client"

// Programación de tripulaciones desde el gateway (servicio recommendation). Las 8 reglas
// y la IA (Claude) corren en el backend; aquí solo se piden y se traducen los resultados.

interface ApiAssignee {
  crew_id: string
  employee_code: string
  full_name: string
  rank: string
  month_hours: number
  max_month_hours: number
  source: "manual" | "ai" | "rule"
  rationale?: string | null
  is_replacement: boolean
  // Datos sin registrar (p. ej. un tripulante recién creado): «Sin habilitación registrada…».
  warnings?: string[]
}

interface ApiSlot {
  id: string
  role: "captain" | "first_officer" | "relief" | "purser" | "flight_attendant"
  accepts: string[]
  label: string
  assignee: ApiAssignee | null
}

interface ApiPlannedFlight {
  id: string
  flight_number: string
  date: string
  origin: { code: string; city: string }
  destination: { code: string; city: string }
  departure_at: string
  arrival_at: string
  duration_minutes: number
  scope: "domestic" | "international"
  gate: string | null
  aircraft: {
    model: string
    family: string
    registration: string
    seats: number
  }
  minimum_crew: { pilots: number; cabin: number }
  status: "unassigned" | "incomplete" | "complete" | "confirmed"
  slots: ApiSlot[]
}

const ROLE: Record<ApiSlot["role"], SlotRole> = {
  captain: "capitan",
  first_officer: "primer_oficial",
  relief: "piloto_relevo",
  purser: "jefe_cabina",
  flight_attendant: "tcp",
}

const STATUS: Record<ApiPlannedFlight["status"], FlightStatus> = {
  unassigned: "sin_asignar",
  incomplete: "incompleta",
  complete: "completa",
  confirmed: "confirmada",
}

const SOURCE: Record<ApiAssignee["source"], Assignee["source"]> = {
  manual: "manual",
  ai: "ia",
  rule: "regla",
}

// El backend solo deja a alguien en un puesto si cumple las reglas. Si le faltan datos
// (p. ej. recién creado, sin habilitación registrada), se muestran sus advertencias en vez
// de afirmar la habilitación.
const toAssignee = (assignee: ApiAssignee, family: string): Assignee => ({
  crewId: assignee.crew_id,
  fullName: assignee.full_name,
  summary: `${
    assignee.warnings?.length
      ? assignee.warnings.join(" · ")
      : `Habilitado en ${family}`
  } · ${assignee.month_hours} h de ${assignee.max_month_hours} este mes`,
  source: SOURCE[assignee.source],
  rationale: assignee.rationale ?? null,
})

const toSlot = (slot: ApiSlot, family: string): CrewSlot => ({
  // El id del backend (captain, fa-1…) viaja tal cual en las acciones.
  id: slot.id,
  role: ROLE[slot.role],
  label: slot.label,
  assignee: slot.assignee ? toAssignee(slot.assignee, family) : null,
})

const toPlannedFlight = (flight: ApiPlannedFlight): PlannedFlight => ({
  id: flight.id,
  flightNumber: flight.flight_number,
  date: flight.date,
  origin: flight.origin,
  destination: flight.destination,
  departureUtc: utcClock(flight.departure_at),
  arrivalUtc: utcClock(flight.arrival_at),
  // Las horas se muestran en UTC: llega «+1» si cambia el día UTC.
  arrivesNextDay:
    flight.arrival_at.slice(0, 10) !== flight.departure_at.slice(0, 10),
  durationMinutes: flight.duration_minutes,
  scope: flight.scope === "international" ? "internacional" : "nacional",
  aircraft: flight.aircraft,
  minimumCrew: flight.minimum_crew,
  slots: flight.slots.map((slot) => toSlot(slot, flight.aircraft.family)),
  status: STATUS[flight.status],
})

// Resumen de los próximos 7 días: vuelos y cuántos faltan por confirmar.
const getScheduleDaysFromApi = async (): Promise<ScheduleDay[]> => {
  const { data } = await apiClient.get<
    { date: string; flight_count: number; pending_count: number }[]
  >("/api/recommendation/schedule/days", { params: { days: 7 } })
  return data.map((day) => ({
    date: day.date,
    flightCount: day.flight_count,
    pendingCount: day.pending_count,
  }))
}

// Vuelos de un día (hora local de la base), ordenados por salida.
const getDayFlightsFromApi = async (date: string): Promise<PlannedFlight[]> => {
  const { data } = await apiClient.get<ApiPlannedFlight[]>(
    "/api/recommendation/schedule",
    { params: { date } }
  )
  return [...data]
    .sort(
      (a, b) =>
        new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime()
    )
    .map(toPlannedFlight)
}

// Elegibles (ya ordenados por puntaje) y no elegibles con el primer motivo que falla.
const getSlotCandidatesFromApi = async (
  flightId: string,
  slotId: string
): Promise<SlotCandidates> => {
  const { data } = await apiClient.get<{
    eligible: { crew_id: string; full_name: string; summary: string }[]
    ineligible: { crew_id: string; full_name: string; reason: string }[]
  }>(`/api/recommendation/flights/${flightId}/slots/${slotId}/candidates`)
  return {
    eligible: data.eligible.map((candidate) => ({
      crewId: candidate.crew_id,
      fullName: candidate.full_name,
      summary: candidate.summary,
    })),
    ineligible: data.ineligible.map((candidate) => ({
      crewId: candidate.crew_id,
      fullName: candidate.full_name,
      reason: candidate.reason,
    })),
  }
}

// Asigna a mano. Si no cumple una regla, el backend responde 409 con el motivo.
const assignCrewFromApi = async (
  flightId: string,
  slotId: string,
  crewId: string
): Promise<PlannedFlight> => {
  const { data } = await apiClient.put<ApiPlannedFlight>(
    `/api/recommendation/flights/${flightId}/slots/${slotId}`,
    { crew_id: crewId }
  )
  return toPlannedFlight(data)
}

const unassignCrewFromApi = async (
  flightId: string,
  slotId: string
): Promise<PlannedFlight> => {
  const { data } = await apiClient.delete<ApiPlannedFlight>(
    `/api/recommendation/flights/${flightId}/slots/${slotId}`
  )
  return toPlannedFlight(data)
}

// Puestos que ni la IA pudo cubrir, con el motivo.
export interface UnfilledSlot {
  slotId: string
  label: string
  reason: string
}

// Claude tarda entre 20 y 40 s (hasta ~60 s): más margen que el timeout general.
const AI_TIMEOUT_MS = 90_000

// La IA (Claude, en el backend) elige a la mejor persona para cada puesto vacío.
// El vuelo nunca se confirma solo.
const suggestCrewFromApi = async (
  flightId: string
): Promise<PlannedFlight & { unfilled?: UnfilledSlot[] }> => {
  const { data } = await apiClient.post<
    ApiPlannedFlight & {
      unfilled?: { slot_id: string; label: string; reason: string }[]
    }
  >(`/api/recommendation/flights/${flightId}/suggest`, undefined, {
    timeout: AI_TIMEOUT_MS,
  })
  return {
    ...toPlannedFlight(data),
    unfilled: (data.unfilled ?? []).map((slot) => ({
      slotId: slot.slot_id,
      label: slot.label,
      reason: slot.reason,
    })),
  }
}

// Confirma la tripulación (todos los puestos cubiertos) y avisa a cada tripulante.
const confirmFlightCrewFromApi = async (
  flightId: string
): Promise<PlannedFlight> => {
  const { data } = await apiClient.post<ApiPlannedFlight>(
    `/api/recommendation/flights/${flightId}/confirm`
  )
  return toPlannedFlight(data)
}

// Cuenta demo → datos de ejemplo (D4); sesión real → backend.
export const getScheduleDays = withDemo(
  getScheduleDaysFromApi,
  demo.getScheduleDays
)
export const getDayFlights = withDemo(getDayFlightsFromApi, demo.getDayFlights)
export const getSlotCandidates = withDemo(
  getSlotCandidatesFromApi,
  demo.getSlotCandidates
)
export const assignCrew = withDemo(assignCrewFromApi, demo.assignCrew)
export const unassignCrew = withDemo(unassignCrewFromApi, demo.unassignCrew)
export const suggestCrew = withDemo(suggestCrewFromApi, demo.suggestCrew)
export const confirmFlightCrew = withDemo(
  confirmFlightCrewFromApi,
  demo.confirmFlightCrew
)
