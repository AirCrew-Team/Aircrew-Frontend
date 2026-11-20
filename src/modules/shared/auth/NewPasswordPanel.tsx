import { useEffect, useId, useRef, useState, type ComponentProps } from "react"
import { Link } from "react-router"

import type { ResetTokenCheck } from "@/App/actions/auth/auth.actions"
import { InfoIcon } from "@/App/utils/icons"
import logo from "@/App/utils/images/Logotipo.png"
import { PATHS } from "@/routes/paths"

import { NewPasswordForm } from "./NewPasswordForm"
import { infoNoticeClass } from "./styles"

const currentYear = new Date().getFullYear()

type FormProps = ComponentProps<typeof NewPasswordForm>

type NewPasswordPanelProps = Pick<
  FormProps,
  "submit" | "submitLabel" | "busyLabel" | "welcomeToast" | "loginToast"
> & {
  /** Token del enlace (?token=); vacío si el enlace no lo trae. */
  token: string
  title: string
  subtitle: string
  /** Aviso cuando falta el token o el backend lo rechaza (400). */
  invalidLinkMessage: string
  /** Solo el restablecimiento: texto del límite (429) si el backend no trae el suyo.
   *  Sin él, un 429 se muestra como error de conexión. */
  limitFallback?: string
  /** Comprueba el token al abrir la pantalla. Un error de red o un 5xx deja el
   *  formulario, que se valida igual al enviar. */
  checkToken?: (token: string) => Promise<ResetTokenCheck>
}

/** Panel de las pantallas del enlace por correo (activar cuenta y restablecer la
 *  contraseña): logo, título y formulario, o el aviso que lo reemplaza. */
export function NewPasswordPanel({
  token,
  title,
  subtitle,
  invalidLinkMessage,
  limitFallback,
  checkToken,
  ...formProps
}: NewPasswordPanelProps) {
  const [linkRejected, setLinkRejected] = useState(false)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  // Resultado de la comprobación inicial, ligado a su token: si el token cambia,
  // el anterior deja de valer y se vuelve a comprobar.
  const [check, setCheck] = useState<{
    token: string
    result: ResetTokenCheck
  } | null>(null)
  const loginLinkRef = useRef<HTMLAnchorElement>(null)
  const limitId = useId()
  const checkResult = check?.token === token ? check.result : null
  const isChecking = Boolean(token && checkToken) && checkResult === null
  const checkLimitMessage =
    checkResult?.status === "limited"
      ? checkResult.message || (limitFallback ?? "")
      : null
  const shownLimitMessage = limitMessage ?? checkLimitMessage
  const isLimited = shownLimitMessage !== null
  const isRejected = linkRejected || checkResult?.status === "invalid"
  const showForm = Boolean(token) && !isChecking && !isRejected && !isLimited

  // Tras un 400 o un 429 al enviar, el formulario (y el botón con el foco)
  // desaparece: el foco pasa al enlace del aviso. Al abrir un enlace sin token o
  // rechazado por la comprobación inicial no se mueve.
  useEffect(() => {
    if (linkRejected || limitMessage !== null) loginLinkRef.current?.focus()
  }, [linkRejected, limitMessage])

  // Comprobación al abrir. Una respuesta que llega tras desmontar o cambiar el
  // token (también el primer efecto de StrictMode) no se aplica.
  useEffect(() => {
    if (!token || !checkToken) return
    let ignore = false
    void checkToken(token)
      .catch((): ResetTokenCheck => ({ status: "valid" }))
      .then((result) => {
        if (!ignore) setCheck({ token, result })
      })
    return () => {
      ignore = true
    }
  }, [token, checkToken])

  return (
    <section
      aria-labelledby="new-password-title"
      className="grid min-h-svh place-items-center overflow-hidden bg-[#f8faff] px-[clamp(32px,6vw,92px)] pt-16 pb-[38px] max-[900px]:px-[34px] max-[700px]:px-6 max-[700px]:pt-12 max-[700px]:pb-7"
    >
      <div className="relative my-auto w-full max-w-[500px] max-[700px]:max-w-[460px]">
        <img
          alt="AirCrew"
          className="mx-auto mb-5 block size-[76px] object-contain max-[700px]:mb-[22px]"
          src={logo}
        />
        <header className="mb-12 text-center max-[700px]:mb-9">
          <h1
            className="m-0 text-[clamp(30px,3vw,42px)] leading-[1.15] font-bold tracking-[-.045em] text-[#113d5f]"
            id="new-password-title"
          >
            {title}
          </h1>
          {showForm && (
            <p className="mt-[9px] text-lg text-[#8192a8]">{subtitle}</p>
          )}
        </header>
        {isChecking ? (
          <p className="text-center text-[15px] text-[#8192a8]" role="status">
            Comprobando el enlace…
          </p>
        ) : showForm ? (
          <NewPasswordForm
            {...formProps}
            onInvalidLink={() => setLinkRejected(true)}
            onLimit={
              limitFallback === undefined
                ? undefined
                : (message) => setLimitMessage(message || limitFallback)
            }
            token={token}
          />
        ) : (
          <div className="text-center">
            {isLimited ? (
              <p className={infoNoticeClass} id={limitId} role="status">
                <InfoIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                {shownLimitMessage}
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#b42318]" role="alert">
                {invalidLinkMessage}
              </p>
            )}
            {/* Con el límite, el foco llega aquí: la descripción lee el aviso */}
            <Link
              aria-describedby={isLimited ? limitId : undefined}
              className="mt-6 inline-block rounded-sm text-[15px] font-semibold text-[#258dc3] hover:text-[#126b9b] hover:underline hover:underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#57b4e3]"
              ref={loginLinkRef}
              to={PATHS.login}
            >
              Ir al inicio de sesión
            </Link>
          </div>
        )}
        <p className="mt-14 text-center text-xs text-[#91a0b2]">
          © {currentYear} AirCrew. Todos los derechos reservados.
        </p>
      </div>
    </section>
  )
}
