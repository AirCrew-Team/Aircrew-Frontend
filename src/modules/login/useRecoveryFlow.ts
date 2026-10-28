import { useState } from "react"
import { toast } from "sonner"
import { authService } from "./authService"
import type { MaskedContacts, RecoveryChannel } from "./types"

// Pasos del flujo de recuperación
export type RecoveryStep = "identify" | "channel" | "code" | "password"

type UseRecoveryFlowOptions = {
  /** Se ejecuta cuando la contraseña se cambió con éxito. */
  onRecovered: (email: string) => void
}

// Limpia y pasa a minúsculas el email
const normalize = (email: string) => email.trim().toLowerCase()

/**
 * La recuperación voluntaria pasa de identificar a nueva contraseña.
 * Tras tres intentos fallidos, exige validar un código antes de continuar.
 * Toda la comunicación con el backend pasa por `authService`.
 */
export function useRecoveryFlow({ onRecovered }: UseRecoveryFlowOptions) {
  // Estado del flujo (step null = diálogo cerrado)
  const [step, setStep] = useState<RecoveryStep | null>(null)
  const [email, setEmail] = useState("")
  const [contacts, setContacts] = useState<MaskedContacts | null>(null)
  const [channel, setChannel] = useState<RecoveryChannel | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [requiresVerification, setRequiresVerification] = useState(false)

  // Paso 1: valida el correo y busca la cuenta antes de pedir la nueva contraseña
  async function submitEmail(
    rawEmail: string,
    verifyBeforePassword = requiresVerification
  ) {
    const nextEmail = normalize(rawEmail)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("Ingresa un correo válido para continuar.")
      return
    }

    setIsBusy(true)
    setEmail(nextEmail)
    setError("")
    const recoveryContacts = await authService.getRecoveryContacts(nextEmail)
    setIsBusy(false)

    if (!recoveryContacts) {
      setContacts(null)
      setError("No se reconoce ese usuario.")
      return
    }

    setContacts(recoveryContacts)
    setCode("")
    setStep(verifyBeforePassword ? "channel" : "password")
  }

  /** Abre el flujo; si ya hay un correo escrito, salta el primer paso. */
  async function open(initialEmail = "", verifyBeforePassword = false) {
    // Reinicia los datos de un intento anterior
    setError("")
    setCode("")
    setChannel(null)
    setContacts(null)
    setRequiresVerification(verifyBeforePassword)
    setStep("identify")

    if (normalize(initialEmail)) {
      setEmail(initialEmail)
      await submitEmail(initialEmail, verifyBeforePassword)
    } else {
      setEmail("")
    }
  }

  // Cierra el diálogo
  function close() {
    setStep(null)
    setIsBusy(false)
  }

  async function selectChannel(nextChannel: RecoveryChannel) {
    setIsBusy(true)
    setError("")
    await authService.requestRecoveryCode(email, nextChannel)
    setChannel(nextChannel)
    setCode("")
    setIsBusy(false)
    setStep("code")
  }

  // Verifica el código solo en el flujo de tres intentos fallidos.
  async function submitCode() {
    setIsBusy(true)
    setError("")
    const isValid = await authService.verifyRecoveryCode(email, code)
    setIsBusy(false)

    if (!isValid) {
      setError("El código ingresado no es válido.")
      return
    }

    setCode("")
    setError("")
    setStep("password")
  }

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6))
    setError("")
  }

  /** Devuelve un mensaje de error o null, como espera PasswordChangeForm. */
  async function savePassword(newPassword: string): Promise<string | null> {
    try {
      await authService.resetPassword(email, newPassword)
    } catch {
      return "No pudimos cambiar la contraseña. Inténtalo de nuevo."
    }

    // Éxito: avisa con un toast y notifica al padre
    toast.success("Cambio de contraseña exitoso", {
      description: "Ahora puedes ingresar con tu nueva contraseña.",
    })
    onRecovered(email)
    return null
  }

  // Estado y acciones que usa el diálogo de recuperación
  return {
    step,
    email,
    contacts,
    channel,
    code,
    error,
    isBusy,
    open,
    close,
    submitEmail,
    selectChannel,
    submitCode,
    updateCode,
    savePassword,
  }
}

// Tipo del valor que devuelve el hook (lo usa RecoveryDialog)
export type RecoveryFlow = ReturnType<typeof useRecoveryFlow>