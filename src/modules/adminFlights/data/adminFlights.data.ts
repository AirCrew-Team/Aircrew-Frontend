import { FlightRequestError } from "@/App/actions/flights/flightsAdmin.actions"
import type {
  AdminFlight,
  Airport,
  CreateFlightInput,
  CrewStatus,
  FlightAircraft,
  FlightsCatalog,
  FlightsListParams,
  FlightsListResponse,
  FlightsStats,
  FlightStatus,
} from "@/modules/adminFlights/types/adminFlights.types"
import { crewRequirement } from "@/modules/adminFlights/utils/crewRequirement"
import {
  durationMinutes,
  formatInZone,
  todayIn,
  zonedToUtc,
} from "@/modules/adminFlights/utils/flightTime"
import { FLIGHT_STATUS } from "@/modules/adminFlights/utils/flightStatus"

// Datos de ejemplo para las cuentas demo y el selector «Rol (dev)»: misma forma y mismas
// firmas que App/actions/flights/flightsAdmin.actions (la sesión real). Ver
// useFlightsAdminApi. Delta Air Lines: las bases son sus 9 hubs (los mismos de
// @vuelos/shared en el backend, de Usuarios y de Aeronaves) y las aeronaves son las
// operativas de la flota demo de Aeronaves.

// Zona por defecto del backend (DEFAULT_TIMEZONE de @vuelos/shared): define «Hoy».
const HOME_ZONE = "America/New_York"
const MAX_DURATION_MINUTES = 20 * 60
const FLIGHT_NUMBER_PATTERN = /^[A-Z0-9]{2}\d{1,4}$/

const hub = (
  code: string,
  city: string,
  name: string,
  timezone: string
): AirportData => ({ code, city, name, country: "US", timezone, isBase: true })

// Ordenados por ciudad, como los devolverá el backend.
type AirportData = Omit<Airport, "latitude" | "longitude">

const AIRPORT_DATA: AirportData[] = [
  hub(
    "ATL",
    "Atlanta",
    "Hartsfield-Jackson Atlanta International",
    "America/New_York"
  ),
  hub("BOS", "Boston", "Boston Logan International", "America/New_York"),
  hub("DTW", "Detroit", "Detroit Metropolitan Wayne County", "America/Detroit"),
  hub("LAX", "Los Ángeles", "Los Angeles International", "America/Los_Angeles"),
  hub(
    "MSP",
    "Minneapolis-St. Paul",
    "Minneapolis-Saint Paul International",
    "America/Chicago"
  ),
  hub("JFK", "Nueva York", "John F. Kennedy International", "America/New_York"),
  hub("LGA", "Nueva York", "LaGuardia", "America/New_York"),
  hub(
    "SLC",
    "Salt Lake City",
    "Salt Lake City International",
    "America/Denver"
  ),
  hub("SEA", "Seattle", "Seattle-Tacoma International", "America/Los_Angeles"),
  // Destinos que no son base: los mismos de database/flights_db.sql.
  {
    code: "CUN",
    city: "Cancún",
    name: "Cancún International",
    country: "MX",
    timezone: "America/Cancun",
    isBase: false,
  },
  {
    code: "LHR",
    city: "Londres",
    name: "London Heathrow",
    country: "GB",
    timezone: "Europe/London",
    isBase: false,
  },
  {
    code: "CDG",
    city: "París",
    name: "Paris-Charles de Gaulle",
    country: "FR",
    timezone: "Europe/Paris",
    isBase: false,
  },
]

// Coordenadas (grados decimales): las mismas de database/flights_db.sql.
const COORDINATES: Record<string, [number, number]> = {
  ATL: [33.6407, -84.4277],
  BOS: [42.3656, -71.0096],
  DTW: [42.2162, -83.3554],
  LAX: [33.9416, -118.4085],
  MSP: [44.8848, -93.2223],
  JFK: [40.6413, -73.7781],
  LGA: [40.7769, -73.874],
  SLC: [40.7899, -111.9791],
  SEA: [47.4502, -122.3088],
  CDG: [49.0097, 2.5479],
  LHR: [51.47, -0.4543],
  CUN: [21.0365, -86.8771],
}

const AIRPORTS: Airport[] = AIRPORT_DATA.map((airport) => ({
  ...airport,
  latitude: COORDINATES[airport.code]?.[0] ?? null,
  longitude: COORDINATES[airport.code]?.[1] ?? null,
}))

const plane = (
  id: string,
  registration: string,
  name: string,
  family: string,
  capacity: number,
  base: string
): FlightAircraft => ({ id, registration, name, family, capacity, base })

// Solo las operativas (N271SY está en mantenimiento), por matrícula.
const AIRCRAFT: FlightAircraft[] = [
  plane("ac-06", "N122DU", "Airbus A220-300", "A220", 130, "BOS"),
  plane("ac-01", "N391DN", "Airbus A321neo", "A320", 194, "ATL"),
  plane("ac-08", "N394DN", "Airbus A321neo", "A320", 194, "JFK"),
  plane("ac-02", "N411DX", "Airbus A330-900neo", "A330", 281, "ATL"),
  plane("ac-05", "N503DN", "Airbus A350-900", "A350", 306, "DTW"),
  plane("ac-04", "N827DN", "Boeing 737-900ER", "737", 180, "SLC"),
]

const findAirport = (code: string) =>
  AIRPORTS.find((airport) => airport.code === code)
const findAircraft = (id: string) =>
  AIRCRAFT.find((aircraft) => aircraft.id === id)

// «2026-11-24» + n días.
const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

const buildFlight = (
  id: string,
  input: CreateFlightInput,
  status: FlightStatus = "programado",
  crewStatus: CrewStatus = "sin_asignar"
): AdminFlight => {
  const origin = findAirport(input.origin)
  const destination = findAirport(input.destination)
  const aircraft = findAircraft(input.aircraftId) ?? AIRCRAFT[0]
  return {
    id,
    flightNumber: input.flightNumber,
    status,
    gate: input.gate,
    origin: {
      code: input.origin,
      city: origin?.city ?? null,
      timezone: origin?.timezone ?? null,
    },
    destination: {
      code: input.destination,
      city: destination?.city ?? null,
      timezone: destination?.timezone ?? null,
    },
    departureAt: input.departureAt,
    arrivalAt: input.arrivalAt,
    aircraft: {
      id: aircraft.id,
      name: aircraft.name,
      registration: aircraft.registration,
      seats: aircraft.capacity,
    },
    scope:
      origin?.country === "US" && destination?.country === "US"
        ? "nacional"
        : "internacional",
    requiredSlots: crewRequirement(
      aircraft.capacity,
      durationMinutes(input.departureAt, input.arrivalAt)
    ).slots,
    crewStatus,
  }
}

// Vuelos de ejemplo alrededor de hoy (hora de Nueva York), para que «Hoy» tenga datos:
// [número, origen, destino, día (0 = hoy), salida local, minutos, aeronave, estado,
// tripulación, puerta].
const SEED: [
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  FlightStatus,
  CrewStatus,
  string | null,
][] = [
  [
    "DL1180",
    "ATL",
    "JFK",
    -1,
    "18:00",
    135,
    "ac-01",
    "cancelado",
    "sin_asignar",
    null,
  ],
  [
    "DL2201",
    "ATL",
    "BOS",
    0,
    "06:10",
    150,
    "ac-01",
    "completado",
    "confirmada",
    "A3",
  ],
  [
    "DL2207",
    "JFK",
    "LAX",
    0,
    "08:30",
    390,
    "ac-08",
    "en_vuelo",
    "confirmada",
    "B2",
  ],
  [
    "DL0418",
    "SLC",
    "SEA",
    0,
    "11:45",
    125,
    "ac-04",
    "retrasado",
    "completa",
    "A7",
  ],
  [
    "DL0030",
    "ATL",
    "LHR",
    0,
    "19:30",
    525,
    "ac-02",
    "programado",
    "incompleta",
    "C1",
  ],
  [
    "DL1550",
    "DTW",
    "MSP",
    1,
    "07:00",
    120,
    "ac-06",
    "programado",
    "sin_asignar",
    null,
  ],
  [
    "DL0880",
    "MSP",
    "CUN",
    1,
    "09:15",
    240,
    "ac-05",
    "programado",
    "sin_asignar",
    "D4",
  ],
  [
    "DL0612",
    "BOS",
    "CDG",
    2,
    "18:20",
    405,
    "ac-05",
    "programado",
    "sin_asignar",
    null,
  ],
]

const today = todayIn(HOME_ZONE)
const FLIGHTS: AdminFlight[] = SEED.map(
  (
    [number, from, to, day, time, minutes, aircraftId, status, crew, gate],
    index
  ) => {
    const origin = findAirport(from)
    const departure = zonedToUtc(
      addDays(today, day),
      time,
      origin?.timezone ?? HOME_ZONE
    ) as Date
    const arrival = new Date(departure.getTime() + minutes * 60_000)
    return buildFlight(
      `fl-${index + 1}`,
      {
        flightNumber: number,
        aircraftId,
        origin: from,
        destination: to,
        departureAt: departure.toISOString(),
        arrivalAt: arrival.toISOString(),
        gate,
      },
      status,
      crew
    )
  }
)

// Copias: datos nuevos en cada respuesta, como el backend (TanStack Query repinta).
const copy = (flight: AdminFlight): AdminFlight => structuredClone(flight)
const byDeparture = (a: AdminFlight, b: AdminFlight) =>
  Date.parse(a.departureAt) - Date.parse(b.departureAt)

// Sin mayúsculas ni tildes: «cancun» encuentra «Cancún».
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

const matchesSearch = (flight: AdminFlight, search: string) =>
  [
    flight.flightNumber,
    flight.origin.code,
    flight.origin.city ?? "",
    flight.destination.code,
    flight.destination.city ?? "",
    flight.aircraft.registration,
  ].some((value) => normalize(value).includes(search))

export const getFlightsCatalog = (): Promise<FlightsCatalog> =>
  Promise.resolve({
    airports: structuredClone(AIRPORTS),
    aircraft: structuredClone(AIRCRAFT),
    statuses: Object.entries(FLIGHT_STATUS).map(([value, { label }]) => ({
      value: value as FlightStatus,
      label,
    })),
  })

export const getFlights = (
  params: FlightsListParams
): Promise<FlightsListResponse> => {
  const search = normalize(params.search.trim())
  const matches = FLIGHTS.filter(
    (flight) =>
      (!params.status || flight.status === params.status) &&
      (!search || matchesSearch(flight, search))
  ).sort(byDeparture)
  const start = (params.page - 1) * params.pageSize
  return Promise.resolve({
    items: matches.slice(start, start + params.pageSize).map(copy),
    page: params.page,
    pageSize: params.pageSize,
    total: matches.length,
  })
}

const isPending = (flight: AdminFlight) =>
  flight.status !== "cancelado" && flight.status !== "completado"

export const getFlightsStats = (): Promise<FlightsStats> => {
  const now = todayIn(HOME_ZONE)
  const count = (status: FlightStatus) =>
    FLIGHTS.filter((flight) => flight.status === status).length
  return Promise.resolve({
    total: FLIGHTS.length,
    today: FLIGHTS.filter(
      (flight) => todayIn(HOME_ZONE, new Date(flight.departureAt)) === now
    ).length,
    withoutCrew: FLIGHTS.filter(
      (flight) =>
        isPending(flight) &&
        (flight.crewStatus === "sin_asignar" ||
          flight.crewStatus === "incompleta")
    ).length,
    byStatus: {
      programado: count("programado"),
      retrasado: count("retrasado"),
      en_vuelo: count("en_vuelo"),
      completado: count("completado"),
      cancelado: count("cancelado"),
    },
  })
}

// Mismas reglas que el backend: los mismos textos, status (400 / 404 / 409) y campo.
const validate = (input: CreateFlightInput) => {
  if (!FLIGHT_NUMBER_PATTERN.test(input.flightNumber)) {
    throw new FlightRequestError(
      400,
      "Usa el código de la aerolínea y de 1 a 4 números (ej. DL1234).",
      "flightNumber"
    )
  }
  for (const [field, code] of [
    ["origin", input.origin],
    ["destination", input.destination],
  ] as const) {
    if (!findAirport(code)) {
      throw new FlightRequestError(
        400,
        `El aeropuerto ${code} no está en el catálogo.`,
        field
      )
    }
  }
  if (input.origin === input.destination) {
    throw new FlightRequestError(
      400,
      "El origen y el destino deben ser distintos."
    )
  }
  const minutes = durationMinutes(input.departureAt, input.arrivalAt)
  if (minutes <= 0 || minutes > MAX_DURATION_MINUTES) {
    throw new FlightRequestError(
      400,
      "La llegada debe ser después de la salida y el vuelo durar máximo 20 h.",
      "arrivalTime"
    )
  }
  const aircraft = findAircraft(input.aircraftId)
  if (!aircraft) throw new FlightRequestError(404, "Aeronave no encontrada.")

  const day = input.departureAt.slice(0, 10)
  if (
    FLIGHTS.some(
      (flight) =>
        flight.flightNumber === input.flightNumber &&
        flight.departureAt.slice(0, 10) === day
    )
  ) {
    throw new FlightRequestError(
      409,
      `Ya existe el vuelo ${input.flightNumber} el ${day}.`,
      "flightNumber"
    )
  }

  const crossing = FLIGHTS.find(
    (flight) =>
      flight.aircraft.id === aircraft.id &&
      flight.status !== "cancelado" &&
      Date.parse(flight.departureAt) < Date.parse(input.arrivalAt) &&
      Date.parse(flight.arrivalAt) > Date.parse(input.departureAt)
  )
  if (crossing) {
    const zone = crossing.origin.timezone
    throw new FlightRequestError(
      409,
      `${aircraft.registration} ya vuela de ${formatInZone(crossing.departureAt, zone).time} a ${formatInZone(crossing.arrivalAt, zone).time} (${crossing.flightNumber}).`,
      "aircraftId"
    )
  }
}

let nextId = FLIGHTS.length + 1

// El vuelo nace «Programado» y sin tripulación. Simula la latencia de la red.
export const createFlight = (input: CreateFlightInput): Promise<AdminFlight> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        validate(input)
      } catch (error) {
        reject(error)
        return
      }
      const flight = buildFlight(`fl-${nextId++}`, input)
      FLIGHTS.push(flight)
      resolve(copy(flight))
    }, 400)
  })
