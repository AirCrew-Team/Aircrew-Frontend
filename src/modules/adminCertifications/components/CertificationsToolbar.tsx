import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { SearchIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { cn } from "@/lib/utils"
import CertificationFormDialog, {
  type CertificationFormTarget,
} from "@/modules/adminCertifications/components/CertificationFormDialog"
import { getCertificationsStats } from "@/modules/adminCertifications/data/adminCertifications.data"
import { useCertificationsSearchParams } from "@/modules/adminCertifications/hooks/useCertificationsSearchParams"
import type { CertificationState } from "@/modules/adminCertifications/types/adminCertifications.types"

// Opciones del filtro por estado; «Todos» quita ?status= de la URL.
const STATUS_FILTERS: { value?: CertificationState; label: string }[] = [
  { label: "Todos" },
  { value: "verificado", label: "Verificados" },
  { value: "por_verificar", label: "Por verificar" },
  { value: "sin_certificado", label: "Sin certificado" },
]

// Bloque 3: buscador, filtros por estado y registro de certificado.
// La búsqueda y el filtro se guardan en la URL (?q= y ?status=) para enviarlos al backend.
const CertificationsToolbar = () => {
  const id = useId()
  // Formulario «Registrar certificado»: {} abre sin tripulante elegido; null, cerrado.
  const [formTarget, setFormTarget] = useState<CertificationFormTarget | null>(
    null
  )
  const { search, filter, setSearch, setFilter } =
    useCertificationsSearchParams()
  // Conteos de los filtros: misma consulta que los indicadores (CertificationsStats).
  const { data: stats } = useQuery({
    queryKey: ["certifications", "adminStats"],
    queryFn: getCertificationsStats,
  })

  // Conteo de cada filtro; sin datos todavía, el botón se muestra sin número.
  const countFor = (value?: CertificationState) => {
    if (!stats) return null
    return value ? stats.byStatus[value] : stats.total
  }

  return (
    // Celular y tablet: buscador, filtros y botón apilados. Escritorio (lg): en una fila.
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      {/* Buscador. type="search" agrega la «x» para borrar en varios navegadores. */}
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`${id}-search`} className="sr-only">
          Buscar certificación
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
          placeholder="Buscar por nombre, ID o número de licencia…"
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
          const count = countFor(value)
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
              {count === null ? null : ` (${count})`}
            </button>
          )
        })}
      </div>

      {/* Registro de certificado: abre el formulario para elegir al tripulante. */}
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
        Registrar certificado
      </Button>
      <CertificationFormDialog
        target={formTarget}
        onClose={() => setFormTarget(null)}
      />
    </div>
  )
}

export default CertificationsToolbar
