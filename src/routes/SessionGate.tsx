import { isAxiosError } from "axios"
import { useEffect } from "react"
import { Outlet } from "react-router"
import { toast } from "sonner"

import { getCurrentUser } from "@/App/actions/auth/auth.actions"
import { useAuthStore } from "@/stores/auth.store"

// Estado de carga de las rutas que dependen de la sesión mientras se comprueba.
export const SessionLoading = () => (
  <p
    role="status"
    className="grid min-h-svh place-items-center text-sm text-muted-foreground"
  >
    Cargando tu sesión…
  </p>
)

// 401 de una sesión que existía y venció o se anuló (`token_expired`, `session_revoked`…).
// Sin `code` o con `auth_required` (visita sin cookie) no hay nada que avisar (FE1-F1).
const isEndedSession = (error: unknown) => {
  if (!isAxiosError(error) || error.response?.status !== 401) return false
  const code: unknown = error.response.data?.code
  return typeof code === "string" && code !== "auth_required"
}

// Raíz de todas las rutas: al arrancar pregunta al backend si la cookie de sesión sigue
// viva (F5). Cualquier fallo (401, red, 5xx) se trata como «sin sesión»; solo una sesión
// vencida o anulada avisa con un toast.
const SessionGate = () => {
  useEffect(() => {
    const { status, user } = useAuthStore.getState()
    if (status !== "checking" || user) return

    // Solo se aplica si nadie resolvió la sesión entretanto: una respuesta tardía no
    // pisa un login hecho mientras tanto (ni la segunda petición del doble efecto).
    const stillChecking = () => useAuthStore.getState().status === "checking"
    getCurrentUser().then(
      (currentUser) => {
        if (stillChecking()) useAuthStore.getState().setUser(currentUser)
      },
      (error: unknown) => {
        if (!stillChecking()) return
        useAuthStore.getState().logout()
        if (isEndedSession(error)) {
          toast.error("Tu sesión venció o se cerró. Inicia sesión de nuevo.")
        }
      }
    )
  }, [])

  return <Outlet />
}

export default SessionGate
