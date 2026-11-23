export type FlightStatus = "reemplazo" | "programado" | "completado"

export interface FlightAirport {
  code: string
  // "" si el backend no conoce el aeropuerto.
  city: string
  // null con la sesión real: el backend no tiene el código ICAO.
  icao: string | null
}

// Dato de la rejilla de la tarjeta: etiqueta, valor y nota.
export interface FlightFact {
  label: string
  value: string
  note: string
}

export interface CrewFlight {
  // Id del vuelo (en la demo, el número): los números se repiten entre días.
  id: string
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
  // null con la sesión real: el backend no trae al comandante ni esas notas.
  captain: string | null
  note: string | null
  aside: string | null
  details: { label: string; value: string }[]
}

export interface FlightMetrics {
  fdp: {
    usedHours: number
    maxHours: number
    regulation: string
    // null sin vuelos (sesión real): no se muestra el cierre del ciclo.
    cycleClosesInDays: number | null
  }
  rest: { guaranteed: string; status: string; note: string; endsAt: string }
  month: {
    label: string
    completedSectors: number
    crewDelays: number
    domestic: number
    international: number
    // Texto bajo los internacionales (la demo nombra sus troncales).
    internationalLabel: string
  }
}

// Vuelo que el tripulante ya no hará: su ausencia tiene el reemplazo aprobado (sesión real).
export interface ReleasedFlight {
  // Id de la ausencia del vuelo.
  id: string
  flightNumber: string
  origin: string
  destination: string
  // «Mié 25 Nov, 18:30 UTC».
  departure: string
  status: "pending_ack" | "covered"
}

// Ausencias propias cruzadas con Mis Vuelos.
export interface FlightAbsences {
  // Id del vuelo asignado → estado de su ausencia, p. ej. «En revisión».
  marks: Record<string, string>
  // Próximos vuelos liberados, por salida.
  released: ReleasedFlight[]
}
