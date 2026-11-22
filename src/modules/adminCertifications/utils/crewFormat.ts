import type { CrewCertification } from "@/modules/adminCertifications/types/adminCertifications.types"

type Named = Pick<CrewCertification, "firstName" | "lastName">

// Nombre completo: «Diego Salcedo». Sin nombre (admin no respondió): «—».
export const crewName = (crew: Named) =>
  [crew.firstName, crew.lastName].filter(Boolean).join(" ") || "—"

// Iniciales del nombre y del último apellido: «Juan Pablo Navarro» → «JN».
export const crewInitials = (crew: Named) =>
  `${crew.firstName[0] ?? ""}${crew.lastName.split(" ").at(-1)?.[0] ?? ""}`.toUpperCase()

// «Comandante · Base ATL»: cargo y base, la línea bajo el nombre.
export const crewRoleLine = (crew: CrewCertification) =>
  `${crew.roleTitle} · Base ${crew.base ?? "—"}`

// «AC-1108», o «—» si el tripulante no tiene código.
export const crewCode = (crew: CrewCertification) => crew.code ?? "—"

// «2026-08-20» → «20 ago 2026», como en la referencia. Se arma por partes porque el
// formato de es-CO agrega «de» («20 de ago de 2026»). Una fecha sin hora va en UTC para
// no correrse un día por la zona horaria del equipo; una con hora (el historial del
// backend) se muestra en la hora local.
const formatOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
}
const dayFormat = new Intl.DateTimeFormat("es-CO", {
  ...formatOptions,
  timeZone: "UTC",
})
const localFormat = new Intl.DateTimeFormat("es-CO", formatOptions)

export const formatHistoryDate = (isoDate: string) => {
  const format = isoDate.includes("T") ? localFormat : dayFormat
  const parts = format.formatToParts(new Date(isoDate))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""
  return `${part("day")} ${part("month").replace(".", "")} ${part("year")}`
}

// Tamaño de la copia: «245 KB» o «1,2 MB».
export const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`
