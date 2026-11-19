import { NotificationsEmptyIcon, NotificationsIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAlertsStore } from "@/stores/alerts.store"

import { barButton, popoverSurface } from "./navbar.styles"

// «14:32», en la hora del navegador.
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  })

// Alertas en vivo recibidas en esta sesión (las llena useLiveAlerts). El backend no
// guarda historial: al recargar la lista empieza vacía. Al cerrar el menú quedan leídas.
const NotificationsMenu = () => {
  const alerts = useAlertsStore((state) => state.alerts)
  const markAllRead = useAlertsStore((state) => state.markAllRead)
  const unread = alerts.filter((alert) => !alert.read).length

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open && unread > 0) markAllRead()
      }}
    >
      <DropdownMenuTrigger
        aria-label={
          unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"
        }
        className={cn(barButton, "relative size-11 justify-center lg:size-9")}
      >
        <NotificationsIcon className="size-5" aria-hidden="true" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className={cn(
              typography.labelSm,
              "absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-white tabular-nums"
            )}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(popoverSurface, "w-80 max-w-[calc(100vw-2rem)]")}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel
            className={cn(
              typography.labelSm,
              "px-3 py-2 text-brand-primary uppercase"
            )}
          >
            Notificaciones
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-brand-border" />
        {alerts.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center gap-2 px-4 py-8 text-center"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-neutral text-brand-secondary">
              <NotificationsEmptyIcon className="size-5" aria-hidden="true" />
            </span>
            <p className={cn(typography.bodyMd, "text-muted-foreground")}>
              No tienes notificaciones nuevas
            </p>
          </div>
        ) : (
          <ul
            aria-label="Alertas de esta sesión"
            className="flex max-h-96 flex-col overflow-y-auto"
          >
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "flex flex-col gap-0.5 border-b border-brand-border/60 px-3 py-2.5 last:border-b-0",
                  !alert.read && "bg-brand-neutral"
                )}
              >
                <p
                  className={cn(
                    typography.bodySm,
                    alert.read
                      ? "text-foreground"
                      : "font-semibold text-brand-primary"
                  )}
                >
                  {alert.message}
                </p>
                <time
                  dateTime={alert.sentAt}
                  className={cn(typography.labelSm, "text-muted-foreground")}
                >
                  {timeOf(alert.sentAt)}
                  {alert.read ? null : <span className="sr-only"> · nueva</span>}
                </time>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationsMenu
