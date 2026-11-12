import { useId, useState } from "react"

import {
  ClockIcon,
  ConfirmedIcon,
  FlightIcon,
  ViewIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SpokenText from "@/modules/flights/components/SpokenText"
import type {
  CrewFlight,
  FlightAirport,
  FlightFact,
  FlightStatus,
} from "@/modules/flights/types/flights.types"

const STATUS_LABEL: Record<FlightStatus, string> = {
  reemplazo: "Reemplazo Asignado",
  programado: "Programado Roster",
  completado: "Completado",
}

// Reemplazo en secondary-fixed (azul), programado en surface-container y completado apagado.
const STATUS_CLASS: Record<FlightStatus, string> = {
  reemplazo: "bg-brand-border font-bold text-brand-primary",
  programado: "bg-brand-neutral text-muted-foreground",
  completado: "bg-muted text-muted-foreground",
}

// Punto separador entre datos de la barra inferior desde sm (en móvil las líneas se parten).
const separatorClass =
  "sm:inline-flex sm:items-center sm:gap-4 sm:before:size-1 sm:before:shrink-0 sm:before:rounded-full sm:before:bg-muted-foreground/70"

// El reloj marca lo programado; el check, lo autorizado o ya volado.
const DISPATCH_ICON: Record<FlightStatus, typeof ClockIcon> = {
  reemplazo: ConfirmedIcon,
  programado: ClockIcon,
  completado: ConfirmedIcon,
}

interface FlightCardProps {
  flight: CrewFlight
}

const Airport = ({
  airport,
  end,
}: {
  airport: FlightAirport
  end?: boolean
}) => (
  <p className={cn("flex flex-col", end && "text-right")}>
    <span className="sr-only">{end ? "Destino: " : "Origen: "}</span>
    <span
      className={cn(
        typography.headlineMd,
        "font-bold tracking-tight text-foreground"
      )}
    >
      {airport.code}
    </span>{" "}
    <span className={cn(typography.labelSm, "text-muted-foreground")}>
      {airport.city}, {airport.icao}
    </span>
  </p>
)

const Fact = ({
  fact,
  highlight,
}: {
  fact: FlightFact
  highlight?: boolean
}) => (
  <div className="flex min-w-0 flex-col">
    <dt className={cn(typography.labelSm, "text-muted-foreground uppercase")}>
      {fact.label}
    </dt>
    <dd
      className={cn(
        typography.labelLg,
        highlight ? "font-bold text-brand-secondary" : "text-foreground"
      )}
    >
      <SpokenText text={fact.value} />
    </dd>
    <dd className={cn(typography.bodySm, "text-muted-foreground")}>
      <SpokenText text={fact.note} />
    </dd>
  </div>
)

// F: tarjeta de un vuelo. «Ver más detalle» despliega sus details debajo de la barra inferior.
const FlightCard = ({ flight }: FlightCardProps) => {
  const detailId = useId()
  const [open, setOpen] = useState(false)
  const isReplacement = flight.status === "reemplazo"
  const StatusIcon = DISPATCH_ICON[flight.status]

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-brand-border/70 bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6 xl:flex-row xl:items-center">
          <div className="flex shrink-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={cn(
                  typography.headlineSm,
                  "font-bold text-foreground"
                )}
              >
                {flight.flightNumber}
              </h2>
              {/* Después del h2 en el DOM (orden de lectura); order-first lo muestra antes. */}
              <p
                className={cn(
                  typography.labelSm,
                  "order-first rounded-full border border-transparent px-2.5 py-0.5 tracking-wider uppercase",
                  STATUS_CLASS[flight.status]
                )}
              >
                {STATUS_LABEL[flight.status]}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <Airport airport={flight.origin} />
              <p className="flex flex-1 flex-col items-center px-2 sm:flex-none">
                <span
                  className={cn(
                    typography.labelSm,
                    isReplacement
                      ? "text-brand-secondary"
                      : "text-muted-foreground"
                  )}
                >
                  <SpokenText text={flight.duration} />
                </span>{" "}
                <span
                  aria-hidden="true"
                  className="flex w-full max-w-40 items-center gap-1 sm:w-20"
                >
                  <span
                    className={cn(
                      "h-0.5 w-full",
                      isReplacement
                        ? "bg-brand-secondary"
                        : "bg-brand-border-strong"
                    )}
                  />
                  <FlightIcon
                    className={cn(
                      "size-4 shrink-0 rotate-45",
                      isReplacement
                        ? "text-brand-secondary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="h-0.5 w-full bg-brand-border" />
                </span>{" "}
                <span
                  className={cn(typography.labelSm, "text-muted-foreground")}
                >
                  {flight.routeType}
                </span>
              </p>
              <Airport airport={flight.destination} end />
            </div>
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-4 rounded-md bg-muted px-4 py-2 sm:grid-cols-4">
            <Fact fact={flight.departure} />
            <Fact fact={flight.aircraft} />
            <Fact fact={flight.role} highlight={isReplacement} />
            <Fact fact={flight.milestone} />
          </dl>
        </div>
        {/* aria-controls solo abierto: cerrada, la sección no está montada. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? detailId : undefined}
          aria-label={`${open ? "Ocultar detalle" : "Ver más detalle"} del vuelo ${flight.flightNumber}`}
          onClick={() => setOpen(!open)}
          className={cn(
            typography.labelLg,
            "inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-md border border-brand-border bg-card px-4 py-2 text-brand-primary shadow-xs transition-colors hover:border-brand-secondary hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-neutral motion-reduce:transition-none sm:self-start lg:min-h-9 lg:self-center"
          )}
        >
          <ViewIcon aria-hidden="true" className="size-4.5 shrink-0" />
          {open ? "Ocultar detalle" : "Ver más detalle"}
        </button>
      </div>
      <div
        className={cn(
          typography.bodySm,
          "flex flex-wrap items-center justify-between gap-2 bg-muted px-4 py-2 text-muted-foreground sm:px-6"
        )}
      >
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span
            className={cn(
              "flex items-center gap-1 font-medium",
              isReplacement ? "text-brand-secondary" : "text-foreground"
            )}
          >
            <StatusIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            {flight.dispatch}
          </span>{" "}
          <span className={separatorClass}>Comandante: {flight.captain}</span>{" "}
          <span className={separatorClass}>{flight.note}</span>
        </p>
        <p
          className={cn(isReplacement && "font-semibold text-brand-secondary")}
        >
          <SpokenText text={flight.aside} />
        </p>
      </div>
      {/* Solo los details: el resto ya está en la tarjeta. */}
      {open ? (
        <dl
          id={detailId}
          className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-brand-border/70 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
        >
          {flight.details.map((detail, index) => (
            <div
              key={`${detail.label}-${index}`}
              className="flex min-w-0 flex-col gap-0.5"
            >
              <dt
                className={cn(
                  typography.labelSm,
                  "tracking-wider text-muted-foreground uppercase"
                )}
              >
                {detail.label}
              </dt>
              <dd className={cn(typography.bodyMd, "text-foreground")}>
                <SpokenText text={detail.value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}

export default FlightCard
