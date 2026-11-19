import { useEffect } from "react"
import { Outlet } from "react-router"

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

// Raíz de todas las rutas: al arrancar pregunta al backend si la cookie de sesión sigue
// viva (F5). Cualquier fallo (401, red, 5xx) se trata como «sin sesión», sin aviso.
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
      () => {
        if (stillChecking()) useAuthStore.getState().logout()
      }
    )
  }, [])

  return <Outlet />
}

export default SessionGate
