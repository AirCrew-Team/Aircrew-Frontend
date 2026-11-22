import { useId } from "react"

import { ConfirmedIcon, DurationIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { ReleasedFlight } from "@/modules/flights/types/flights.types"

// Texto e ícono de cada estado, en el tono neutro de los estados de ausencia (no es un
// error: el vuelo ya tiene quien lo cubra o está por confirmarlo).
const STATUS: Record<
  ReleasedFlight["status"],
  { label: string; Icon: typeof ConfirmedIcon; className: string }
> = {
  pending_ack: {
    label: "Esperando confirmación del reemplazo",
    Icon: DurationIcon,
    className: "text-brand-secondary",
  },
  covered: {
    label: "Cubierto por otro tripulante",
    Icon: ConfirmedIcon,
    className: "text-brand-primary",
  },
}

interface ReleasedFlightsProps {
  flights: ReleasedFlight[]
}

// Próximos vuelos que el tripulante ya no hará: su ausencia tiene el reemplazo aprobado,
// así que el backend ya no los lista entre sus asignaciones (sesión real).
const ReleasedFlights = ({ flights }: ReleasedFlightsProps) => {
  const titleId = useId()
  if (flights.length === 0) return null

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={titleId}
          className={cn(typography.headlineSm, "font-bold text-brand-primary")}
        >
          Vuelos liberados por tus ausencias
        </h2>
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          Ya no están en tu roster: el supervisor aprobó un reemplazo.
        </p>
      </div>
      <ul role="list" className="flex flex-col divide-y divide-brand-border/70">
        {flights.map((flight) => {
          const { label, Icon, className } = STATUS[flight.status]
          return (
            <li
              key={flight.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
            >
              <p
                className={cn(
                  typography.bodySm,
                  "flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground"
                )}
              >
                <span
                  className={cn(
                    typography.labelLg,
                    "font-bold text-brand-primary"
                  )}
                >
                  {flight.flightNumber}
                </span>{" "}
                <span>
                  {`${flight.origin} `}
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">a</span>
                  {` ${flight.destination}`}
                </span>{" "}
                <span className="text-muted-foreground">
                  {flight.departure}
                </span>
              </p>{" "}
              <p
                className={cn(
                  typography.labelSm,
                  "inline-flex items-center gap-1 rounded-full bg-brand-neutral px-2.5 py-1",
                  className
                )}
              >
                <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                {label}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default ReleasedFlights
