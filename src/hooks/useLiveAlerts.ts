import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { notificationsQueryKey } from "@/App/actions/notifications/notifications.actions"
import { ROLES, type Role } from "@/App/types/auth.types"
import { connectAlerts } from "@/lib/alertsStream"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Lo que trae cada evento del servicio de notificaciones (todos traen message).
interface AlertPayload {
  message: string
  // Solo en absence:suggestions_ready.
  state?: "ready" | "none" | "error"
}

type Tone = "info" | "success" | "warning" | "error"

interface LiveEvent {
  name: string
  // Qué datos refresca (prefijos de queryKey).
  refresh: string[][]
  tone: (payload: AlertPayload) => Tone
}

// Eventos que escucha cada rol. El super_admin no recibe notificaciones.
export const EVENTS_BY_ROLE: Partial<Record<Role, LiveEvent[]>> = {
  [ROLES.SUPER_VISOR]: [
    {
      // Un tripulante reportó una ausencia: cola, seguimiento y tarjetas del Inicio.
      name: "absence:reported",
      refresh: [["replacements"], ["absences"], ["crew"]],
      tone: () => "warning",
    },
    {
      // La IA terminó de buscar candidatos.
      name: "absence:suggestions_ready",
      refresh: [["replacements"], ["absences"]],
      tone: (payload) =>
        payload.state === "error"
          ? "error"
          : payload.state === "none"
            ? "warning"
            : "success",
    },
    {
      // El reemplazo dio «Enterado»: también cambia la tripulación del vuelo.
      name: "absence:covered",
      refresh: [["replacements"], ["absences"], ["crew"], ["assignment"]],
      tone: () => "success",
    },
    {
      // El reemplazo dejó vencer su plazo: la ausencia vuelve a la cola.
      name: "absence:deadline_missed",
      refresh: [["replacements"], ["absences"], ["crew"], ["assignment"]],
      tone: () => "warning",
    },
  ],
  [ROLES.TRIPULANTE]: [
    {
      // Lo eligieron como reemplazo en un vuelo.
      name: "assignment:replacement",
      refresh: [["replacements"], ["crew"]],
      tone: () => "warning",
    },
    {
      // El super_admin le registró la certificación.
      name: "certification:registered",
      refresh: [["certifications"]],
      tone: () => "info",
    },
    {
      // El super_admin verificó su certificación.
      name: "certification:verified",
      refresh: [["certifications"]],
      tone: () => "success",
    },
  ],
}

const notify: Record<Tone, (message: string) => void> = {
  info: (message) => toast.info(message),
  success: (message) => toast.success(message),
  warning: (message) => toast.warning(message),
  error: (message) => toast.error(message),
}

// Avisos en vivo (SSE) del supervisor y del tripulante: con sesión real (cookie), abre la
// conexión, avisa con un toast, refresca la campana (el backend ya guardó el aviso) y las
// pantallas afectadas.
// Las cuentas demo y el selector «Rol (dev)» no tienen sesión en el backend: no se conectan.
export const useLiveAlerts = () => {
  const queryClient = useQueryClient()
  // Rol e id del usuario con sesión real que recibe avisos; null en cualquier otro caso.
  const user = useAuthStore((state) => state.user)
  const role =
    user && !isDemoUser(user) && EVENTS_BY_ROLE[user.role] ? user.role : null
  const userId = role ? user?.id : null

  useEffect(() => {
    if (!role || !userId) return
    const connection = connectAlerts()

    for (const event of EVENTS_BY_ROLE[role] ?? []) {
      connection.on(event.name, (data) => {
        const payload = data as AlertPayload
        notify[event.tone(payload)](payload.message)
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
        for (const queryKey of event.refresh) {
          void queryClient.invalidateQueries({ queryKey })
        }
      })
    }

    // El servidor avisa antes de que venza el token y luego cierra la conexión.
    connection.on("auth:expired", (data) => {
      connection.close()
      toast.error((data as AlertPayload).message)
      useAuthStore.getState().logout()
    })

    // Al cerrar sesión o cambiar de usuario se cierra la conexión.
    return () => connection.close()
  }, [role, userId, queryClient])
}
