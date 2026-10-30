import { AuthHero } from "@/modules/login/AuthHero"
import { LoginPanel } from "@/modules/login/LoginPanel"

/** Página de acceso: compone el panel visual y el módulo del formulario. */
const LoginPage = () => (
  <main className="grid min-h-svh grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] bg-[#f7faff] text-[#123e60] max-[900px]:grid-cols-[minmax(0,.85fr)_minmax(400px,1.15fr)] max-[700px]:block">
    <AuthHero />
    <LoginPanel />
  </main>
)

export default LoginPage
