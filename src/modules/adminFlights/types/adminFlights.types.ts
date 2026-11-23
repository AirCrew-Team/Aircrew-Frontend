// Tipos de la pantalla Vuelos del super admin: crear vuelos que luego el supervisor
// tripula en Programación.

// Estado del vuelo: es el valor del filtro en la URL (?status=programado).
export type FlightStatus =
  "programado" | "retrasado" | "en_vuelo" | "completado" | "cancelado"

// Avance de la tripulación en Programación.
export type CrewStatus =
  "sin_asignar" | "incompleta" | "completa" | "confirmada"

export interface Airport {
  // Código IATA, ej. "BOG".
  code: string
  city: string
  // Nombre del aeropuerto, ej. "El Dorado".
  name: string
  // País ISO, ej. "CO".
  country: string
  // Zona horaria IANA, ej. "America/Bogota": las horas se piden y muestran en ella.
  timezone: string
  // Es base de tripulación (donde vive la tripulación).
  isBase: boolean
}

// Aeronave operativa que se puede programar. El modelo es el «tipo de avión».
export interface FlightAircraft {
  id: string
  registration: string
  // Modelo, ej. "Airbus A320neo".
  name: string
  // Familia, ej. "A320": la usa la regla de habilitación de los pilotos.
  family: string | null
  // Sillas: definen cuántos auxiliares necesita el vuelo.
  capacity: number
  base: string | null
}

export interface FlightsCatalog {
  airports: Airport[]
  aircraft: FlightAircraft[]
  statuses: { value: FlightStatus; label: string }[]
}

// Un extremo del vuelo. city y timezone son null si el aeropuerto no está en el
// catálogo (vuelos antiguos).
export interface FlightEndpoint {
  code: string
  city: string | null
  timezone: string | null
}

export interface AdminFlight {
  id: string
  // Ej. "DL1234".
  flightNumber: string
  status: FlightStatus
  gate: string | null
  origin: FlightEndpoint
  destination: FlightEndpoint
  // Fechas en ISO UTC; se muestran en la hora local de cada aeropuerto.
  departureAt: string
  arrivalAt: string
  aircraft: {
    id: string
    name: string
    registration: string
    seats: number
  }
  scope: "nacional" | "internacional"
  // Puestos que debe cubrir la tripulación (pilotos y cabina).
  requiredSlots: number
  crewStatus: CrewStatus
}

export interface FlightsListParams {
  page: number
  pageSize: number
  search: string
  status?: FlightStatus
}

export interface FlightsListResponse {
  items: AdminFlight[]
  page: number
  pageSize: number
  total: number
}

// Indicadores del encabezado; byStatus son también los conteos de los filtros.
export interface FlightsStats {
  total: number
  today: number
  withoutCrew: number
  byStatus: Record<FlightStatus, number>
}

// Lo que se envía al crear. Las fechas ya van en UTC.
export interface CreateFlightInput {
  flightNumber: string
  aircraftId: string
  origin: string
  destination: string
  departureAt: string
  arrivalAt: string
  gate: string | null
}
