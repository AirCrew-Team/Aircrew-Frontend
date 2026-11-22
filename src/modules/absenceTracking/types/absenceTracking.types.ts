export type TrackingStatus =
  "por_aprobar" | "esperando_confirmacion" | "cubierta"

// Solo en «Por aprobar»: si la IA ya propuso, sigue buscando o no encontró a nadie que cumpla las reglas.
export type SuggestionsState = "listas" | "buscando" | "sin_candidatos"

export interface TimelineEvent {
  atUtc: string // "HH:mm"
  text: string // texto ya redactado
  missed?: boolean // true: un candidato dejó vencer su plazo (se marca distinto)
}

interface TrackedAbsenceBase {
  id: string
  flightNumber: string
  origin: string // código IATA, p. ej. "BOG"
  destination: string
  departureUtc: string // "HH:mm"
  timeToDeparture: string // p. ej. "1h 45m"
  position: string // cargo a cubrir, p. ej. "Copiloto A320"
  reason: string // etiqueta del motivo, la misma de Reportar Ausencia
  reportedBy: string
  reportedAtUtc: string
  timeline: TimelineEvent[] // en orden cronológico
}

export interface Replacement {
  fullName: string
  option: number // 1 = primera opción de la IA
}

export interface Approval {
  by: string
  atUtc: string
}

export type TrackedAbsence =
  | (TrackedAbsenceBase & {
      status: "por_aprobar"
      suggestions: SuggestionsState
      candidateCount: number // 0 si suggestions no es "listas"
    })
  | (TrackedAbsenceBase & {
      status: "esperando_confirmacion"
      replacement: Replacement
      approval: Approval
      deadlineUtc: string
    })
  | (TrackedAbsenceBase & {
      status: "cubierta"
      replacement: Replacement
      approval: Approval
      confirmedAtUtc: string
    })
