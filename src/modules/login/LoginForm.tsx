import { useState, type FormEvent } from "react"
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react"
import { toast } from "sonner"
import { authService } from "./authService"
import { ROLE_LABELS, type Session } from "./types"
import { Button } from "@/components/custom/Button"
import { InputField } from "@/components/custom/InputField"
import { VisibilityToggle } from "@/components/custom/VisibilityToggle"
import { RecoveryDialog } from "./RecoveryDialog"
import { useRecoveryFlow } from "./useRecoveryFlow"
import {
  loginFieldClass,
  loginInputClass,
  loginPrimaryButtonClass,
} from "./styles"

// Intentos fallidos permitidos antes de bloquear el formulario
const MAX_LOGIN_ATTEMPTS = 3

// Tipo de error mostrado en el formulario (null = sin error)
type FormError = "empty" | "invalid" | null

// Mensajes de error según el caso
const ERROR_MESSAGES = {
  empty: "Ingresa tu correo y contraseña.",
  invalid: "Correo o contraseña incorrectos.",
  locked:
    "Se alcanzó el límite de intentos. Recupera tu contraseña para continuar.",
} as const

/**
 * Formulario de acceso. Valida con `authService`, bloquea tras varios intentos
 * fallidos y delega la recuperación en `useRecoveryFlow`.
 * No sabe nada de rutas ni de sesión: al iniciar sesión llama a
 * `onLoginSuccess`, que se conecta en `LoginPage`.
 */
type LoginFormProps = {
  onLoginSuccess?: (session: Session) => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  // Estado de los campos, visibilidad de la contraseña, error, intentos y envío
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<FormError>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Bloquea el formulario al superar el máximo de intentos
  const isLocked = failedAttempts >= MAX_LOGIN_ATTEMPTS

  // Flujo de recuperación; al terminar, desbloquea y limpia el formulario
  const recovery = useRecoveryFlow({
    onRecovered: (recoveredEmail) => {
      setFailedAttempts(0)
      setEmail(recoveredEmail)
      setPassword("")
      setFormError(null)
    },
  })

  // Mensaje a mostrar: el de bloqueo tiene prioridad sobre el error normal
  const errorMessage = isLocked
    ? ERROR_MESSAGES.locked
    : formError
      ? ERROR_MESSAGES[formError]
      : null

  // Valida los campos, intenta iniciar sesión y cuenta los intentos fallidos
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Evita envíos si está bloqueado o ya hay uno en curso
    if (isLocked || isSubmitting) return

    if (!email.trim() || !password) {
      setFormError("empty")
      return
    }

    setIsSubmitting(true)
    const result = await authService.login(email, password)
    setIsSubmitting(false)

    // Acceso correcto: reinicia contadores, saluda y avisa al padre
    if (result.ok) {
      setFailedAttempts(0)
      setFormError(null)
      toast.success(`Bienvenido a AirCrew, ${ROLE_LABELS[result.session.role]}.`)
      onLoginSuccess?.(result.session)
      return
    }

    // Credenciales inválidas: suma un intento
    const nextAttempts = failedAttempts + 1
    setFailedAttempts(nextAttempts)
    setFormError("invalid")

    // Al llegar al límite, abre la recuperación automáticamente
    if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
      void recovery.open(email)
    }
  }

  // Actualiza el correo y limpia el error al escribir
  function handleEmailChange(value: string) {
    setEmail(value)
    setFormError(null)
  }

  // Actualiza la contraseña y limpia el error al escribir
  function handlePasswordChange(value: string) {
    setPassword(value)
    setFormError(null)
  }

  return (
    <>
      <form className="w-full" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5">
          {/* Campo de correo */}
          <InputField
            autoComplete="email"
            fieldClassName={loginFieldClass}
            icon={<UserRound size={22} strokeWidth={1.8} />}
            iconClassName="grid shrink-0 place-items-center"
            inputClassName={loginInputClass}
            label="Correo"
            name="email"
            onChange={(event) => handleEmailChange(event.target.value)}
            placeholder="Correo"
            required
            type="email"
            value={email}
          />
          {/* Campo de contraseña con botón mostrar/ocultar */}
          <InputField
            autoComplete="current-password"
            fieldClassName={loginFieldClass}
            icon={<LockKeyhole size={21} strokeWidth={1.8} />}
            iconClassName="grid shrink-0 place-items-center"
            inputClassName={loginInputClass}
            label="Contraseña"
            name="password"
            onChange={(event) => handlePasswordChange(event.target.value)}
            placeholder="Contraseña"
            required
            trailing={
              <VisibilityToggle
                className="grid size-9 place-items-center rounded-[9px] bg-transparent text-[#315775] hover:bg-[#edf5fa]"
                iconSize={21}
                isVisible={showPassword}
                label="contraseña"
                onToggle={() => setShowPassword((visible) => !visible)}
              />
            }
            trailingClassName="flex shrink-0 items-center"
            type={showPassword ? "text" : "password"}
            value={password}
          />
        </div>

        {/* Mensaje de error (anunciado por lectores de pantalla) */}
        {errorMessage && (
          <p
            className="mt-4 min-h-5 text-center text-sm font-semibold text-[#b42318]"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {/* Enlace para abrir la recuperación de contraseña */}
        <div className="mt-[17px] mb-[38px] flex justify-end max-[700px]:mb-7">
          <button
            className="inline-flex items-center gap-[9px] border-0 bg-transparent p-0 text-[15px] font-semibold text-[#258dc3] hover:text-[#126b9b] hover:underline hover:underline-offset-4"
            onClick={() => void recovery.open(email)}
            type="button"
          >
            <LockKeyhole aria-hidden="true" size={15} />
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {/* Botón de envío; se deshabilita si está bloqueado o enviando */}
        <Button
          className={loginPrimaryButtonClass}
          disabled={isLocked || isSubmitting}
          type="submit"
        >
          <span>{isSubmitting ? "Ingresando…" : "Iniciar sesión"}</span>
          <ArrowRight aria-hidden="true" size={22} strokeWidth={1.8} />
        </Button>
      </form>

      {/* Diálogo del flujo de recuperación de contraseña */}
      <RecoveryDialog flow={recovery} />
    </>
  )
}