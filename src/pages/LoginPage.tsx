import { useNavigate } from "react-router"

import { AuthHero } from "@/modules/login/AuthHero"
import { LoginPanel } from "@/modules/login/LoginPanel"
import type { Session } from "@/modules/login/types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { useAuthStore } from "@/stores/auth.store"

/** Página de acceso: compone el panel visual y el módulo del formulario. */
const LoginPage = () => {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)

  // Guarda el usuario del backend y su token, y lleva al inicio de su rol.
  const handleLoginSuccess = (session: Session) => {
    setSession(session.user, session.token)
    // focusMain: MainLayout enfoca el contenido para que el lector anuncie la pantalla nueva.
    navigate(HOME_PATH_BY_ROLE[session.role], {
      replace: true,
      state: { focusMain: true },
    })
  }

  return (
    <main className="grid min-h-svh grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] bg-[#f7faff] text-[#123e60] max-[900px]:grid-cols-[minmax(0,.85fr)_minmax(400px,1.15fr)] max-[700px]:block">
      <AuthHero />
      <LoginPanel onLoginSuccess={handleLoginSuccess} />
    </main>
  )
}

export default LoginPage
