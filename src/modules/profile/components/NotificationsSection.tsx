import { useId } from "react"
import type { UseFormRegister } from "react-hook-form"

import {
  ExpiryReminderIcon,
  NotificationsActiveIcon,
  RouteIcon,
  UrgentAlertIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { ProfileFormValues } from "@/modules/profile/schemas/profile.schema"

const SWITCHES = [
  {
    name: "urgentReplacement",
    title: "Alertas de Reemplazo Urgente",
    description:
      "Envío inmediato por SMS de alta prioridad y notificación Push sonora cuando Control Operativo (OCC) active tu llamada de guardia domiciliaria.",
    Icon: UrgentAlertIcon,
  },
  {
    name: "gateChanges",
    title: "Cambios de Puerta o Itinerario",
    description:
      "Notificaciones en vivo sobre cambios de matrícula de aeronave, asignación de puerta en BOG y retrasos en slots de despegue.",
    Icon: RouteIcon,
  },
  {
    name: "certificationExpiry",
    title: "Recordatorio de Vencimiento de Certificaciones",
    description:
      "Alertas programadas automáticas cuando tu simulador de recurrencia, visa o examen médico estén a menos de 60 días de su vencimiento.",
    Icon: ExpiryReminderIcon,
  },
] as const

interface NotificationsSectionProps {
  register: UseFormRegister<ProfileFormValues>
}

// F3 (tripulante): interruptores de notificaciones. Toda la fila es clicable (label),
// pero el nombre accesible del switch es solo el título (aria-labelledby).
const NotificationsSection = ({ register }: NotificationsSectionProps) => {
  const titleId = useId()
  const baseId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="-mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-xl border-b border-brand-neutral bg-background px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-border text-brand-primary">
            <NotificationsActiveIcon aria-hidden="true" className="size-4.5" />
          </span>
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "min-w-0 font-bold text-brand-primary"
            )}
          >
            3. Notificaciones Operativas y Guardias
          </h2>
        </div>
        <p className={cn(typography.labelSm, "shrink-0 text-muted-foreground")}>
          Canales en Tiempo Real
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SWITCHES.map(({ name, title, description, Icon }) => (
          <label
            key={name}
            className="group flex cursor-pointer items-start justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-background motion-reduce:transition-none"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-brand-secondary transition-colors group-hover:bg-brand-primary group-hover:text-white motion-reduce:transition-none">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  id={`${baseId}-${name}-title`}
                  className={cn(
                    typography.labelLg,
                    "font-bold wrap-break-word text-brand-primary"
                  )}
                >
                  {title}
                </span>
                <span
                  id={`${baseId}-${name}-description`}
                  className={cn(typography.bodyMd, "text-muted-foreground")}
                >
                  {description}
                </span>
              </span>
            </span>
            <span className="relative mt-1 inline-flex shrink-0">
              <input
                type="checkbox"
                role="switch"
                aria-labelledby={`${baseId}-${name}-title`}
                aria-describedby={`${baseId}-${name}-description`}
                className="peer sr-only"
                {...register(name)}
              />
              {/* Pista: borde de 4:1 sobre blanco (sin él, la pista apagada no llega a 3:1).
                  En colores forzados el círculo pasa de hueco (apagado) a relleno (activo). */}
              <span
                aria-hidden="true"
                className="relative h-6 w-11 rounded-full border border-muted-foreground/70 bg-brand-border-strong transition-colors peer-checked:border-brand-secondary peer-checked:bg-brand-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-tertiary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-focus-visible:outline-hidden after:absolute after:top-0.5 after:left-0.5 after:size-4.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none forced-colors:after:border forced-colors:peer-checked:after:border-9"
              />
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

export default NotificationsSection
