import type { Aircraft, MaintenanceType } from "@/App/types/aircraft.types"
import {
  categoryLabel,
  crewTextOf,
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

// Motivo del mantenimiento (texto del catálogo), o «—» si está operativa.
const maintenanceOf = (
  aircraft: Aircraft,
  maintenanceLabel: (code: MaintenanceType) => string
) =>
  aircraft.maintenanceType ? maintenanceLabel(aircraft.maintenanceType) : "—"

// Manifiesto en CSV (una fila por aeronave). Empieza con BOM para que Excel lea bien
// las tildes.
export const toManifestCsv = (
  fleet: Aircraft[],
  maintenanceLabel: (code: MaintenanceType) => string
) => {
  const rows = fleet.map((aircraft) =>
    [
      aircraft.registration,
      aircraft.modelName,
      aircraft.msn,
      categoryLabel(aircraft.category),
      aircraft.capacity,
      crewTextOf(aircraft.minimumCrew),
      aircraft.baseName,
      statusLabelOf(aircraft),
      maintenanceOf(aircraft, maintenanceLabel),
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
