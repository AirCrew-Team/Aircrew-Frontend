import type {
  Aircraft,
  AircraftCategory,
  AircraftFilter,
  AircraftStatus,
  MinimumCrew,
} from "@/App/types/aircraft.types"

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

// «2 Pilotos + 4 Auxiliares».
export const crewText = ({ pilots, cabin }: MinimumCrew) =>
  `${pilots} ${pilots === 1 ? "Piloto" : "Pilotos"} + ${cabin} ${
    cabin === 1 ? "Auxiliar" : "Auxiliares"
  }`

// Categoría del modelo, o «—» en aeronaves antiguas sin modelo del catálogo.
export const categoryLabel = (category: AircraftCategory | null) =>
  category ? CATEGORY_LABEL[category] : "—"

// Tripulación mínima, o «—» si el backend no la conoce.
export const crewTextOf = (crew: MinimumCrew | null) =>
  crew ? crewText(crew) : "—"
