import { useId } from "react"
import type { UseFormRegister } from "react-hook-form"

import { AbsenceIcon, FlightIcon, NotificationsIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import {
  sectionClass,
  switchTrackClass,
} from "@/modules/operatorProfile/components/formStyles"
import SectionTitle from "@/modules/operatorProfile/components/SectionTitle"
import type { OperatorProfileFormValues } from "@/modules/operatorProfile/schemas/operatorProfile.schema"
import type { OperatorNotification } from "@/modules/operatorProfile/types/operatorProfile.types"

// Ícono y color de cada tipo de notificación (las ausencias, en rojo como en la referencia).
const NOTIFICATION_ICONS: Record<
  OperatorNotification["icon"],
  { icon: typeof FlightIcon; box: string }
> = {
  absence: { icon: AbsenceIcon, box: "bg-error-container text-destructive" },
  fleet: { icon: FlightIcon, box: "bg-brand-neutral text-brand-secondary" },
}

interface NotificationsSectionProps {
  // Notificaciones que el super admin puede activar o desactivar.
  notifications: OperatorNotification[]
  register: UseFormRegister<OperatorProfileFormValues>
}

// 3. Notificaciones Operacionales: un interruptor por cada aviso.
const NotificationsSection = ({
  notifications,
  register,
}: NotificationsSectionProps) => {
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <SectionTitle
        id={`${id}-title`}
        icon={NotificationsIcon}
        title="3. Notificaciones Operacionales"
        description="Elige qué información crítica recibes inmediatamente durante tu turno."
      />
      <div className="flex flex-col gap-3">
        {notifications.map((notification) => {
          const { icon: Icon, box } = NOTIFICATION_ICONS[notification.icon]
          const titleId = `${id}-${notification.id}-title`
          const descriptionId = `${id}-${notification.id}-description`
          return (
            // Toda la fila activa el interruptor; el nombre y la descripción salen del título.
            <label
              key={notification.id}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-muted p-4"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    box
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    id={titleId}
                    className={cn(
                      typography.labelLg,
                      "font-bold text-brand-primary"
                    )}
                  >
                    {notification.title}
                  </span>
                  <span
                    id={descriptionId}
                    className={cn(typography.bodySm, "text-muted-foreground")}
                  >
                    {notification.description}
                  </span>
                </span>
              </span>
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  role="switch"
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  className="peer sr-only"
                  {...register(`notifications.${notification.id}`)}
                />
                <span aria-hidden="true" className={switchTrackClass} />
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

export default NotificationsSection
