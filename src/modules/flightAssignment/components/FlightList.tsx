import { ConfirmedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type {
  FlightStatus,
  PlannedFlight,
} from "@/modules/shared/flightAssignment/types/flightAssignment.types"

export type FlightFilter = "todos" | "por_completar" | "confirmados"

const FILTERS: { value: FlightFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "por_completar", label: "Por completar" },
  { value: "confirmados", label: "Confirmados" },
]

// «Por completar» = todo lo que no está confirmado.
export const matchesFilter = (filter: FlightFilter, flight: PlannedFlight) => {
  switch (filter) {
    case "todos":
      return true
    case "por_completar":
      return flight.status !== "confirmada"
    case "confirmados":
      return flight.status === "confirmada"
  }
}

// Vuelos que se ven con el corte cerrado.
export const LIMIT = 5

// Etiqueta de estado: texto y color (nunca solo color).
const STATUS: Record<FlightStatus, { label: string; className: string }> = {
  sin_asignar: {
    label: "Sin asignar",
    className: "bg-error-container text-on-error-container",
  },
  incompleta: {
    label: "Incompleta",
    className: "bg-brand-neutral text-brand-secondary",
  },
  completa: {
    label: "Lista para confirmar",
    className: "bg-brand-neutral text-brand-primary",
  },
  confirmada: {
    label: "Confirmada",
    className: "bg-brand-primary text-white",
  },
}

interface FlightListProps {
  // Todos los vuelos del día (para los contadores de los filtros).
  flights: PlannedFlight[]
  // Los que dejó el filtro elegido.
  listed: PlannedFlight[]
  filter: FlightFilter
  onFilter: (filter: FlightFilter) => void
  expanded: boolean
  onToggleExpanded: () => void
  // id del h2 de la lista (nombre del tablist).
  labelledBy: string
}

// Filtros, pestañas verticales (una por vuelo) y corte de 5 con «Ver {k} más».
// Va dentro de Tabs, como la cola de Recomendaciones.
const FlightList = ({
  flights,
  listed,
  filter,
  onFilter,
  expanded,
  onToggleExpanded,
  labelledBy,
}: FlightListProps) => {
  const shown = expanded ? listed : listed.slice(0, LIMIT)

  return (
    <>
      <div
        role="group"
        aria-label="Estado de los vuelos"
        className="flex flex-wrap gap-1.5"
      >
        {FILTERS.map(({ value, label }) => {
          const count = flights.filter((flight) =>
            matchesFilter(value, flight)
          ).length
          const pressed = value === filter
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onFilter(value)}
              className={cn(
                typography.labelMd,
                "min-h-11 rounded-full px-3 py-1.5 font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden motion-reduce:transition-none lg:min-h-9 forced-colors:aria-pressed:underline forced-colors:aria-pressed:decoration-2 forced-colors:aria-pressed:underline-offset-4",
                pressed
                  ? "bg-brand-primary text-white"
                  : "bg-card text-brand-primary hover:bg-muted active:bg-brand-neutral"
              )}
            >
              {`${label} (${count})`}
            </button>
          )
        })}
      </div>

      {listed.length === 0 ? (
        <p className={cn(typography.bodyMd, "text-muted-foreground")}>
          Ningún vuelo con este estado.
        </p>
      ) : (
        <TabsList
          aria-labelledby={labelledBy}
          className="flex h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0"
        >
          {shown.map((flight) => {
            const status = STATUS[flight.status]
            const covered = flight.slots.filter((slot) => slot.assignee).length
            const total = flight.slots.length
            return (
              <TabsTrigger
                key={flight.id}
                value={flight.id}
                className={cn(
                  typography.bodySm,
                  "h-auto min-h-11 w-full flex-none flex-col items-stretch justify-start gap-1 rounded-xl border-l-4 bg-card p-4 pl-3.5 text-left whitespace-normal text-muted-foreground shadow-sm transition-colors not-data-active:hover:bg-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden motion-reduce:transition-none data-active:border-brand-secondary/50 data-active:border-l-brand-secondary data-active:bg-card data-active:text-foreground forced-colors:data-active:underline forced-colors:data-active:decoration-2 forced-colors:data-active:underline-offset-4"
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      typography.headlineSm,
                      "font-bold text-brand-primary"
                    )}
                  >
                    {flight.flightNumber}
                  </span>{" "}
                  <span
                    className={cn(
                      typography.labelSm,
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 whitespace-nowrap",
                      status.className
                    )}
                  >
                    {flight.status === "confirmada" ? (
                      <ConfirmedIcon aria-hidden="true" className="size-3.5" />
                    ) : null}
                    {status.label}
                  </span>
                </span>{" "}
                <span
                  className={cn(
                    typography.labelLg,
                    "text-foreground tabular-nums"
                  )}
                >
                  {`${flight.origin.code} → ${flight.destination.code} · ${flight.departureUtc} – ${flight.arrivalUtc}${flight.arrivesNextDay ? " (+1)" : ""}`}
                </span>{" "}
                <span>{`${flight.aircraft.model} · ${flight.aircraft.registration}`}</span>
                {flight.status === "confirmada" ? null : (
                  <>
                    {" "}
                    <span className="mt-1 flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border"
                      >
                        <span
                          className="block h-full rounded-full bg-brand-secondary"
                          style={{ width: `${(covered / total) * 100}%` }}
                        />
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {`${covered} de ${total}`}
                      </span>
                    </span>
                  </>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      )}

      {/* Corte: fuera del tablist y sin región viva. El botón no se vuelve a montar al
          pulsarlo, así el foco se queda en él. */}
      {listed.length > LIMIT ? (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            {`Mostrando ${shown.length} de ${listed.length}`}
          </p>
          <button
            type="button"
            onClick={onToggleExpanded}
            className={cn(
              typography.labelMd,
              "min-h-11 rounded-md px-2 font-semibold text-brand-secondary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden active:text-brand-secondary-hover lg:min-h-9"
            )}
          >
            {expanded ? "Mostrar menos" : `Ver ${listed.length - LIMIT} más`}
          </button>
        </div>
      ) : null}
    </>
  )
}

export default FlightList
