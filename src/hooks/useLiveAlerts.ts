import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ROLES } from "@/App/types/auth.types"
import { connectAlerts } from "@/lib/socket"
import { useAlertsStore } from "@/stores/alerts.store"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Lo que trae cada evento del servicio de notificaciones (todos traen message y sent_at).
interface AlertPayload {
  message: string
  sent_at?: string
  // Solo en absence:suggestions_ready.
  state?: "ready" | "none" | "error"
}

type Tone = "info" | "success" | "warning" | "error"

// Qué datos refresca cada evento (prefijos de queryKey) y con qué tono se avisa.
const EVENTS: {
  name: string
  refresh: string[][]
  tone: (payload: AlertPayload) => Tone
}[] = [
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
]

const notify: Record<Tone, (message: string) => void> = {
  info: (message) => toast.info(message),
  success: (message) => toast.success(message),
  warning: (message) => toast.warning(message),
  error: (message) => toast.error(message),
}

// Alertas en vivo del supervisor: con sesión real (cookie), abre el socket, avisa con un
// toast, guarda la alerta para la campana y refresca las pantallas afectadas.
// Las cuentas demo y el selector «Rol (dev)» no tienen sesión en el backend: no se conectan.
export const useLiveAlerts = () => {
  const queryClient = useQueryClient()
  // id del supervisor con sesión real; null en cualquier otro caso.
  const supervisorId = useAuthStore((state) =>
    state.user?.role === ROLES.SUPER_VISOR && !isDemoUser(state.user)
      ? state.user.id
      : null
  )

  useEffect(() => {
    if (!supervisorId) return

    const socket = connectAlerts()

    for (const event of EVENTS) {
      socket.on(event.name, (payload: AlertPayload) => {
        useAlertsStore.getState().add({
          type: event.name,
          message: payload.message,
          sentAt: payload.sent_at ?? new Date().toISOString(),
        })
        notify[event.tone(payload)](payload.message)
        for (const queryKey of event.refresh) {
          void queryClient.invalidateQueries({ queryKey })
        }
      })
    }

    // El servidor avisa antes de que venza el token y luego desconecta.
    socket.on("auth:expired", (payload: AlertPayload) => {
      toast.error(payload.message)
      useAuthStore.getState().logout()
    })

    // Al cerrar sesión o cambiar de usuario, las alertas de esta sesión ya no aplican.
    return () => {
      socket.disconnect()
      useAlertsStore.getState().clear()
    }
  }, [supervisorId, queryClient])
}
