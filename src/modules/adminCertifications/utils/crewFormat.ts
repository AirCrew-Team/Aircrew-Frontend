import type { CrewCertification } from "@/modules/adminCertifications/types/adminCertifications.types"

// Nombre completo: «Diego Salcedo».
export const crewName = (crew: CrewCertification) =>
  `${crew.firstName} ${crew.lastName}`

// Iniciales del nombre y del último apellido: «Juan Pablo Navarro» → «JN».
export const crewInitials = (crew: CrewCertification) =>
  `${crew.firstName[0]}${crew.lastName.split(" ").at(-1)?.[0] ?? ""}`.toUpperCase()

// «Comandante · Base ATL»: cargo y base, la línea bajo el nombre.
export const crewRoleLine = (crew: CrewCertification) =>
  `${crew.roleTitle} · Base ${crew.base}`

// «2026-08-20» → «20 ago 2026», como en la referencia. Se arma por partes porque el
// formato de es-CO agrega «de» («20 de ago de 2026»). timeZone UTC: la fecha ISO es
// solo el día y no debe correrse un día por la zona horaria del equipo.
const dateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
export const formatHistoryDate = (isoDate: string) => {
  const parts = dateFormat.formatToParts(new Date(isoDate))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""
  return `${part("day")} ${part("month").replace(".", "")} ${part("year")}`
}
