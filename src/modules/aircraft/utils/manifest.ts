import type { Aircraft } from "@/modules/aircraft/types/aircraft.types"
import {
  CATEGORY_LABEL,
  MAINTENANCE_LABEL,
  crewText,
  statusLabelOf,
} from "@/modules/aircraft/utils/aircraftStatus"

// Columnas del manifiesto de flota.
const COLUMNS = [
  "Matrícula",
  "Modelo",
  "MSN",
  "Categoría",
  "Capacidad",
  "Tripulación mínima",
  "Base",
  "Estado",
  "Mantenimiento",
]

// Valor de una celda CSV: entre comillas, con las comillas internas duplicadas.
const cell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`

// Tipo de mantenimiento, o «—» si está operativa.
const maintenanceOf = (aircraft: Aircraft) =>
  aircraft.maintenanceType ? MAINTENANCE_LABEL[aircraft.maintenanceType] : "—"

// Manifiesto en CSV (una fila por aeronave). Empieza con BOM para que Excel lea bien
// las tildes.
export const toManifestCsv = (fleet: Aircraft[]) => {
  const rows = fleet.map((aircraft) =>
    [
      aircraft.registration,
      aircraft.modelName,
      aircraft.msn,
      CATEGORY_LABEL[aircraft.category],
      aircraft.capacity,
      crewText(aircraft.minimumCrew),
      aircraft.baseName,
      statusLabelOf(aircraft),
      maintenanceOf(aircraft),
    ]
      .map(cell)
      .join(",")
  )
  return `\uFEFF${[COLUMNS.map(cell).join(","), ...rows].join("\r\n")}`
}

// Descarga un texto como archivo desde el navegador.
export const downloadFile = (
  fileName: string,
  content: string,
  type: string
) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
