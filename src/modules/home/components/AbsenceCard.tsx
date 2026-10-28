import { Link } from "react-router"

import { AbsenceIcon, ArrowRightIcon, PolicyIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { PATHS } from "@/routes/paths"

// Tarjeta 3 (estática): acceso rápido para reportar una novedad o ausencia.
const AbsenceCard = () => {
  return (
    <article className="flex flex-col justify-between gap-6 rounded-xl bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col pt-2">
          <h2
            className={cn(
              typography.headlineMd,
              "font-bold text-brand-primary"
            )}
          >
            Novedad o Ausencia
          </h2>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            Notificación inmediata a despacho central
          </p>
        </div>
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
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-neutral text-brand-primary"
            >
              <AbsenceIcon aria-hidden="true" className="size-5" />
            </span>
            Canal OCC Rápido
          </p>
          <p
            className={cn(
              typography.labelSm,
              "shrink-0 rounded-sm bg-brand-neutral px-2 py-0.5 text-brand-primary"
            )}
          >
            Auto-Gestión
          </p>
        </div>
        <div
          className={cn(
            typography.bodySm,
            "flex flex-col gap-2 rounded-md bg-muted p-2.5 text-foreground"
          )}
        >
          <p className="leading-normal text-muted-foreground">
            Reporte oportuno por incapacidad médica, fatiga operacional o
            calamidad doméstica para activar relevos en cascada.
          </p>
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-1.5 text-brand-secondary"
            )}
          >
            <PolicyIcon aria-hidden="true" className="size-4 shrink-0" />
            Alineado con Política Safety &amp; SMS
          </p>
        </div>
      </div>
      <Link
        to={PATHS.tripulante.reportarAusencia}
        className={cn(
          typography.labelMd,
          "inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-md bg-muted px-4 py-2.5 font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden lg:min-h-9"
        )}
      >
        Reportar Ausencia
        <ArrowRightIcon aria-hidden="true" className="size-4.5 shrink-0" />
      </Link>
    </article>
  )
}

export default AbsenceCard
