import { useId } from "react"

import { AcceptIcon, DurationIcon, RegulationIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// R1: normativa de reportes (estática).
const ReportingPolicyCard = () => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-border text-brand-primary"
        >
          <RegulationIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "leading-tight font-bold text-brand-primary"
            )}
          >
            Normativa de Reportes
          </h2>
          <p
            className={cn(
              typography.labelSm,
              "tracking-wider text-muted-foreground uppercase"
            )}
          >
            Regulación Aeronáutica
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md bg-muted p-4">
        <p
          className={cn(
            typography.labelMd,
            "flex items-start gap-1 font-semibold text-brand-secondary"
          )}
        >
          <DurationIcon aria-hidden="true" className="size-4.5 shrink-0" />
          Ventana Límite de Notificación
        </p>
        <p className={cn(typography.bodySm, "text-foreground")}>
          Recomendación de reporte con anticipación mínima de{" "}
          <span className="font-semibold text-brand-secondary">
            2 horas previas
          </span>{" "}
          a la hora de presentación de rampa (
          <span aria-hidden="true" className="font-mono font-medium">
            STD - 1h 30m
          </span>
          <span className="sr-only">STD menos 1 hora 30 minutos</span>).
        </p>
      </div>

      <ul
        className={cn(
          typography.bodySm,
          "flex flex-col gap-1 text-muted-foreground"
        )}
      >
        <li className="flex items-start gap-1">
          <AcceptIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-secondary"
          />
          <span>
            Permite al OCC activar la reserva sin impacto en el SLOT (CTOT).
          </span>
        </li>
        <li className="flex items-start gap-1">
          <AcceptIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-secondary"
          />
          <span>
            Las novedades por fatiga se amparan bajo el programa FRMS sin
            penalización.
          </span>
        </li>
      </ul>
    </section>
  )
}

export default ReportingPolicyCard
