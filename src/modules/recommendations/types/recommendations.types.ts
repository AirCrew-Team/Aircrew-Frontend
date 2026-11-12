// Tipos de Recomendaciones de reemplazo del Supervisor
// (spec docs/specs/recomendaciones-supervisor.md).

export interface Airport {
  code: string
  name: string
}

// Solicitud de reemplazo pendiente de aprobación (la cola llega ordenada por urgencia).
export interface ReplacementRequest {
  id: string
  flightNumber: string
  origin: Airport
  destination: Airport
  // Cargo que hay que cubrir (ej. «Copiloto A320»).
  position: string
  // Hora de salida en UTC ("HH:mm").
  departureUtc: string
  // Tiempo que falta para la salida (ej. «1h 45m»).
  timeToDeparture: string
  gate: string
  reason: string
}

// Candidato propuesto por la IA para una solicitud (llegan ordenados por afinidad).
export interface Candidate {
  id: string
  fullName: string
  rank: string
  base: string
  // Afinidad en porcentaje (0-100) y su etiqueta (ej. 98 «Óptimo»).
  affinity: number
  affinityLabel: string
  checks: string[]
  location: string
  minutesToRamp: number
  // Teléfono en formato legible (ej. «+57 310 445 8899»).
  phone: string
  radioChannel: string
}
