import { useId } from "react"
import type { UseFormRegister } from "react-hook-form"

import type { NotificationKey } from "@/App/types/profile.types"
import {
  AbsenceIcon,
  ConfirmedIcon,
  InfoIcon,
  NotificationsActiveIcon,
  RouteIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SectionCard from "@/modules/profile/components/SectionCard"
import type { ProfileFormValues } from "@/modules/profile/schemas/profile.schema"

const SWITCHES: Record<
  NotificationKey,
  { title: string; description: string; Icon: typeof AbsenceIcon }
> = {
  replacement_assigned: {
    title: "Asignación de reemplazo",
    description:
      "Aviso cuando el supervisor te asigna otro vuelo por un reemplazo.",
    Icon: RouteIcon,
  },
  absence_reported: {
    title: "Nuevas ausencias reportadas",
    description: "Aviso cuando un tripulante reporta una ausencia.",
    Icon: AbsenceIcon,
  },
  absence_covered: {
    title: "Ausencias cubiertas",
    description: "Aviso cuando una ausencia queda con reemplazo.",
    Icon: ConfirmedIcon,
  },
}

interface NotificationsSectionProps {
  number: number
  // Interruptores del rol (notificationKeysFor).
  keys: NotificationKey[]
  register: UseFormRegister<ProfileFormValues>
  // Cuentas demo: interruptores deshabilitados.
  disabled: boolean
}

// Notificaciones (tripulante y supervisor, con interruptores distintos; el admin no
// tiene): se guardan con «Guardar
// cambios», aunque todavía no tengan efecto. Toda la fila es clicable (label), pero el
// nombre accesible del switch es solo el título (aria-labelledby).
const NotificationsSection = ({
  number,
  keys,
  register,
  disabled,
}: NotificationsSectionProps) => {
  const baseId = useId()

  return (
    <SectionCard
      title={`${number}. Notificaciones`}
      icon={<NotificationsActiveIcon aria-hidden="true" className="size-4.5" />}
    >
      <div className="flex flex-col gap-4">
        {keys.map((key) => {
          const { title, description, Icon } = SWITCHES[key]
          return (
            <label
              key={key}
              className="group flex cursor-pointer items-start justify-between gap-4 rounded-lg p-2 transition-colors hover:bg-background has-disabled:cursor-not-allowed has-disabled:hover:bg-transparent motion-reduce:transition-none"
            >
              <span className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-brand-secondary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    id={`${baseId}-${key}-title`}
                    className={cn(
                      typography.labelLg,
                      "font-bold wrap-break-word text-brand-primary"
                    )}
                  >
                    {title}
                  </span>
                  <span
                    id={`${baseId}-${key}-description`}
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
                  aria-labelledby={`${baseId}-${key}-title`}
                  aria-describedby={`${baseId}-${key}-description`}
                  className="peer sr-only"
                  {...register(`notifications.${key}`, { disabled })}
                />
                {/* Pista: borde de 4:1 sobre blanco (sin él, la pista apagada no llega a 3:1).
                    En colores forzados el círculo pasa de hueco (apagado) a relleno (activo). */}
                <span
                  aria-hidden="true"
                  className="relative h-6 w-11 rounded-full border border-muted-foreground/70 bg-brand-border-strong transition-colors peer-checked:border-brand-secondary peer-checked:bg-brand-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-tertiary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-focus-visible:outline-hidden peer-disabled:opacity-60 after:absolute after:top-0.5 after:left-0.5 after:size-4.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none forced-colors:after:border forced-colors:peer-checked:after:border-9"
                />
              </span>
            </label>
          )
        })}
      </div>

      <p
        className={cn(
          typography.bodySm,
          "flex items-start gap-1.5 border-t border-brand-neutral pt-3 text-muted-foreground"
        )}
      >
        <InfoIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-brand-secondary"
        />
        Tus preferencias quedan guardadas. Las alertas dentro de la app llegarán
        en una próxima versión.
      </p>
    </SectionCard>
  )
}

export default NotificationsSection
