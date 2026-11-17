// Logo pequeño que se muestra sobre el título del login
import loginLogo from "@/App/utils/images/Logotipo.png"
import { LoginForm } from "./LoginForm"
import type { Session } from "./types"

// Año actual para el pie de página
const currentYear = new Date().getFullYear()

/** Agrupa el logo, la bienvenida y el formulario del panel de acceso. */
type LoginPanelProps = {
  onLoginSuccess?: (session: Session) => void
}

export function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  return (
    // Panel del formulario: ocupa toda la altura y centra el contenido
    <section
      aria-labelledby="login-title"
      className="grid min-h-svh place-items-center overflow-hidden bg-[#f8faff] px-[clamp(32px,6vw,92px)] pt-16 pb-[38px] max-[900px]:px-[34px] max-[700px]:px-6 max-[700px]:pt-12 max-[700px]:pb-7"
    >
      <div className="relative my-auto w-full max-w-[500px] max-[700px]:max-w-[460px]">
        {/* Logo */}
        <img
          alt="AirCrew"
          className="mx-auto mb-5 block size-[76px] object-contain max-[700px]:mb-[22px]"
          src={loginLogo}
        />
        {/* Encabezado: texto auxiliar (solo en móvil), título y subtítulo */}
        <header className="mb-12 text-center max-[700px]:mb-9">
          <p className="mb-2.5 hidden text-[11px] font-bold tracking-[.15em] text-[#248fc4] uppercase max-[700px]:block">
            Tu espacio de trabajo
          </p>
          <h1
            className="m-0 text-[clamp(30px,3vw,42px)] leading-[1.15] font-bold tracking-[-.045em] text-[#113d5f]"
            id="login-title"
          >
            Bienvenido de nuevo
          </h1>
          <p className="mt-[9px] text-lg text-[#8192a8]">
            Inicia sesión para continuar
          </p>
        </header>
        {/* Formulario de acceso */}
        <LoginForm onLoginSuccess={onLoginSuccess} />
        {/* Pie de página con derechos */}
        <p className="mt-14 text-center text-xs text-[#91a0b2]">
          © {currentYear} AirCrew. Todos los derechos reservados.
        </p>
      </div>
    </section>
  )
}