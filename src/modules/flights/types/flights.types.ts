export type FlightStatus = "reemplazo" | "programado" | "completado"

export interface FlightAirport {
  code: string
  city: string
  icao: string
}

// Dato de la rejilla de la tarjeta: etiqueta, valor y nota.
export interface FlightFact {
  label: string
  value: string
  note: string
}

export interface CrewFlight {
  flightNumber: string
  status: FlightStatus
  // Mes del roster, "AAAA-MM".
  month: string
  origin: FlightAirport
  destination: FlightAirport
  duration: string
  routeType: string
  departure: FlightFact
  aircraft: FlightFact
  role: FlightFact
  // Cuarto dato de la rejilla: cambia según el vuelo.
  milestone: FlightFact
  dispatch: string
  captain: string
  note: string
  aside: string
  details: { label: string; value: string }[]
}

export interface FlightMetrics {
  fdp: {
    usedHours: number
    maxHours: number
    regulation: string
    cycleClosesInDays: number
  }
  rest: { guaranteed: string; status: string; note: string; endsAt: string }
  month: {
    label: string
    completedSectors: number
    crewDelays: number
    domestic: number
    international: number
  }
}
