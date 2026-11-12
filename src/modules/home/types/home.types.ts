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

export interface ReplacementAssignmentDetail {
  label: string
  value: string
  note: string
}

// Asignación de reemplazo aprobada por el Supervisor: el tripulante solo la marca como «Enterado».
export interface ReplacementAssignment {
  flightNumber: string
  // Día relativo, ej. "Hoy" o "Mañana".
  dayLabel: string
  origin: Airport
  destination: Airport
  // Horas "HH:MM".
  departureUtc: string
  departureLocal: string
  aircraft: string
  position: string
  estimatedDuration: string
  reason: string
  approvedBy: string
  compliance: string
  details: ReplacementAssignmentDetail[]
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
