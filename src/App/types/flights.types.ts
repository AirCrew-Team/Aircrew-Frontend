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
  // «AAAA-MM», por la fecha de salida en UTC.
  month?: string
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

// GET /crew/absences/me: solo lo que usa Mis Vuelos para marcar los vuelos afectados.
// Una ausencia por fechas trae sus vuelos en `flights`; una por vuelo trae su `flight_id`.
export interface ApiMyAbsence {
  id: string
  status: ApiMyAbsenceStatus
  flight_id: string | null
  flights: { flight_id: string; status: ApiMyAbsenceStatus }[]
}
