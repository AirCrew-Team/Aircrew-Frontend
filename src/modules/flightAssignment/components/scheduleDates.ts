// Fechas de Programación con tablas propias (sin Intl ni punto): «dom», «domingo», «nov».
// Las usan el selector de día, el h2 de la lista y el antetítulo de la ficha.

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const LONG_WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
]
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

// ISO de solo día de «hoy + N» en fecha local (nunca toISOString, que es UTC).
export const dayFromToday = (days: number) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

// «2026-11-22» → { weekday: "dom", longWeekday: "domingo", day: 22, month: "nov" }.
export const dayParts = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return {
    weekday: WEEKDAYS[date.getDay()],
    longWeekday: LONG_WEEKDAYS[date.getDay()],
    day,
    month: MONTHS[month - 1],
  }
}
