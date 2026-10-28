import { useState } from "react"
import { toast } from "sonner"
import { authService } from "./authService"
import type { MaskedContacts } from "./types"

// Pasos del flujo de recuperación
export type RecoveryStep = "identify" | "password"

type UseRecoveryFlowOptions = {
  /** Se ejecuta cuando la contraseña se cambió con éxito. */
  onRecovered: (email: string) => void
}

// Limpia y pasa a minúsculas el email
const normalize = (email: string) => email.trim().toLowerCase()

/**
 * Máquina de pasos de la recuperación de contraseña:
 * identificar → nueva contraseña.
 * Toda la comunicación con el backend pasa por `authService`.
 */
export function useRecoveryFlow({ onRecovered }: UseRecoveryFlowOptions) {
  // Estado del flujo (step null = diálogo cerrado)
  const [step, setStep] = useState<RecoveryStep | null>(null)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)

  // Paso 1: valida el correo y busca la cuenta antes de pedir la nueva contraseña
  async function submitEmail(rawEmail: string) {
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
      setError("No se reconoce ese usuario.")
      return
    }

    setStep("password")
  }

  /** Abre el flujo; si ya hay un correo escrito, salta el primer paso. */
  async function open(initialEmail = "") {
    // Reinicia los datos de un intento anterior
    setError("")
    setStep("identify")

    if (normalize(initialEmail)) {
      setEmail(initialEmail)
      await submitEmail(initialEmail)
    } else {
      setEmail("")
    }
  }

  // Cierra el diálogo
  function close() {
    setStep(null)
    setIsBusy(false)
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
    error,
    isBusy,
    open,
    close,
    submitEmail,
    savePassword,
  }
}

// Tipo del valor que devuelve el hook (lo usa RecoveryDialog)
export type RecoveryFlow = ReturnType<typeof useRecoveryFlow>