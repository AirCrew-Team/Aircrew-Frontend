// Tipos de los datos de la pantalla de Inicio del tripulante.

export type Availability = "disponible" | "vacaciones" | "incapacitado"

export interface CrewStatus {
  // Base y aeropuerto, ej. "BOG / SKBO".
  base: string
  operationalCondition: string
  availability: Availability
}

export interface Airport {
  code: string
  name: string
}

export interface ReplacementRequestDetail {
  label: string
  value: string
  note: string
}

export interface ReplacementRequest {
  flightNumber: string
  // Plazo fijo mientras no exista la cuenta regresiva, ej. "T-11:42".
  timeRemaining: string
  origin: Airport
  destination: Airport
  // Horas "HH:MM".
  departureUtc: string
  departureLocal: string
  aircraft: string
  position: string
  estimatedDuration: string
  reason: string
  requestedBy: string
  compliance: string
  details: ReplacementRequestDetail[]
}

export interface NextFlight {
  flightNumber: string
  // Día relativo, ej. "Mañana".
  dayLabel: string
  origin: Airport
  destination: Airport
  departureUtc: string
  gate: string
  flightRole: string
}

export interface CertificationsSummary {
  status: string
  validCount: number
  nextExpiry: { name: string; inDays: number }
  psychophysicalDeadline: string
}
