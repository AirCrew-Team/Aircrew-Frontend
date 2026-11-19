// Programación de tripulaciones (spec docs/specs/programacion-supervisor.md).
// Los usan la pantalla Programación y la tarjeta del Inicio del supervisor.

// Resumen de un día de los próximos 7: vuelos que salen de la base y cuántos faltan por confirmar.
export interface ScheduleDay {
  // ISO de solo día (fecha local).
  date: string
  flightCount: number
  pendingCount: number
}

export interface Airport {
  code: string
  city: string
}

// «Por completar» = todo lo que no está confirmado.
export type FlightStatus =
  "sin_asignar" | "incompleta" | "completa" | "confirmada"

export type SlotRole =
  "capitan" | "primer_oficial" | "piloto_relevo" | "jefe_cabina" | "tcp"

export interface Assignee {
  crewId: string
  fullName: string
  // «Habilitado en {familia} · {h} h de 90 este mes · descanso cumplido».
  summary: string
  // regla: la asignó el puntaje de las reglas, sin explicación de la IA.
  source: "manual" | "ia" | "regla"
  // Explicación de la IA cuando ella lo sugirió.
  rationale: string | null
}

export interface CrewSlot {
  id: string
  role: SlotRole
  // «Capitán», «Primer Oficial», «Piloto de relevo», «Jefe de Cabina», «TCP 1»…
  label: string
  assignee: Assignee | null
}

export interface PlannedFlight {
  id: string
  flightNumber: string
  // ISO de solo día de la salida.
  date: string
  origin: Airport
  destination: Airport
  // «HH:MM» en UTC.
  departureUtc: string
  arrivalUtc: string
  arrivesNextDay: boolean
  durationMinutes: number
  scope: "nacional" | "internacional"
  aircraft: {
    model: string
    // «A320» para A320 y A320neo; «787» para el 787-8.
    family: string
    registration: string
    seats: number
  }
  minimumCrew: { pilots: number; cabin: number }
  slots: CrewSlot[]
  status: FlightStatus
}

export interface EligibleCandidate {
  crewId: string
  fullName: string
  summary: string
}

export interface IneligibleCandidate {
  crewId: string
  fullName: string
  // El primer motivo que falla, en el orden de las reglas.
  reason: string
}

export interface SlotCandidates {
  // De más a menos margen de horas.
  eligible: EligibleCandidate[]
  ineligible: IneligibleCandidate[]
}
