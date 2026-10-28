import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { AvailabilityIcon, InfoIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewStatus } from "@/modules/home/data/home.data"
import type { Availability } from "@/modules/home/types/home.types"

const OPTIONS: { value: Availability; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "incapacitado", label: "Incapacitado" },
]

// Bloque 2: radios nativos (clic y flechas sin código propio). Cambiar la opción es solo visual.
const AvailabilitySelector = () => {
  const titleId = useId()
  const radioName = useId()
  // null mientras el tripulante no elija: se muestra la disponibilidad que viene de los datos.
  const [selected, setSelected] = useState<Availability | null>(null)
  const { data, isPending, isError } = useQuery({
    queryKey: ["crew", "status"],
    queryFn: getCrewStatus,
  })
  const current = selected ?? data?.availability

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p
          className={cn(
            typography.labelLg,
            "flex items-center gap-2 text-foreground"
          )}
        >
          <AvailabilityIcon
            aria-hidden="true"
            className="size-5 shrink-0 text-brand-secondary"
          />
          <span id={titleId}>Estado de asignación</span>
        </p>
        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "text-muted-foreground")}
          >
            Cargando estado de asignación…
          </p>
        ) : isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            No se pudo cargar el estado de asignación.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-labelledby={titleId}
            className="flex flex-wrap gap-1 rounded-md bg-brand-neutral p-1 sm:w-fit"
          >
            {OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  typography.labelMd,
                  "group flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:bg-background hover:text-foreground has-checked:bg-brand-secondary has-checked:text-white has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-brand-neutral has-focus-visible:outline-hidden sm:flex-none lg:min-h-7"
                )}
              >
                <input
                  type="radio"
                  name={radioName}
                  value={option.value}
                  checked={current === option.value}
                  onChange={() => setSelected(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-brand-border-strong group-has-checked:bg-white forced-colors:border forced-colors:group-has-checked:border-4"
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <p
        className={cn(
          typography.bodySm,
          "flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-muted-foreground"
        )}
      >
        <InfoIcon
          aria-hidden="true"
          className="size-4.5 shrink-0 text-brand-secondary"
        />
        Tu estado determina asignaciones y relevos de contingencia en tiempo
        real con OCC Despacho.
      </p>
    </section>
  )
}

export default AvailabilitySelector
