import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import { ClockIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewStatus } from "@/modules/home/data/home.data"
import UtcClock from "@/modules/home/components/UtcClock"
import { useAuthStore } from "@/stores/auth.store"

// Bloque 1: bienvenida (h1 con el nombre de la sesión) y la tarjeta del reloj maestro.
const WelcomeHeader = () => {
  const fullName = useAuthStore((state) => state.user?.fullName)
  const titleId = useId()
  const { data, isPending, isError } = useQuery({
    queryKey: ["crew", "status"],
    queryFn: getCrewStatus,
  })

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-6 rounded-xl bg-muted p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex max-w-2xl min-w-0 flex-col gap-1">
        <p
          className={cn(
            typography.labelSm,
            "flex w-fit items-center gap-1.5 rounded-sm bg-brand-border px-2.5 py-1 text-brand-primary uppercase"
          )}
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-brand-secondary"
          />
          Tripulación activa{data ? ` • Base ${data.base}` : null}
        </p>
        <h1
          id={titleId}
          className={cn(
            typography.headlineLg,
            "font-bold tracking-tight text-brand-primary"
          )}
        >
          {fullName}, Bienvenido a AirCrew
        </h1>
        <p className={cn(typography.bodyLg, "text-muted-foreground")}>
          Portal Operacional de Vuelo • Turno Activo
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-card p-4 shadow-sm lg:min-w-70 lg:shrink-0">
        <div className="flex items-center justify-between gap-2 border-b border-brand-border pb-1">
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-1.5 text-muted-foreground uppercase"
            )}
          >
            <ClockIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            Reloj maestro
          </p>
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-1.5 rounded-sm bg-brand-neutral px-2 py-0.5 text-brand-secondary"
            )}
          >
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-brand-secondary"
            />
            Sincronizado
          </p>
        </div>
        <UtcClock />
        <div
          aria-hidden="true"
          className="mt-0.5 h-1 w-full rounded-full bg-brand-secondary"
        />
        {isPending ? (
          <p
            role="status"
            className={cn(typography.labelSm, "pt-1 text-muted-foreground")}
          >
            Cargando condición operacional…
          </p>
        ) : isError ? (
          <p
            role="alert"
            className={cn(typography.labelSm, "pt-1 text-destructive")}
          >
            No se pudo cargar la condición operacional.
          </p>
        ) : (
          <p
            className={cn(
              typography.labelSm,
              "flex items-center justify-between gap-2 pt-1 text-muted-foreground"
            )}
          >
            Condición operacional:
            <span className="inline-flex items-center gap-1 text-brand-secondary">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-brand-secondary"
              />
              {data.operationalCondition}
            </span>
          </p>
        )}
      </div>
    </section>
  )
}

export default WelcomeHeader
