import * as demo from "./shiftCrew.demo"
import { withDemo } from "@/modules/shared/session/demoSession"
import { getMyBase, utcClock } from "@/modules/shared/base/myBase"
import type {
  CrewMember,
  FlightRef,
  ShiftCrew,
} from "@/modules/shiftCrew/types/shiftCrew.types"
import apiClient from "@/service/api-client"

// Tripulación del turno desde GET /crew/shift-crew?base=. El backend ya la devuelve
// ordenada: guardia por minutos a rampa, en vuelo por llegada, programados por
// presentación, descanso por fin, ausentes y, al final, los libres.

interface ApiFlightRef {
  id: string
  flight_number: string
  origin: string
  destination: string
}

interface ApiShiftMember {
  id: string
  employee_code: string
  full_name: string
  position: string
  rank: string
  phone: string | null
  radio_channel: string | null
  expiring_certification: { name: string; days_left: number } | null
  status:
    "standby" | "in_flight" | "scheduled" | "rest" | "absent" | "available"
  location?: string | null
  minutes_to_ramp?: number | null
  guard_until?: string | null
  replacement_blocker?: string | null
  flight?: ApiFlightRef | null
  arrival_at?: string | null
  report_at?: string | null
  rest_until?: string | null
  reason?: string | null
}

interface ApiShiftCrew {
  base: string | null
  shift: string
  members: ApiShiftMember[]
}

// Sin dato del backend se muestra un guion, no un valor inventado.
const NO_DATA = "—"

const toFlightRef = (flight: ApiFlightRef): FlightRef => ({
  flightNumber: flight.flight_number,
  origin: flight.origin,
  destination: flight.destination,
})

const clockOrDash = (iso: string | null | undefined) =>
  iso ? utcClock(iso) : NO_DATA

// null: el estado no tiene lugar en la pantalla (en vuelo o programado sin vuelo, o un
// estado desconocido).
const toCrewMember = (member: ApiShiftMember): CrewMember | null => {
  const base = {
    id: member.id,
    fullName: member.full_name,
    position: member.position,
    phone: member.phone ?? NO_DATA,
    radioChannel: member.radio_channel ?? NO_DATA,
    expiringCertification: member.expiring_certification
      ? {
          name: member.expiring_certification.name,
          daysLeft: member.expiring_certification.days_left,
        }
      : null,
  }

  switch (member.status) {
    case "standby":
      return {
        ...base,
        status: "guardia",
        location: member.location ?? NO_DATA,
        minutesToRamp: member.minutes_to_ramp ?? null,
        guardUntilUtc: clockOrDash(member.guard_until),
        replacementBlocker: member.replacement_blocker ?? null,
      }
    case "in_flight":
      return member.flight
        ? {
            ...base,
            status: "en_vuelo",
            flight: toFlightRef(member.flight),
            arrivalUtc: clockOrDash(member.arrival_at),
          }
        : null
    case "scheduled":
      return member.flight
        ? {
            ...base,
            status: "programado",
            flight: toFlightRef(member.flight),
            reportUtc: clockOrDash(member.report_at),
          }
        : null
    case "rest":
      return {
        ...base,
        status: "descanso",
        restUntilUtc: clockOrDash(member.rest_until),
      }
    case "absent":
      return {
        ...base,
        status: "ausente",
        flight: member.flight ? toFlightRef(member.flight) : null,
        reason: member.reason ?? NO_DATA,
      }
    case "available":
      return { ...base, status: "sin_asignar" }
    // Un estado nuevo del backend que la pantalla aún no conoce no la rompe.
    default:
      return null
  }
}

// Tripulación de la base del supervisor durante su turno.
const getShiftCrewFromApi = async (): Promise<ShiftCrew> => {
  const myBase = await getMyBase()
  const { data } = await apiClient.get<ApiShiftCrew>("/api/crew/shift-crew", {
    params: { base: myBase.iata },
  })
  return {
    base: { code: myBase.iata, name: myBase.base_name },
    members: data.members
      .map(toCrewMember)
      .filter((member): member is CrewMember => member !== null),
  }
}

// Cuenta demo → datos de ejemplo (D4); sesión real → backend.
export const getShiftCrew = withDemo(getShiftCrewFromApi, demo.getShiftCrew)
