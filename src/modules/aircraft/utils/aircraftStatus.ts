import type {
  Aircraft,
  AircraftCategory,
  AircraftFilter,
  AircraftStatus,
  MaintenanceType,
  MinimumCrew,
} from "@/modules/aircraft/types/aircraft.types"

// Etiqueta y colores de cada estado, como en la referencia.
export const AIRCRAFT_STATUS: Record<
  AircraftStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  operativa: {
    label: "Operativa",
    badgeClass: "bg-brand-neutral text-brand-secondary",
    dotClass: "bg-brand-secondary",
  },
  mantenimiento: {
    label: "En mantenimiento",
    badgeClass: "bg-error-container text-on-error-container",
    dotClass: "bg-destructive",
  },
}

// Etiqueta del estado.
export const statusLabelOf = (aircraft: Aircraft) =>
  AIRCRAFT_STATUS[aircraft.status].label

// Valores válidos de ?status= y los botones del filtro (sin valor: «Todas»).
export const AIRCRAFT_FILTERS: readonly AircraftFilter[] = [
  "operativa",
  "mantenimiento",
]

export const FILTER_OPTIONS: { value?: AircraftFilter; label: string }[] = [
  { label: "Todas" },
  { value: "operativa", label: "Operativas" },
  { value: "mantenimiento", label: "Mantenimiento" },
]

export const CATEGORY_LABEL: Record<AircraftCategory, string> = {
  narrow_body: "Narrow-body",
  wide_body: "Wide-body",
  regional: "Regional",
}

// Motivo del mantenimiento en palabras claras.
export const MAINTENANCE_LABEL: Record<MaintenanceType, string> = {
  motor: "Problemas con el motor",
  ala: "Daño en el ala",
  tren_aterrizaje: "Falla en el tren de aterrizaje",
  fuselaje: "Daño en el fuselaje",
  electrico: "Falla eléctrica o de instrumentos",
  hidraulico: "Falla en el sistema hidráulico",
  revision_programada: "Revisión general programada",
}

// «2 Pilotos + 4 Auxiliares».
export const crewText = ({ pilots, cabin }: MinimumCrew) =>
  `${pilots} ${pilots === 1 ? "Piloto" : "Pilotos"} + ${cabin} ${
    cabin === 1 ? "Auxiliar" : "Auxiliares"
  }`
