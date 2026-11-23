import { useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router"

import {
  getMyNotifications,
  markAllNotificationsRead,
  notificationsQueryKey,
} from "@/App/actions/notifications/notifications.actions"
import { NotificationsEmptyIcon, NotificationsIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EVENTS_BY_ROLE } from "@/hooks/useLiveAlerts"
import { cn } from "@/lib/utils"
import { notificationTarget } from "@/modules/shared/notifications/notificationTarget"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

import { barButton, popoverSurface } from "./navbar.styles"

// «14:32» si es de hoy; si no, «20 nov, 14:32». En la hora del navegador.
const timeOf = (iso: string) => {
  const date = new Date(iso)
  const time = date.toLocaleTimeString("es-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  if (date.toDateString() === new Date().toDateString()) return time
  const day = date.toLocaleDateString("es-US", {
    day: "numeric",
    month: "short",
  })
  return `${day}, ${time}`
}

// Avisos guardados en el backend (servicio notification): se ven aunque la persona no
// estuviera conectada cuando llegaron. useLiveAlerts la refresca al llegar uno en vivo.
// Al cerrar el menú quedan leídos. Las cuentas demo y el super_admin no tienen avisos.
// Los avisos con destino (notificationTarget) son ítems del menú que llevan a su pantalla.
const NotificationsMenu = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Como en ProfileMenu: si la ruta cambia, MainLayout enfoca <main> y el menú no debe
  // devolver el foco a la campana después.
  const navigatingRef = useRef(false)
  const user = useAuthStore((state) => state.user)
  const enabled =
    user !== null && !isDemoUser(user) && Boolean(EVENTS_BY_ROLE[user.role])

  const { data } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: getMyNotifications,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  })

  const alerts = enabled ? (data?.items ?? []) : []
  const unread = enabled ? (data?.unread_count ?? 0) : 0

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) navigatingRef.current = false
        if (!open && unread > 0 && !markAllRead.isPending) markAllRead.mutate()
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
        finalFocus={() => !navigatingRef.current}
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
          <DropdownMenuGroup
            aria-label="Notificaciones recientes"
            className="flex max-h-96 flex-col overflow-y-auto"
          >
            {alerts.map((alert) => {
              const target = notificationTarget(alert)
              const className = cn(
                "flex flex-col gap-0.5 border-b border-brand-border/60 px-3 py-2.5 last:border-b-0",
                !alert.read && "bg-brand-neutral"
              )
              const content = (
                <>
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
                    dateTime={alert.created_at}
                    className={cn(typography.labelSm, "text-muted-foreground")}
                  >
                    {timeOf(alert.created_at)}
                    {alert.read ? null : (
                      <span className="sr-only"> · nueva</span>
                    )}
                  </time>
                </>
              )
              // Sin destino (tipo desconocido o aviso sin id): texto, como antes.
              return target ? (
                <DropdownMenuItem
                  key={alert.id}
                  className={cn(
                    className,
                    "items-start rounded-none text-left"
                  )}
                  onClick={() => {
                    // En la misma pantalla se reemplaza la entrada: Atrás no repite la
                    // misma pantalla.
                    const samePath = target.split("?")[0] === pathname
                    navigatingRef.current = !samePath
                    void navigate(target, { replace: samePath })
                  }}
                >
                  {content}
                </DropdownMenuItem>
              ) : (
                <div key={alert.id} className={className}>
                  {content}
                </div>
              )
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationsMenu
