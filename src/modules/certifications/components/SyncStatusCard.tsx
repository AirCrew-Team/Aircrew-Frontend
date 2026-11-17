import { SyncIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// T1: estado de la sincronización con Aerocivil. Texto fijo: no hay sincronización real.
const SyncStatusCard = () => {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-border/70 bg-card p-5 shadow-sm sm:p-6">
      <h2
        className={cn(
          typography.headlineSm,
          "font-bold text-balance text-brand-primary"
        )}
      >
        Sincronización RAC en Tiempo Real
      </h2>
      <div className="order-first flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            typography.labelSm,
            "flex items-start gap-1 font-bold tracking-wider text-brand-secondary uppercase"
          )}
        >
          <SyncIcon aria-hidden="true" className="size-3.5 shrink-0" />
          API Aerocivil conectada
        </p>
        <span
          className={cn(
            typography.labelSm,
            "rounded-full border border-transparent bg-brand-border px-2 py-0.5 text-brand-primary"
          )}
        >
          En línea
        </span>
      </div>
      <p className={cn(typography.bodySm, "text-muted-foreground")}>
        Las horas de vuelo, calificaciones y chequeos médicos se concilian
        automáticamente con la base de datos central de la Dirección General de
        Aviación Civil.
      </p>
      <div
        className={cn(
          typography.labelSm,
          "mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-4 text-muted-foreground"
        )}
      >
        <p className="min-w-0">Última comprobación: Hoy, 06:15 COT</p>
        <p className="min-w-0 wrap-anywhere text-brand-secondary">
          Hash: #RAC-88192-OK
        </p>
      </div>
    </div>
  )
}

export default SyncStatusCard
