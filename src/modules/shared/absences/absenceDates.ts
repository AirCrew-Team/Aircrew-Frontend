// Fechas de las ausencias. Las del backend son «YYYY-MM-DD» sin hora: se leen por partes,
// nunca con new Date("YYYY-MM-DD"), que las toma en UTC y en Bogotá corre el día.

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

const DAY_MS = 24 * 60 * 60 * 1000

const partsOf = (date: string) => date.split("-").map(Number)

const pad = (value: number) => String(value).padStart(2, "0")

// «2026-11-20» → «20 nov».
export const formatDay = (date: string) => {
  const [, month, day] = partsOf(date)
  return `${day} ${MONTHS[month - 1]}`
}

// Días de diferencia entre dos fechas: «2026-11-20» y «2026-11-22» → 2.
export const daysBetween = (start: string, end: string) => {
  const [startYear, startMonth, startDay] = partsOf(start)
  const [endYear, endMonth, endDay] = partsOf(end)
  return Math.round(
    (Date.UTC(endYear, endMonth - 1, endDay) -
      Date.UTC(startYear, startMonth - 1, startDay)) /
      DAY_MS
  )
}

// Días de ausencia, contando los dos extremos: «3 días» o «1 día».
export const absenceDaysLabel = (start: string, end: string) => {
  const days = daysBetween(start, end) + 1
  return `${days} ${days === 1 ? "día" : "días"}`
}

// Ausencia sin fechas (filas antiguas por vuelo): «Vuelo AV-9001» o, sin vuelo, «Sin fechas».
export const noDatesLabel = (flightNumber: string | null) =>
  flightNumber ? `Vuelo ${flightNumber}` : "Sin fechas"

// Instante ISO 8601 → «19 nov, 14:30 UTC» (la pantalla del supervisor trabaja en UTC).
export const formatUtcDateTime = (iso: string) => {
  const date = new Date(iso)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}
