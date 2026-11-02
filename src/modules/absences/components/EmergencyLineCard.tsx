import { useId } from "react"

import { EmergencyLineIcon, PhoneIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// R2: línea de emergencia OCC (estática).
const EmergencyLineCard = () => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-primary text-brand-border"
        >
          <EmergencyLineIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "leading-tight font-bold text-brand-primary"
            )}
          >
            Línea de Emergencia OCC
          </h2>
          <p
            className={cn(
              typography.labelSm,
              "tracking-wider text-muted-foreground uppercase"
            )}
          >
            Supervisor de Guardia
          </p>
        </div>
      </div>

      <p className={cn(typography.bodySm, "text-muted-foreground")}>
        Canal directo telefónico y de frecuencia con el supervisor de guardia en
        turno activo las 24 horas.
      </p>

      <div className="flex items-center justify-between gap-3 rounded-md bg-brand-primary-dark p-4 text-white forced-colors:border">
        <div className="flex min-w-0 flex-col">
          <span
            className={cn(typography.labelSm, "text-brand-border uppercase")}
          >
            Central Telefónica Directa
          </span>
          <span
            className={cn(typography.headlineSm, "font-bold tracking-tight")}
          >
            +57 (1) 414-8800
          </span>
          <span
            className={cn(
              typography.labelSm,
              "font-mono font-semibold text-brand-border"
            )}
          >
            Extensión 301
          </span>
        </div>
        <a
          href="tel:+5714148800"
          aria-label="Llamar a la central OCC, +57 (1) 414-8800"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-brand-secondary text-white shadow-sm transition-colors hover:bg-brand-tertiary focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary-dark focus-visible:outline-hidden active:bg-brand-secondary-hover motion-reduce:transition-none lg:size-10"
        >
          <PhoneIcon aria-hidden="true" className="size-5" />
        </a>
      </div>

      <div
        className={cn(
          typography.labelSm,
          "flex flex-wrap items-center justify-between gap-2 px-1 text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-brand-secondary"
          />
          Canal VHF 131.85 MHz
        </span>
        <span className="font-mono">SKBO-OCC-DESP</span>
      </div>
    </section>
  )
}

export default EmergencyLineCard
