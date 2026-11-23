// Horas de los vuelos: se piden y se muestran en la hora local de cada aeropuerto y
// viajan al backend en UTC. Solo con Intl (sin librerías): la zona sale del catálogo.

const partsFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

// Diferencia (ms) entre la hora local de `timeZone` y UTC en ese instante.
const offsetAt = (instant: number, timeZone: string) => {
  const parts = Object.fromEntries(
    partsFormat(timeZone)
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value])
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )
  return asUtc - Math.floor(instant / 1000) * 1000
}

// «2026-11-24» + «08:00» en America/Bogota → el instante UTC (13:00Z). Se corrige dos
// veces por si la fecha cae en un cambio de horario. null si la fecha u hora no sirven.
export const zonedToUtc = (
  date: string,
  time: string,
  timeZone: string
): Date | null => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null
  const wallClock = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  )
  if (Number.isNaN(wallClock)) return null
  let instant = wallClock - offsetAt(wallClock, timeZone)
  instant = wallClock - offsetAt(instant, timeZone)
  return new Date(instant)
}

// Fecha (AAAA-MM-DD) y hora (HH:mm) de un instante en una zona: lo que se escribe en los
// campos de fecha y hora. Es lo inverso de zonedToUtc.
export const utcToZoned = (instant: Date, timeZone: string) => {
  const parts = Object.fromEntries(
    partsFormat(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, part.value])
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

// Día de hoy (AAAA-MM-DD) en una zona: valor inicial de las fechas del formulario.
export const todayIn = (timeZone: string, now = new Date()) => {
  const parts = Object.fromEntries(
    partsFormat(timeZone)
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

// «24 nov» y «08:00» de un instante, en la zona del aeropuerto. Sin zona (aeropuerto
// fuera del catálogo) se muestra en UTC, y lo dice.
export const formatInZone = (iso: string, timeZone: string | null) => {
  const date = new Date(iso)
  const zone = timeZone ?? "UTC"
  // Por partes: el formato de es-CO agrega «de» («10 de mar»).
  const parts = new Intl.DateTimeFormat("es-CO", {
    timeZone: zone,
    day: "numeric",
    month: "short",
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""
  const day = `${part("day")} ${part("month").replace(".", "")}`
  const time = new Intl.DateTimeFormat("es-CO", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
  return { day, time: timeZone ? time : `${time} UTC` }
}

// Minutos entre salida y llegada.
export const durationMinutes = (departureAt: string, arrivalAt: string) =>
  Math.round((Date.parse(arrivalAt) - Date.parse(departureAt)) / 60_000)

// 65 → «1 h 5 min»; 120 → «2 h»; 45 → «45 min».
export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
