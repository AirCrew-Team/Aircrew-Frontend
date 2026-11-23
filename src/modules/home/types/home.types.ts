// Tipos de los datos de la pantalla de Inicio del tripulante.

export type Availability = "disponible" | "vacaciones" | "incapacitado"

export interface CrewStatus {
  // Base y aeropuerto, ej. "BOG / SKBO". null si el tripulante real no tiene base.
  base: string | null
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
  // "" si no hay nota.
  note: string
}

// Asignación de reemplazo aprobada por el Supervisor: el tripulante solo la marca como «Enterado».
export interface ReplacementAssignment {
  // Id de la asignación (POST …/:id/acknowledge); en la demo, el número de vuelo.
  id: string
  flightNumber: string
  // Día relativo, ej. "Hoy" o "Mañana".
  dayLabel: string
  origin: Airport
  destination: Airport
  // Horas "HH:MM".
  departureUtc: string
  // null si el backend no trae la zona horaria del origen.
  departureLocal: string | null
  aircraft: string
  position: string
  estimatedDuration: string
  // "" (y approvedBy null) si el backend no los trae.
  reason: string
  approvedBy: string | null
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
  // null mientras no tenga puerta.
  gate: string | null
  flightRole: string
}
