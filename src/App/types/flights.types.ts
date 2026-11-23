// Vuelos del tripulante con la sesión real (FE-4): forma de las respuestas del backend
// (servicios flights y crew) tal como llegan por el gateway.

export type ApiCrewRole =
  "captain" | "first_officer" | "purser" | "flight_attendant"

export type ApiFlightStatus =
  "scheduled" | "delayed" | "in_flight" | "completed" | "cancelled"

// GET /flights/assignments/me y /me/next: la asignación con su vuelo y su aeronave.
// Las fechas son ISO 8601 en UTC.
export interface ApiFlightAssignment {
  id: string
  role: ApiCrewRole
  is_replacement: boolean
  // Solo en los reemplazos; null en las asignaciones propias.
  replacement: {
    reason: string | null
    approved_by: string | null
    approved_at: string | null
    deadline_at: string | null
  } | null
  // null si no es un reemplazo.
  acknowledged: boolean | null
  flight: {
    id: string
    flight_number: string
    origin: string
    destination: string
    origin_city: string | null
    origin_name: string | null
    origin_timezone: string | null
    destination_city: string | null
    destination_name: string | null
    departure_at: string
    arrival_at: string
    status: ApiFlightStatus
    gate: string | null
    scope: "domestic" | "international"
    block_minutes: number
  }
  aircraft: {
    name: string | null
    registration: string | null
    family: string | null
  }
}

export interface MyAssignmentsFilters {
  // upcoming: aún no aterriza; completed: ya aterrizó (historial).
  status?: "upcoming" | "completed"
  // Rango de la fecha de salida, ISO 8601; to es exclusivo.
  from?: string
  to?: string
  replacement?: boolean
  acknowledged?: boolean
}

// GET /crew/crew-members/me/metrics: horas del mes (FDP), descanso y sectores.
export interface ApiFlightMetrics {
  month: string
  fdp: {
    used_hours: number
    max_hours: number
    regulation: string
    // Último día del mes, «AAAA-MM-DD».
    cycle_closes_on: string
  }
  rest: {
    last_duty_end_at: string | null
    rest_ends_at: string | null
    guaranteed_minutes: number
  }
  sectors: {
    completed: number
    scheduled: number
    domestic: number
    international: number
    crew_delays: number
  }
}

export type ApiMyAbsenceStatus =
  "reported" | "pending_ack" | "covered" | "cancelled"

// Vuelo de una ausencia, copiado al reportarla. null en una ausencia por fechas (madre).
export interface ApiMyAbsenceFlight {
  flight_id: string | null
  flight_number: string | null
  origin: string | null
  destination: string | null
  departure_at: string | null
  status: ApiMyAbsenceStatus
}

// GET /crew/absences/me: solo lo que usa Mis Vuelos (marcas y vuelos liberados).
// Una ausencia por fechas trae sus vuelos en `flights`; una por vuelo trae su `flight_id`.
export interface ApiMyAbsence extends ApiMyAbsenceFlight {
  id: string
  flights: (ApiMyAbsenceFlight & { id: string })[]
}
