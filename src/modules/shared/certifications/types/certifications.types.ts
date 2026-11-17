export type CertificationKind =
  "license" | "medical" | "typeRating" | "language" | "lowVisibility"

export type CertificationStatus =
  "vigente" | "proximo" | "vencido" | "vitalicio"

export interface CertificationAppointment {
  date: string // ISO de solo día
  time: string // "08:30 COT"
  center: string // "CEMAE"
  location: string // "Aeropuerto El Dorado"
}

export interface Certification {
  id: string
  kind: CertificationKind
  name: string
  code: string
  issuer: string
  scope: string
  expiresAt: string | null // ISO de solo día; null = sin vencimiento
  observation: string | null // null cuando hay appointment
  appointment: CertificationAppointment | null
  details: { label: string; value: string }[]
}

export interface RecurrentTraining {
  title: string // "Simulador A320 FFS Nivel D"
  startsOn: string // ISO de solo día
  endsOn: string
  location: string // "Simulador 3 • Instructor Cap. R. Morales"
}
