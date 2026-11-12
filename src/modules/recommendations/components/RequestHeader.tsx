import { ClockIcon, GateIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { ReplacementRequest } from "@/modules/recommendations/types/recommendations.types"

interface RequestHeaderProps {
  // Solicitud seleccionada; sin ella (cola vacía o cargando) solo se ve el h1.
  request?: ReplacementRequest
}

// Encabezado de la pantalla: el h1 es fijo y el resto sigue a la solicitud seleccionada.
const RequestHeader = ({ request }: RequestHeaderProps) => {
  return (
    <header className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {request ? (
          <p
            className={cn(
              typography.labelSm,
              "w-fit rounded-sm bg-brand-neutral px-2.5 py-1 text-brand-secondary uppercase"
            )}
          >
            Solicitud {request.id}
          </p>
        ) : null}
        <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
          Recomendaciones de Reemplazo
        </h1>
        {request ? (
          <>
            <p className={cn(typography.bodyMd, "text-foreground")}>
              Vuelo{" "}
              <strong className="font-semibold text-brand-primary">
                {request.flightNumber}
              </strong>{" "}
              ({request.origin.code} → {request.destination.code}) ·{" "}
              {request.position} requerido
            </p>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              <span className="font-semibold text-foreground">Motivo:</span>{" "}
              {request.reason}
            </p>
          </>
        ) : null}
      </div>

      {request ? (
        <dl className="flex flex-wrap gap-3 sm:flex-nowrap">
          <div className="relative min-w-0 flex-1 rounded-md bg-muted py-3 pr-4 pl-12 sm:flex-none">
            <dt
              className={cn(
                typography.labelSm,
                "text-muted-foreground uppercase"
              )}
            >
              <ClockIcon
                aria-hidden="true"
                className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-brand-secondary"
              />
              Salida programada
            </dt>
            <dd className={cn(typography.labelLg, "text-brand-primary")}>
              {request.departureUtc} UTC · en {request.timeToDeparture}
            </dd>
          </div>
          <div className="relative min-w-0 flex-1 rounded-md bg-muted py-3 pr-4 pl-12 sm:flex-none">
            <dt
              className={cn(
                typography.labelSm,
                "text-muted-foreground uppercase"
              )}
            >
              <GateIcon
                aria-hidden="true"
                className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-brand-secondary"
              />
              Puerta
            </dt>
            <dd className={cn(typography.labelLg, "text-brand-primary")}>
              {request.gate}
            </dd>
          </div>
        </dl>
      ) : null}
    </header>
  )
}

export default RequestHeader
