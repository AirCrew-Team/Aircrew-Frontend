// course: habilitaciones y cursos del expediente real que no son licencias (IR, ME, CDP…).
export type CertificationKind =
  "license" | "medical" | "typeRating" | "language" | "lowVisibility" | "course"

// Sin fecha, la sesión real usa el estado del expediente: verificado o por_verificar
// (certificados que coteja el super_admin) y registrado (datos del perfil del tripulante).
export type UndatedStatus = "verificado" | "por_verificar" | "registrado"

export type CertificationStatus =
  "vigente" | "proximo" | "vencido" | "vitalicio" | UndatedStatus

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
  // null con la sesión real: el backend no tiene emisor ni alcance (ni código, salvo el
  // número de la licencia).
  code: string | null
  issuer: string | null
  scope: string | null
  expiresAt: string | null // ISO de solo día; null = sin vencimiento
  // Estado sin fecha de la sesión real. Sin él, null en expiresAt es «vitalicio» (demo).
  undatedStatus?: UndatedStatus
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
