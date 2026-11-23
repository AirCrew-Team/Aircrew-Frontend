import { isAxiosError } from "axios"

import apiClient from "@/service/api-client"
import type {
  AdminFlight,
  CreateFlightInput,
  CrewStatus,
  FlightsCatalog,
  FlightsListParams,
  FlightsListResponse,
  FlightsStats,
  FlightStatus,
} from "@/modules/adminFlights/types/adminFlights.types"

// Vuelos de la pantalla del super admin, en el servicio flights (a través del gateway y
// con la cookie de sesión). El admin crea el vuelo; el supervisor lo tripula en
// Programación, que sigue leyendo GET /flights (un arreglo), sin cambios.

// El gateway quita /api/flights y el servicio monta los vuelos en /flights: la ruta
// completa es /api/flights/flights (como /api/flights/aircraft para Aeronaves).
const FLIGHTS_PATH = "/api/flights/flights"

// --- Traducción de valores: el backend usa inglés y snake_case. ---

type ApiStatus =
  "scheduled" | "delayed" | "in_flight" | "completed" | "cancelled"
type ApiCrewStatus = "unassigned" | "incomplete" | "complete" | "confirmed"

const API_STATUS: Record<FlightStatus, ApiStatus> = {
  programado: "scheduled",
  retrasado: "delayed",
  en_vuelo: "in_flight",
  completado: "completed",
  cancelado: "cancelled",
}
const STATUS_BY_API: Record<ApiStatus, FlightStatus> = {
  scheduled: "programado",
  delayed: "retrasado",
  in_flight: "en_vuelo",
  completed: "completado",
  cancelled: "cancelado",
}
const CREW_BY_API: Record<ApiCrewStatus, CrewStatus> = {
  unassigned: "sin_asignar",
  incomplete: "incompleta",
  complete: "completa",
  confirmed: "confirmada",
}

// Item de GET /flights/manage y respuesta de POST /flights.
interface ApiAdminFlight {
  id: string
  flight_number: string
  status: ApiStatus
  gate: string | null
  origin: string
  origin_city: string | null
  origin_timezone: string | null
  destination: string
  destination_city: string | null
  destination_timezone: string | null
  departure_at: string
  arrival_at: string
  aircraft_id: string
  aircraft_name: string
  aircraft_registration: string
  aircraft_seats: number
  scope: "domestic" | "international"
  required_slots: number
  crew_status: ApiCrewStatus
}

interface ApiOptions {
  airports: {
    code: string
    icao: string
    city: string
    name: string
    country: string
    timezone: string
    is_base: boolean
  }[]
  aircraft: {
    id: string
    registration: string
    name: string
    family: string | null
    capacity: number
    base: string | null
  }[]
  statuses: { code: ApiStatus; label: string }[]
}

const fromApi = (item: ApiAdminFlight): AdminFlight => ({
  id: item.id,
  flightNumber: item.flight_number,
  status: STATUS_BY_API[item.status],
  gate: item.gate,
  origin: {
    code: item.origin,
    city: item.origin_city,
    timezone: item.origin_timezone,
  },
  destination: {
    code: item.destination,
    city: item.destination_city,
    timezone: item.destination_timezone,
  },
  departureAt: item.departure_at,
  arrivalAt: item.arrival_at,
  aircraft: {
    id: item.aircraft_id,
    name: item.aircraft_name,
    registration: item.aircraft_registration,
    seats: item.aircraft_seats,
  },
  scope: item.scope === "international" ? "internacional" : "nacional",
  requiredSlots: item.required_slots,
  crewStatus: CREW_BY_API[item.crew_status] ?? "sin_asignar",
})

// --- Errores que la pantalla muestra con el texto del backend. ---

// Campo del formulario que falló, según el `field` del backend ({ error, field }).
export type FlightField =
  | "flightNumber"
  | "aircraftId"
  | "origin"
  | "destination"
  | "departureTime"
  | "arrivalTime"
  | "gate"

const FIELD_BY_API: Record<string, FlightField> = {
  flight_number: "flightNumber",
  aircraft_id: "aircraftId",
  origin: "origin",
  destination: "destination",
  departure_at: "departureTime",
  arrival_at: "arrivalTime",
  gate: "gate",
}

// 400, 404 o 409 con mensaje del backend (número repetido el mismo día, aeronave que
// ya vuela a esa hora, aeropuerto fuera del catálogo…) o 403 (sin permisos). Con
// `field`, el formulario muestra el mensaje debajo de ese campo.
export class FlightRequestError extends Error {
  readonly status: number
  readonly field: FlightField | null

  constructor(
    status: number,
    message: string,
    field: FlightField | null = null
  ) {
    super(message)
    this.name = "FlightRequestError"
    this.status = status
    this.field = field
  }
}

const toFlightError = (error: unknown) => {
  if (!isAxiosError(error) || !error.response) return error
  const { status } = error.response
  const message: unknown = error.response.data?.error
  const field: unknown = error.response.data?.field
  const text = typeof message === "string" ? message.trim() : ""

  if (status === 403) {
    return new FlightRequestError(
      403,
      "No tienes permisos para programar vuelos."
    )
  }
  if ((status === 400 || status === 404 || status === 409) && text) {
    return new FlightRequestError(
      status,
      text,
      typeof field === "string" ? (FIELD_BY_API[field] ?? null) : null
    )
  }
  return error
}

// --- Llamadas. ---

// Aeropuertos (con su zona horaria), aeronaves operativas y estados.
export const getFlightsCatalog = async (): Promise<FlightsCatalog> => {
  const { data } = await apiClient.get<ApiOptions>(`${FLIGHTS_PATH}/options`)
  return {
    airports: data.airports.map((airport) => ({
      code: airport.code,
      city: airport.city,
      name: airport.name,
      country: airport.country,
      timezone: airport.timezone,
      isBase: airport.is_base,
    })),
    aircraft: data.aircraft.map((aircraft) => ({ ...aircraft })),
    statuses: data.statuses.map(({ code, label }) => ({
      value: STATUS_BY_API[code],
      label,
    })),
  }
}

export const getFlightsStats = async (): Promise<FlightsStats> => {
  const { data } = await apiClient.get<{
    total: number
    today: number
    without_crew: number
    by_status: Record<ApiStatus, number>
  }>(`${FLIGHTS_PATH}/stats`)
  return {
    total: data.total,
    today: data.today,
    withoutCrew: data.without_crew,
    byStatus: {
      programado: data.by_status.scheduled ?? 0,
      retrasado: data.by_status.delayed ?? 0,
      en_vuelo: data.by_status.in_flight ?? 0,
      completado: data.by_status.completed ?? 0,
      cancelado: data.by_status.cancelled ?? 0,
    },
  }
}

// La búsqueda la hace el backend: número, origen, destino o matrícula.
export const getFlights = async (
  params: FlightsListParams
): Promise<FlightsListResponse> => {
  const { data } = await apiClient.get<{
    items: ApiAdminFlight[]
    page: number
    page_size: number
    total: number
  }>(`${FLIGHTS_PATH}/manage`, {
    params: {
      page: params.page,
      page_size: params.pageSize,
      // Vacío no se envía: el backend lo toma como «sin búsqueda».
      search: params.search.trim() || undefined,
      status: params.status ? API_STATUS[params.status] : undefined,
    },
  })
  return {
    items: data.items.map(fromApi),
    page: data.page,
    pageSize: data.page_size,
    total: data.total,
  }
}

// El vuelo nace «Programado» y sin tripulación: la asigna el supervisor.
export const createFlight = async (
  input: CreateFlightInput
): Promise<AdminFlight> => {
  try {
    const { data } = await apiClient.post<ApiAdminFlight>(FLIGHTS_PATH, {
      flight_number: input.flightNumber,
      aircraft_id: input.aircraftId,
      origin: input.origin,
      destination: input.destination,
      departure_at: input.departureAt,
      arrival_at: input.arrivalAt,
      gate: input.gate,
    })
    return fromApi(data)
  } catch (error) {
    throw toFlightError(error)
  }
}
