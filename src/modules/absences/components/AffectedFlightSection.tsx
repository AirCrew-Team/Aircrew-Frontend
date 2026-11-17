import { useQuery } from "@tanstack/react-query"

import { ArrowRightIcon, DepartureIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { affectedFlightQuery } from "@/modules/absences/data/affectedFlight.query"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

const pad = (value: number) => String(value).padStart(2, "0")

// «Dom 20 Oct», en UTC.
const formatUtcDate = (date: Date) =>
  `${DAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`

// «07:15 UTC».
const formatUtcTime = (date: Date) =>
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`

// F1: vuelo auto-asignado por el roster, de solo lectura.
const AffectedFlightSection = () => {
  const { data: flight, isPending, isError } = useQuery(affectedFlightQuery)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className={cn(
            typography.labelLg,
            "flex items-center gap-1.5 text-brand-primary"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              typography.labelSm,
              "flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-border text-brand-primary"
            )}
          >
            1
          </span>
          Vuelo o Turno Afectado
        </h2>
        <p
          className={cn(
            typography.labelSm,
            "rounded-sm bg-brand-neutral px-2 py-0.5 font-medium text-brand-secondary"
          )}
        >
          Auto-asignado por Roster
        </p>
      </div>

      {isPending ? (
        <p
          role="status"
          className={cn(
            typography.bodySm,
            "rounded-md bg-muted p-4 text-muted-foreground"
          )}
        >
          Cargando vuelo asignado…
        </p>
      ) : isError ? (
        <p
          role="alert"
          className={cn(
            typography.bodySm,
            "rounded-md bg-muted p-4 text-destructive"
          )}
        >
          No se pudo cargar el vuelo asignado.
        </p>
      ) : (
        <div className="flex flex-col justify-between gap-4 rounded-md bg-muted p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-primary text-brand-border"
            >
              <DepartureIcon className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    typography.headlineSm,
                    "font-bold text-brand-primary"
                  )}
                >
                  {flight.flightNumber}
                </span>
                <span
                  className={cn(
                    typography.labelSm,
                    "rounded-sm bg-brand-neutral px-1.5 py-0.5 text-muted-foreground"
                  )}
                >
                  {flight.aircraft}
                </span>
              </p>
              <p
                className={cn(
                  typography.labelMd,
                  "mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-muted-foreground"
                )}
              >
                <span className="font-semibold text-brand-primary">
                  {flight.origin}
                </span>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                />
                <span className="sr-only">a</span>
                <span className="font-semibold text-brand-primary">
                  {flight.destination}
                </span>
                <span aria-hidden="true">•</span>
                <span>{formatUtcDate(new Date(flight.departureAt))}</span>
                <span aria-hidden="true">•</span>
                <span className="font-mono font-semibold whitespace-nowrap text-brand-secondary">
                  {formatUtcTime(new Date(flight.departureAt))}
                </span>
              </p>
              <p
                className={cn(typography.bodySm, "mt-1 text-muted-foreground")}
              >
                Próximo servicio operacional asignado en tu planilla de vuelo.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end sm:gap-1">
            <p
              className={cn(
                typography.labelSm,
                "rounded-sm bg-brand-neutral px-2 py-1 text-brand-secondary uppercase"
              )}
            >
              Rol: {flight.flightRole}
            </p>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              Gate {flight.gate} • {flight.airport}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AffectedFlightSection
