import { useId, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { DownloadIcon, SearchIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { cn } from "@/lib/utils"
import AircraftFormDialog, {
  type AircraftFormTarget,
} from "@/modules/aircraft/components/AircraftFormDialog"
import {
  useAircraftApi,
  useMaintenanceLabel,
} from "@/modules/aircraft/hooks/useAircraftApi"
import { useAircraftSearchParams } from "@/modules/aircraft/hooks/useAircraftSearchParams"
import type { AircraftFilter, AircraftStats } from "@/App/types/aircraft.types"
import { FILTER_OPTIONS } from "@/modules/aircraft/utils/aircraftStatus"
import { downloadFile, toManifestCsv } from "@/modules/aircraft/utils/manifest"

// Conteo de cada filtro según los indicadores.
const countFor = (stats: AircraftStats, value?: AircraftFilter) => {
  if (!value) return stats.total
  if (value === "operativa") return stats.operational
  return stats.maintenance
}

// Bloque 3: buscador, filtros por estado, exportar manifiesto y registro de aeronave,
// como la barra de Usuarios. La búsqueda y el filtro se guardan en la URL (?q= y
// ?status=) para enviarlos al backend.
const AircraftToolbar = () => {
  const id = useId()
  const { search, filter, setSearch, setFilter } = useAircraftSearchParams()
  const { getAircraftStats, getFleetManifest } = useAircraftApi()
  const maintenanceLabel = useMaintenanceLabel()
  // Formulario de registro: {} abierto (sin aeronave), null cerrado.
  const [formTarget, setFormTarget] = useState<AircraftFormTarget | null>(null)
  // Conteos de los filtros: misma consulta que los indicadores (AircraftStats).
  const { data: stats } = useQuery({
    queryKey: ["aircraft", "stats"],
    queryFn: getAircraftStats,
  })

  // Exportar: pide toda la flota y la descarga como CSV.
  const exportManifest = useMutation({
    mutationFn: () => getFleetManifest(),
    onSuccess: (fleet) => {
      const today = new Date().toISOString().slice(0, 10)
      downloadFile(
        `manifiesto-flota-${today}.csv`,
        toManifestCsv(fleet, maintenanceLabel),
        "text/csv;charset=utf-8"
      )
      toast.success("Manifiesto exportado", {
        description: `Se descargó el manifiesto con ${fleet.length} aeronaves.`,
      })
    },
    onError: () => {
      toast.error("No se pudo exportar el manifiesto", {
        description: "Intenta de nuevo en unos segundos.",
      })
    },
  })

  return (
    // Celular y tablet: buscador, filtros y botones apilados. Escritorio (lg): en una fila.
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      {/* Buscador. type="search" agrega la «x» para borrar en varios navegadores. */}
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`${id}-search`} className="sr-only">
          Buscar aeronave
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
          placeholder="Buscar por matrícula, modelo o base…"
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
        {FILTER_OPTIONS.map(({ value, label }) => {
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

      {/* Exportar manifiesto y registrar aeronave. */}
      <div className="flex flex-wrap gap-2 lg:shrink-0">
        <Button
          onClick={() => exportManifest.mutate()}
          disabled={exportManifest.isPending}
          className={cn(
            typography.labelLg,
            "min-h-11 shrink-0 gap-2 rounded-md border border-brand-border bg-card px-4 text-brand-primary hover:bg-brand-neutral focus-visible:ring-brand-tertiary lg:min-h-10"
          )}
        >
          <DownloadIcon aria-hidden="true" />
          {exportManifest.isPending ? "Exportando…" : "Exportar Manifiesto"}
        </Button>
        <Button
          onClick={() => setFormTarget({})}
          className={cn(
            typography.labelLg,
            "min-h-11 shrink-0 gap-2 rounded-md bg-brand-secondary px-4 text-white hover:bg-brand-secondary-hover focus-visible:ring-brand-tertiary lg:min-h-10"
          )}
        >
          <span aria-hidden="true" className="text-base leading-none">
            +
          </span>
          Registrar Aeronave
        </Button>
      </div>
      <AircraftFormDialog
        target={formTarget}
        onClose={() => setFormTarget(null)}
      />
    </div>
  )
}

export default AircraftToolbar
