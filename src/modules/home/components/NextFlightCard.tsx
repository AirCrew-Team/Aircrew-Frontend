import { useQuery } from "@tanstack/react-query"

import { ArrowRightIcon, DepartureIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getNextFlight } from "@/modules/home/data/home.data"

// Tarjeta 1: próximo vuelo. El briefing aún no existe: botón aria-disabled, enfocable y sin acción.
const NextFlightCard = () => {
  const {
    data: flight,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["flights", "next"],
    queryFn: getNextFlight,
  })

  return (
    <article className="flex flex-col justify-between gap-6 rounded-xl bg-card p-6 shadow-sm">
      <div className="flex flex-1 flex-col gap-2">
        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "pt-2 text-muted-foreground")}
          >
            Cargando próximo vuelo…
          </p>
        ) : isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "pt-2 text-destructive")}
          >
            No se pudo cargar el próximo vuelo.
          </p>
        ) : (
          <>
            <div className="flex flex-col pt-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <h2
                  className={cn(
                    typography.headlineMd,
                    "font-bold text-brand-primary"
                  )}
                >
                  {flight.flightNumber}
                </h2>
                <p
                  className={cn(
                    typography.labelMd,
                    "font-semibold text-brand-secondary"
                  )}
                >
                  {flight.origin.code} → {flight.destination.code}
                </p>
              </div>
              <p className={cn(typography.bodySm, "text-muted-foreground")}>
                {flight.origin.name} a {flight.destination.name}
              </p>
            </div>
            <dl
              className={cn(
                typography.bodySm,
                "grid grid-cols-2 gap-2 rounded-md bg-muted p-2.5 text-foreground"
              )}
            >
              <div>
                <dt className={cn(typography.labelSm, "text-muted-foreground")}>
                  Salida STD
                </dt>
                <dd className="font-semibold text-brand-primary">
                  {flight.departureUtc} UTC
                </dd>
              </div>
              <div>
                <dt className={cn(typography.labelSm, "text-muted-foreground")}>
                  Puerta Asignada
                </dt>
                <dd className="font-semibold text-brand-primary">
                  Puerta {flight.gate}
                </dd>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 pt-1">
                <dt className={cn(typography.labelSm, "text-muted-foreground")}>
                  Rol de Vuelo:
                </dt>
                <dd
                  className={cn(
                    typography.labelSm,
                    "rounded-sm bg-brand-neutral px-2 py-0.5 text-brand-primary"
                  )}
                >
                  {flight.flightRole}
                </dd>
              </div>
            </dl>
            <div className="mt-auto pt-4">
              <button
                type="button"
                aria-disabled="true"
                aria-label="Ver Briefing Operacional, próximamente"
                className={cn(
                  typography.labelMd,
                  "inline-flex min-h-11 w-full cursor-not-allowed items-center justify-between gap-2 rounded-md bg-muted px-4 py-2.5 font-semibold text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden lg:min-h-9"
                )}
              >
                <span>Ver Briefing Operacional</span>
                <span className="flex items-center gap-1 font-medium">
                  Próximamente
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-4.5 shrink-0 opacity-50"
                  />
                </span>
              </button>
            </div>
          </>
        )}

        {/* Después del h2 en el DOM (orden de lectura); order-first lo muestra arriba. */}
        <div className="order-first flex items-center justify-between gap-2">
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-2 tracking-wider text-muted-foreground uppercase"
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-neutral text-brand-secondary"
            >
              <DepartureIcon aria-hidden="true" className="size-5" />
            </span>
            Itinerario Confirmado
          </p>
          {flight ? (
            <p
              className={cn(
                typography.labelSm,
                "shrink-0 rounded-sm bg-brand-neutral px-2 py-0.5 text-foreground"
              )}
            >
              {flight.dayLabel}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default NextFlightCard
