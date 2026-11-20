import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"

import activateLogo from "@/App/utils/images/Logotipo.png"
import { PATHS } from "@/routes/paths"

import { ActivateForm } from "./ActivateForm"

const currentYear = new Date().getFullYear()

type ActivatePanelProps = {
  /** Token de la invitación (?token=); vacío si el enlace no lo trae. */
  token: string
}

/** Panel de activación: logo, bienvenida y formulario (o aviso de enlace no válido). */
export function ActivatePanel({ token }: ActivatePanelProps) {
  const [linkRejected, setLinkRejected] = useState(false)
  const loginLinkRef = useRef<HTMLAnchorElement>(null)
  const isLinkInvalid = !token || linkRejected

  // Tras un 400 el formulario (y el botón con el foco) desaparece: el foco pasa al
  // enlace del aviso. Al abrir un enlace sin token no se mueve.
  useEffect(() => {
    if (linkRejected) loginLinkRef.current?.focus()
  }, [linkRejected])

  return (
    <section
      aria-labelledby="activate-title"
      className="grid min-h-svh place-items-center overflow-hidden bg-[#f8faff] px-[clamp(32px,6vw,92px)] pt-16 pb-[38px] max-[900px]:px-[34px] max-[700px]:px-6 max-[700px]:pt-12 max-[700px]:pb-7"
    >
      <div className="relative my-auto w-full max-w-[500px] max-[700px]:max-w-[460px]">
        <img
          alt="AirCrew"
          className="mx-auto mb-5 block size-[76px] object-contain max-[700px]:mb-[22px]"
          src={activateLogo}
        />
        <header className="mb-12 text-center max-[700px]:mb-9">
          <h1
            className="m-0 text-[clamp(30px,3vw,42px)] leading-[1.15] font-bold tracking-[-.045em] text-[#113d5f]"
            id="activate-title"
          >
            Activa tu cuenta
          </h1>
          {!isLinkInvalid && (
            <p className="mt-[9px] text-lg text-[#8192a8]">
              Crea tu contraseña para entrar a AirCrew.
            </p>
          )}
        </header>
        {isLinkInvalid ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#b42318]" role="alert">
              Este enlace de activación no es válido o ya venció. Pide a tu
              supervisor que te envíe una nueva invitación. Si ya activaste tu
              cuenta, inicia sesión.
            </p>
            <Link
              className="mt-6 inline-block rounded-sm text-[15px] font-semibold text-[#258dc3] hover:text-[#126b9b] hover:underline hover:underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#57b4e3]"
              ref={loginLinkRef}
              to={PATHS.login}
            >
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <ActivateForm
            onInvalidLink={() => setLinkRejected(true)}
            token={token}
          />
        )}
        <p className="mt-14 text-center text-xs text-[#91a0b2]">
          © {currentYear} AirCrew. Todos los derechos reservados.
        </p>
      </div>
    </section>
  )
}
