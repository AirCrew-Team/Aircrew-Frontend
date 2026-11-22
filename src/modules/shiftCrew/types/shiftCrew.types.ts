// Tripulación del turno del Supervisor (spec docs/specs/tripulacion-supervisor.md).

export type CrewStatus =
  "guardia" | "en_vuelo" | "programado" | "descanso" | "ausente"

export interface FlightRef {
  flightNumber: string // «AV-4021»
  origin: string // «BOG»
  destination: string // «MAD»
}

interface CrewMemberBase {
  id: string
  fullName: string
  position: string // «Comandante», «Primer Oficial», «Jefe de Cabina», «Tripulante de Cabina»
  phone: string
  radioChannel: string
  expiringCertification: { name: string; daysLeft: number } | null
}

export type CrewMember =
  | (CrewMemberBase & {
      status: "guardia"
      location: string
      // null: el backend no tiene el dato.
      minutesToRamp: number | null
      guardUntilUtc: string
      // null = disponible para reemplazos; si no, el motivo de regla.
      replacementBlocker: string | null
    })
  | (CrewMemberBase & {
      status: "en_vuelo"
      flight: FlightRef
      arrivalUtc: string
    })
  | (CrewMemberBase & {
      status: "programado"
      flight: FlightRef
      reportUtc: string
    })
  | (CrewMemberBase & { status: "descanso"; restUntilUtc: string })
  // flight null: la ausencia no está ligada a un vuelo (p. ej. incapacidad sin vuelo asignado).
  | (CrewMemberBase & {
      status: "ausente"
      flight: FlightRef | null
      reason: string
    })

export interface ShiftCrew {
  base: { code: string; name: string } // { code: "BOG", name: "Base Eldorado" }
  members: CrewMember[]
}
