import { Navigate } from "react-router"

import DevRoleSwitcher from "@/components/custom/DevRoleSwitcher"
import { AuthHero } from "@/modules/login/AuthHero"
import { LoginPanel } from "@/modules/login/LoginPanel"
import type { Session } from "@/modules/login/types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { useAuthStore } from "@/stores/auth.store"

/** Página de acceso: compone el panel visual y el módulo del formulario. */
const LoginPage = () => {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const setMockRole = useAuthStore((state) => state.setMockRole)

  // Con sesión (login recién hecho o /auth/me confirmado) se va al inicio del rol.
  // Es la única navegación tras el login: con una segunda, la que llegara última sin
  // focusMain dejaría el foco fuera de <main> (MainLayout lo enfoca al montarse).
  if (user) {
    return (
      <Navigate
        to={HOME_PATH_BY_ROLE[user.role]}
        replace
        state={{ focusMain: true }}
      />
    )
  }

  // Cuenta real: el usuario del backend. Cuenta demo: el usuario simulado del rol.
  const handleLoginSuccess = (session: Session) => {
    if (session.user) setUser(session.user)
    else setMockRole(session.role)
  }

  return (
    <>
      <main className="grid min-h-svh grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] bg-[#f7faff] text-[#123e60] max-[900px]:grid-cols-[minmax(0,.85fr)_minmax(400px,1.15fr)] max-[700px]:block">
        <AuthHero />
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      </main>
      {import.meta.env.DEV && <DevRoleSwitcher />}
    </>
  )
}

export default LoginPage
