import { useEffect, useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { authService } from "@/modules/login/authService"
import AppRouter from "@/routes/AppRouter"
import { readStoredToken, useAuthStore } from "@/stores/auth.store"

// Si hay un token guardado, pide el usuario a /auth/me antes de pintar las rutas;
// así un F5 no manda al login. Si el token ya no sirve, se borra y se ve el login.
const useRestoreSession = () => {
  const [isRestoring, setIsRestoring] = useState(() => readStoredToken() !== null)

  useEffect(() => {
    const token = readStoredToken()
    if (!token) return

    // El interceptor de api-client lee el token del store.
    useAuthStore.setState({ token })
    let cancelled = false
    void authService.getCurrentUser().then((user) => {
      if (cancelled) return
      if (user) useAuthStore.getState().setSession(user, token)
      else useAuthStore.getState().logout()
      setIsRestoring(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return isRestoring
}

const AirCrewApp = () => {
  const isRestoring = useRestoreSession()

  if (isRestoring) return null

  return (
    <>
      <AppRouter />
      <Toaster
        containerAriaLabel="Notificaciones"
        duration={4500}
        position="top-right"
        // Debajo del navbar (h-16 = 64 px), para no tapar el menú ni el perfil.
        offset={{ top: 80 }}
        mobileOffset={{ top: 72 }}
        richColors
      />
    </>
  )
}

export default AirCrewApp
