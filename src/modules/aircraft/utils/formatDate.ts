// «2026-11-02» → «2 nov 2026» (sin «de» ni punto, como en Certificaciones).
export const formatDate = (isoDate: string) => {
  const parts = new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(`${isoDate}T00:00:00Z`))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value.replace(".", "") ?? ""
  return `${part("day")} ${part("month")} ${part("year")}`
}

// «14820» → «14,820»: separador de miles.
export const formatNumber = (value: number) => value.toLocaleString("en-US")
