import { http, HttpResponse } from "msw"

import { API_URL, errorBody } from "./authApi"
import { server } from "../utils/server"

// Contrato del backend que simulan los tests de FE-4 (docs/specs/cierre-pendientes.md):
// pantallas del tripulante con la sesión real. Formas tomadas de los casos de uso del
// backend (flights: getMyAssignments, getMyNextAssignment, acknowledgeReplacement;
// crew: getMyMetrics, getMyCertification, getMyAbsences).
// - GET /api/flights/assignments/me?status=&month=&from=&to=&replacement=&acknowledged= →
//   asignaciones activas (status assigned) con su vuelo, por salida. MSW casa sin mirar la
//   query: el handler filtra como el backend. Al aprobar un reemplazo, la asignación del
//   titular pasa a replaced y deja de salir aquí: su vuelo solo se ve en absences/me.
// - GET /api/flights/assignments/me/next → la próxima, o 404 si no hay.
// - POST /api/flights/assignments/:id/acknowledge → 204; 409 { error, code } si no se puede
//   (already_acknowledged, replacement_inactive, not_a_replacement).
// - GET /api/crew/crew-members/me/metrics → horas del mes, descanso y sectores.
// - GET /api/crew/certifications/me → la certificación propia (404 sin perfil de crew).
// - GET /api/crew/absences/me → ausencias propias, la más reciente primero.

export const CREW_URLS = {
  assignments: `${API_URL}/api/flights/assignments/me`,
  next: `${API_URL}/api/flights/assignments/me/next`,
  acknowledge: `${API_URL}/api/flights/assignments/:id/acknowledge`,
  metrics: `${API_URL}/api/crew/crew-members/me/metrics`,
  certification: `${API_URL}/api/crew/certifications/me`,
  absences: `${API_URL}/api/crew/absences/me`,
} as const

// «Hoy» de los tests: 22 Nov 2026, 10:00 hora local.
export const TODAY = new Date(2026, 10, 22, 10, 0)

interface FlightBody {
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
  status: "scheduled" | "delayed" | "in_flight" | "completed" | "cancelled"
  gate: string | null
  scope: "domestic" | "international"
  block_minutes: number
}

export interface AssignmentBody {
  id: string
  role: "captain" | "first_officer" | "purser" | "flight_attendant"
  slot_id: string | null
  status: "assigned"
  source: string
  created_at: string
  is_replacement: boolean
  replacement: {
    reason: string | null
    approved_by: string | null
    approved_at: string | null
    deadline_at: string | null
  } | null
  acknowledged: boolean | null
  acknowledged_at: string | null
  flight: FlightBody
  aircraft: {
    id: string
    name: string | null
    registration: string | null
    family: string | null
  }
}

const ATL = {
  city: "Atlanta",
  name: "Atlanta Hartsfield-Jackson",
  timezone: "America/New_York",
}
const LAX = { city: "Los Angeles", name: "Los Angeles Intl" }
const JFK = { city: "New York", name: "New York John F. Kennedy" }
const MSP = {
  city: "Minneapolis",
  name: "Minneapolis-Saint Paul Intl",
  timezone: "America/Chicago",
}

const A321 = {
  id: "ac-1",
  name: "Airbus A321neo",
  registration: "N501DN",
  family: "A320",
}

const minutesBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000)

const flight = (
  fields: Omit<FlightBody, "block_minutes" | "scope"> &
    Partial<Pick<FlightBody, "scope">>
): FlightBody => ({
  scope: "domestic",
  ...fields,
  block_minutes: minutesBetween(fields.departure_at, fields.arrival_at),
})

const base = {
  slot_id: null,
  status: "assigned",
  source: "manual",
  created_at: "2026-11-01T12:00:00.000Z",
  is_replacement: false,
  replacement: null,
  acknowledged: null,
  acknowledged_at: null,
  aircraft: A321,
} as const

// Reemplazo pendiente de «Enterado»: mañana, ATL → LAX, puerta B12.
export const REPLACEMENT_ASSIGNMENT = {
  ...base,
  id: "asg-1",
  role: "first_officer",
  is_replacement: true,
  replacement: {
    reason: "Incapacidad médica del titular.",
    approved_by: "Sara Gómez Ruiz",
    approved_at: "2026-11-22T13:00:00.000Z",
    deadline_at: "2026-11-22T20:00:00.000Z",
  },
  acknowledged: false,
  flight: flight({
    id: "fl-2201",
    flight_number: "DL2201",
    origin: "ATL",
    destination: "LAX",
    origin_city: ATL.city,
    origin_name: ATL.name,
    origin_timezone: ATL.timezone,
    destination_city: LAX.city,
    destination_name: LAX.name,
    departure_at: "2026-11-23T16:15:00.000Z",
    arrival_at: "2026-11-23T21:10:00.000Z",
    status: "scheduled",
    gate: "B12",
  }),
} satisfies AssignmentBody

// Vuelo propio (no reemplazo), sin puerta todavía.
export const SCHEDULED_ASSIGNMENT = {
  ...base,
  id: "asg-2",
  role: "first_officer",
  flight: flight({
    id: "fl-1102",
    flight_number: "DL1102",
    origin: "ATL",
    destination: "JFK",
    origin_city: ATL.city,
    origin_name: ATL.name,
    origin_timezone: ATL.timezone,
    destination_city: JFK.city,
    destination_name: JFK.name,
    departure_at: "2026-11-28T13:00:00.000Z",
    arrival_at: "2026-11-28T15:10:00.000Z",
    status: "scheduled",
    gate: null,
  }),
} satisfies AssignmentBody

// Ya volado este mes.
export const COMPLETED_ASSIGNMENT = {
  ...base,
  id: "asg-3",
  role: "first_officer",
  flight: flight({
    id: "fl-0875",
    flight_number: "DL0875",
    origin: "MSP",
    destination: "ATL",
    origin_city: MSP.city,
    origin_name: MSP.name,
    origin_timezone: MSP.timezone,
    destination_city: ATL.city,
    destination_name: ATL.name,
    departure_at: "2026-11-10T12:00:00.000Z",
    arrival_at: "2026-11-10T14:45:00.000Z",
    status: "completed",
    gate: "C4",
  }),
} satisfies AssignmentBody

// Volado en octubre (otro mes del selector).
export const OCTOBER_ASSIGNMENT = {
  ...base,
  id: "asg-4",
  role: "first_officer",
  flight: flight({
    id: "fl-0300",
    flight_number: "DL0300",
    origin: "ATL",
    destination: "CDG",
    origin_city: ATL.city,
    origin_name: ATL.name,
    origin_timezone: ATL.timezone,
    destination_city: "Paris",
    destination_name: "Paris Charles de Gaulle",
    departure_at: "2026-10-15T22:00:00.000Z",
    arrival_at: "2026-10-16T06:30:00.000Z",
    status: "completed",
    gate: "E3",
    scope: "international",
  }),
} satisfies AssignmentBody

export const ALL_ASSIGNMENTS: AssignmentBody[] = [
  OCTOBER_ASSIGNMENT,
  COMPLETED_ASSIGNMENT,
  REPLACEMENT_ASSIGNMENT,
  SCHEDULED_ASSIGNMENT,
]

// Filtra como getMyAssignments del backend (status, month, from/to con to exclusivo,
// replacement, acknowledged).
const filterAssignments = (list: AssignmentBody[], params: URLSearchParams) => {
  const now = Date.now()
  const status = params.get("status")
  const month = params.get("month")
  const from = params.get("from")
  const to = params.get("to")
  const replacement = params.get("replacement")
  const acknowledged = params.get("acknowledged")
  return list.filter((item) => {
    const landed =
      item.flight.status === "completed" ||
      new Date(item.flight.arrival_at).getTime() < now
    if (status === "completed" && !landed) return false
    if (status === "upcoming" && (landed || item.flight.status === "cancelled"))
      return false
    if (month && item.flight.departure_at.slice(0, 7) !== month) return false
    const departure = new Date(item.flight.departure_at).getTime()
    if (from && departure < new Date(from).getTime()) return false
    if (to && departure >= new Date(to).getTime()) return false
    if (replacement !== null && String(item.is_replacement) !== replacement)
      return false
    if (
      acknowledged !== null &&
      String(item.acknowledged_at !== null) !== acknowledged
    )
      return false
    return true
  })
}

// Registra la query de cada GET /assignments/me (p. ej. «status=upcoming&from=…&to=…»).
export const mockMyAssignments = (list: AssignmentBody[] = ALL_ASSIGNMENTS) => {
  const queries: string[] = []
  server.use(
    http.get(CREW_URLS.assignments, ({ request }) => {
      const params = new URL(request.url).searchParams
      queries.push(params.toString())
      return HttpResponse.json(filterAssignments(list, params))
    })
  )
  return queries
}

export const mockMyAssignmentsError = () =>
  server.use(
    http.get(CREW_URLS.assignments, () =>
      HttpResponse.json(errorBody("Error interno"), { status: 500 })
    )
  )

export const mockNextAssignment = (
  assignment: AssignmentBody | null = REPLACEMENT_ASSIGNMENT
) =>
  server.use(
    http.get(CREW_URLS.next, () =>
      assignment
        ? HttpResponse.json(assignment)
        : HttpResponse.json(errorBody("No tienes vuelos próximos asignados."), {
            status: 404,
          })
    )
  )

export const mockNextAssignmentError = () =>
  server.use(
    http.get(CREW_URLS.next, () =>
      HttpResponse.json(errorBody("Error interno"), { status: 500 })
    )
  )

// Registra el id de cada «Enterado». `status` distinto de 204 simula un rechazo; con
// `code`, el cuerpo es el del backend ({ error, code }).
export const mockAcknowledge = (status = 204, code?: string) => {
  const ids: string[] = []
  server.use(
    http.post(CREW_URLS.acknowledge, ({ params }) => {
      ids.push(String(params.id))
      return status === 204
        ? new HttpResponse(null, { status: 204 })
        : HttpResponse.json(
            code
              ? { error: "Ya confirmaste este reemplazo.", code }
              : errorBody("Este reemplazo ya no está activo."),
            { status }
          )
    })
  )
  return ids
}

export const METRICS = {
  month: "2026-11",
  fdp: {
    used_hours: 45.5,
    max_hours: 100,
    regulation: "FAA 14 CFR Part 117",
    cycle_closes_on: "2026-11-30",
  },
  rest: {
    last_duty_end_at: "2026-11-10T14:45:00.000Z",
    rest_ends_at: "2026-11-11T00:45:00.000Z",
    guaranteed_minutes: 600,
  },
  sectors: {
    completed: 1,
    scheduled: 2,
    domestic: 1,
    international: 0,
    crew_delays: 0,
  },
}

export const mockMetrics = (body: object = METRICS) => {
  const queries: string[] = []
  server.use(
    http.get(CREW_URLS.metrics, ({ request }) => {
      queries.push(new URL(request.url).searchParams.toString())
      return HttpResponse.json(body)
    })
  )
  return queries
}

export const mockMetricsError = () =>
  server.use(
    http.get(CREW_URLS.metrics, () =>
      HttpResponse.json(errorBody("Error interno"), { status: 500 })
    )
  )

// Ausencias propias, como las deja el backend (la más reciente primero):
// - abs-1, por fechas (27-29 Nov), con dos vuelos: DL1102 aún sin reemplazo («reported»: la
//   asignación sigue activa y el vuelo sale en assignments/me) y DL1450, con el reemplazo
//   aprobado esperando su «Enterado» («pending_ack»: la asignación ya es replaced).
// - abs-2, por vuelo, DL0990 ya cubierto por otro tripulante (futuro, fuera de assignments/me).
// - abs-3, por vuelo, DL0812 cubierto pero ya volado: no se lista.
// - abs-4, cancelada sobre DL2201: no marca nada.
const absenceFlight = (fields: {
  id: string
  code: string
  flight_id: string
  flight_number: string
  origin: string
  destination: string
  departure_at: string
  status: "reported" | "pending_ack" | "covered" | "cancelled"
}) => ({ ...fields, slot_role: "first_officer" })

const flightAbsence = (fields: {
  id: string
  code: string
  reason: string
  status: "reported" | "pending_ack" | "covered" | "cancelled"
  flight_id: string
  flight_number: string
  origin: string
  destination: string
  departure_at: string
  created_at: string
}) => ({
  kind: "flight",
  notes: null,
  start_date: null,
  end_date: null,
  slot_role: "first_officer",
  attachment: null,
  flights: [],
  ...fields,
})

export const MY_ABSENCES = [
  {
    id: "abs-1",
    code: "AUS-0101",
    kind: "dates",
    reason: "illness",
    notes: null,
    status: "reported",
    start_date: "2026-11-27",
    end_date: "2026-11-29",
    flight_id: null,
    flight_number: null,
    origin: null,
    destination: null,
    departure_at: null,
    slot_role: null,
    attachment: null,
    created_at: "2026-11-21T12:00:00.000Z",
    flights: [
      absenceFlight({
        id: "abs-1a",
        code: "AUS-0102",
        flight_id: SCHEDULED_ASSIGNMENT.flight.id,
        flight_number: "DL1102",
        origin: "ATL",
        destination: "JFK",
        departure_at: SCHEDULED_ASSIGNMENT.flight.departure_at,
        status: "reported",
      }),
      absenceFlight({
        id: "abs-1b",
        code: "AUS-0103",
        flight_id: "fl-1450",
        flight_number: "DL1450",
        origin: "ATL",
        destination: "MCO",
        departure_at: "2026-11-29T14:00:00.000Z",
        status: "pending_ack",
      }),
    ],
  },
  flightAbsence({
    id: "abs-2",
    code: "AUS-0095",
    reason: "fatigue",
    status: "covered",
    flight_id: "fl-0990",
    flight_number: "DL0990",
    origin: "ATL",
    destination: "BOS",
    departure_at: "2026-11-25T18:30:00.000Z",
    created_at: "2026-11-15T12:00:00.000Z",
  }),
  flightAbsence({
    id: "abs-3",
    code: "AUS-0090",
    reason: "fatigue",
    status: "covered",
    flight_id: "fl-0812",
    flight_number: "DL0812",
    origin: "ATL",
    destination: "MSP",
    departure_at: "2026-11-12T10:00:00.000Z",
    created_at: "2026-11-05T12:00:00.000Z",
  }),
  flightAbsence({
    id: "abs-4",
    code: "AUS-0080",
    reason: "emergency",
    status: "cancelled",
    flight_id: REPLACEMENT_ASSIGNMENT.flight.id,
    flight_number: "DL2201",
    origin: "ATL",
    destination: "LAX",
    departure_at: REPLACEMENT_ASSIGNMENT.flight.departure_at,
    created_at: "2026-11-01T12:00:00.000Z",
  }),
]

export const mockMyAbsences = (body: object[] = MY_ABSENCES) =>
  server.use(http.get(CREW_URLS.absences, () => HttpResponse.json(body)))

export const mockMyAbsencesError = () =>
  server.use(
    http.get(CREW_URLS.absences, () =>
      HttpResponse.json(errorBody("Error interno"), { status: 500 })
    )
  )

export interface CertificationBody {
  user_id: string
  employee_code: string
  position: string
  area: "flight_deck" | "cabin" | null
  base: string | null
  status: "verified" | "pending_verification" | "uncertified"
  license_number: string | null
  certificates: string[]
  certificate_details: {
    code: string
    name: string
    short: string
    is_license: boolean
  }[]
  file: { file_name: string; mime_type: string; size_bytes: number } | null
  updated_at: string | null
  medical_expires_on: string | null
  ratings: string[]
  english_level: number | null
}

// Copiloto verificado: ATP con IR y ME, médico que vence en 20 días (12 Dic 2026),
// habilitación A320 e inglés OACI 5.
export const MY_CERTIFICATION = {
  user_id: "u-real-crew-1",
  employee_code: "TR-0042",
  position: "Copiloto",
  area: "flight_deck",
  base: "ATL",
  status: "verified",
  license_number: "1234567",
  certificates: ["ATP", "IR", "ME"],
  certificate_details: [
    {
      code: "ATP",
      name: "Airline Transport Pilot (ATP)",
      short: "ATP",
      is_license: true,
    },
    {
      code: "IR",
      name: "Instrument Rating (IR)",
      short: "IR",
      is_license: false,
    },
    { code: "ME", name: "Multi-Engine (ME)", short: "ME", is_license: false },
  ],
  file: {
    file_name: "certificado-faa.pdf",
    mime_type: "application/pdf",
    size_bytes: 120_000,
  },
  updated_at: "2026-11-01T15:00:00.000Z",
  medical_expires_on: "2026-12-12",
  ratings: ["A320"],
  english_level: 5,
} satisfies CertificationBody

// Sin certificación registrada ni datos del perfil: el expediente está vacío.
export const EMPTY_CERTIFICATION = {
  ...MY_CERTIFICATION,
  status: "uncertified",
  license_number: null,
  certificates: [],
  certificate_details: [],
  file: null,
  updated_at: null,
  medical_expires_on: null,
  ratings: [],
  english_level: null,
} satisfies CertificationBody

export const mockMyCertification = (
  body: CertificationBody | null = MY_CERTIFICATION
) => {
  let calls = 0
  server.use(
    http.get(CREW_URLS.certification, () => {
      calls += 1
      return body
        ? HttpResponse.json(body)
        : HttpResponse.json(errorBody("No tienes un perfil de tripulante."), {
            status: 404,
          })
    })
  )
  return () => calls
}

export const mockMyCertificationError = () =>
  server.use(
    http.get(CREW_URLS.certification, () =>
      HttpResponse.json(errorBody("Error interno"), { status: 500 })
    )
  )
