import { useId } from "react"
import { Link } from "react-router"

import { ArrowRightIcon, BaseIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { ShiftCrew } from "@/modules/shiftCrew/types/shiftCrew.types"
import { PATHS } from "@/routes/paths"

interface CrewOverviewProps {
  crew: ShiftCrew
}

const headingClass = cn(
  typography.labelSm,
  "flex items-center gap-1.5 tracking-wider uppercase"
)
const countClass = cn(
  typography.displayLg,
  "leading-none tabular-nums md:leading-none"
)

// P: la base (en servicio = total − ausentes − sin asignación; aptos = total − ausentes) y
// la guardia para reemplazos, de la que la IA saca los reemplazos. Cada cifra y cada línea
// es el texto completo de un elemento propio.
const CrewOverview = ({ crew }: CrewOverviewProps) => {
  const baseId = useId()
  const guardId = useId()
  const total = crew.members.length
  const fit =
    total - crew.members.filter(({ status }) => status === "ausente").length
  const onDuty =
    fit - crew.members.filter(({ status }) => status === "sin_asignar").length
  const percent = Math.round((fit / total) * 100)
  const guards = crew.members.filter((member) => member.status === "guardia")
  const available = guards.filter(
    ({ replacementBlocker }) => replacementBlocker === null
  ).length

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section
        aria-labelledby={baseId}
        className="relative flex flex-col justify-center gap-1.5 rounded-xl border border-brand-border/70 bg-card p-5 pr-22 shadow-sm sm:p-6 sm:pr-22"
      >
        <h2 id={baseId} className={cn(headingClass, "text-muted-foreground")}>
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full bg-brand-secondary"
          />
          Tu base
        </h2>
        <p className={cn(typography.headlineSm, "text-brand-primary")}>
          {`${crew.base.name} · ${crew.base.code}`}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn(countClass, "text-brand-primary")}>{onDuty}</span>{" "}
          <span className={cn(typography.labelMd, "text-muted-foreground")}>
            en servicio
          </span>
        </p>
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          {`${percent} % de la tripulación del turno está apta (${fit} de ${total}).`}
        </p>
        <BaseIcon
          aria-hidden="true"
          className="absolute top-1/2 right-5 size-12 shrink-0 -translate-y-1/2 rounded-xl bg-brand-neutral p-3 text-brand-primary sm:right-6"
        />
      </section>

      {/* La única tarjeta destacada de la pantalla. */}
      <section
        aria-labelledby={guardId}
        className="flex flex-col gap-1.5 rounded-xl bg-brand-primary bg-linear-135 from-brand-primary to-brand-primary-dark p-5 text-white shadow-sm sm:p-6"
      >
        <h2 id={guardId} className={cn(headingClass, "text-white/80")}>
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full bg-brand-tertiary"
          />
          Guardia para reemplazos
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={countClass}>{available}</span>{" "}
          <span className={cn(typography.labelMd, "text-white/85")}>
            {`de ${guards.length} disponibles`}
          </span>
        </p>
        <p className={cn(typography.bodyMd, "max-w-[46ch] text-white/90")}>
          La IA propone los reemplazos entre la guardia disponible. Quien no
          cumple descanso, habilitación o certificaciones queda fuera.
        </p>
        <Link
          to={PATHS.superVisor.solicitudesReemplazo}
          className={cn(
            typography.labelLg,
            "mt-1.5 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md bg-white px-4 py-2 text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary focus-visible:outline-hidden active:bg-brand-border motion-reduce:transition-none lg:min-h-9"
          )}
        >
          Ir a Recomendaciones
          <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </section>
    </div>
  )
}

export default CrewOverview
