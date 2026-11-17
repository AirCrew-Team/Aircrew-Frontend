import type { CertificationStatus } from "@/modules/shared/certifications/types/certifications.types"

const DAY_MS = 86_400_000
const WARNING_DAYS = 60

// Sin Intl: según la versión de ICU daría «nov.» con punto.
const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

// «2026-11-28» a medianoche local. `new Date("2026-11-28")` sería UTC: el día anterior en Bogotá.
const parseIsoDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export const getExpiryInfo = (
  expiresAt: string | null,
  today: Date
): { status: CertificationStatus; days: number | null } => {
  if (expiresAt === null) return { status: "vitalicio", days: null }
  const midnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  // Math.round: un cambio de horario deja la diferencia a una hora de un día entero.
  const days = Math.round(
    (parseIsoDate(expiresAt).getTime() - midnight.getTime()) / DAY_MS
  )
  const status =
    days < 0 ? "vencido" : days < WARNING_DAYS ? "proximo" : "vigente"
  return { status, days }
}

export const formatShortDate = (isoDate: string) => {
  const date = parseIsoDate(isoDate)
  const day = String(date.getDate()).padStart(2, "0")
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
