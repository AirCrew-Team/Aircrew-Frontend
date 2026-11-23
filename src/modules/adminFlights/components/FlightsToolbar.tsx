import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { SearchIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { cn } from "@/lib/utils"
import FlightFormDialog from "@/modules/adminFlights/components/FlightFormDialog"
import { useFlightsAdminApi } from "@/modules/adminFlights/hooks/useFlightsAdminApi"
import { useFlightsSearchParams } from "@/modules/adminFlights/hooks/useFlightsSearchParams"
import type {
  FlightsStats,
  FlightStatus,
} from "@/modules/adminFlights/types/adminFlights.types"
import { STATUS_FILTERS } from "@/modules/adminFlights/utils/flightStatus"

const countFor = (stats: FlightsStats, value?: FlightStatus) =>
  value ? stats.byStatus[value] : stats.total

// Bloque 3: buscador, filtros por estado y «Crear vuelo», como la barra de Aeronaves.
// La búsqueda y el filtro se guardan en la URL (?q= y ?status=) para enviarlos al backend.
const FlightsToolbar = () => {
  const id = useId()
  const { search, filter, setSearch, setFilter } = useFlightsSearchParams()
  const { getFlightsStats } = useFlightsAdminApi()
  const [formOpen, setFormOpen] = useState(false)
  // Conteos de los filtros: misma consulta que los indicadores (FlightsStats).
  const { data: stats } = useQuery({
    queryKey: ["adminFlights", "stats"],
    queryFn: getFlightsStats,
  })

  return (
    // Celular y tablet: apilados. Escritorio grande (xl): en una fila.
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`${id}-search`} className="sr-only">
          Buscar vuelo
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={`${id}-search`}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por número, ciudad o matrícula…"
          className={cn(
            typography.bodySm,
            // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
            "min-h-11 w-full rounded-md border border-brand-border bg-muted py-2 pr-3 pl-9 text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden max-lg:text-base max-lg:leading-6 lg:min-h-10"
          )}
        />
      </div>

      {/* Filtros por estado: botones de alternancia (aria-pressed) dentro de un grupo nombrado. */}
      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex flex-wrap gap-2"
      >
        {STATUS_FILTERS.map(({ value, label }) => {
          const active = filter === value
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(value)}
              className={cn(
                typography.labelMd,
                "min-h-11 rounded-full px-3.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden lg:min-h-8",
                active
                  ? "bg-brand-primary text-white"
                  : "bg-brand-neutral text-brand-primary hover:bg-brand-border"
              )}
            >
              {label}
              {stats ? ` (${countFor(stats, value)})` : null}
            </button>
          )
        })}
      </div>

      <Button
        onClick={() => setFormOpen(true)}
        className={cn(
          typography.labelLg,
          "min-h-11 shrink-0 gap-2 rounded-md bg-brand-secondary px-4 text-white hover:bg-brand-secondary-hover focus-visible:ring-brand-tertiary lg:min-h-10"
        )}
      >
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
        Crear vuelo
      </Button>
      <FlightFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

export default FlightsToolbar
