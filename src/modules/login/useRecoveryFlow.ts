import { useRef, useState } from "react"

import {
  requestPasswordReset,
  TooManyRequestsError,
} from "@/App/actions/auth/auth.actions"

// Pasos del diálogo: pedir el correo y confirmar el envío del enlace
export type RecoveryStep = "email" | "sent"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const INVALID_EMAIL_MESSAGE = "Ingresa un correo válido para continuar."

// Limpia y pasa a minúsculas el email
const normalize = (email: string) => email.trim().toLowerCase()

/**
 * Recuperación de contraseña por enlace: pide el correo y envía el enlace con
 * `requestPasswordReset`. La contraseña se cambia en /restablecer-contrasena.
 */
export function useRecoveryFlow() {
  // Estado del flujo (step null = diálogo cerrado)
  const [step, setStep] = useState<RecoveryStep | null>(null)
  // Correo inicial del campo y, tras el envío, el correo al que se envió
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  // Aviso informativo del límite (429); nunca a la vez que `error`
  const [limitMessage, setLimitMessage] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  // Sube al abrir y al cerrar: la respuesta de un envío anterior ya no se aplica
  const sessionRef = useRef(0)

  /** Abre el diálogo en el paso del correo, sin enviar nada. */
  function open(initialEmail = "") {
    sessionRef.current += 1
    setEmail(initialEmail)
    setError("")
    setLimitMessage("")
    setIsBusy(false)
    setStep("email")
  }

  // Cierra el diálogo
  function close() {
    sessionRef.current += 1
    setStep(null)
  }

  // Valida el correo y pide el enlace
  async function submitEmail(rawEmail: string) {
    if (isBusy) return
    const nextEmail = normalize(rawEmail)
    setError("")
    setLimitMessage("")
    if (!EMAIL_PATTERN.test(nextEmail)) {
      setError(INVALID_EMAIL_MESSAGE)
      return
    }

    setIsBusy(true)
    const session = sessionRef.current
    try {
      await requestPasswordReset(nextEmail)
      // Diálogo cerrado (o reabierto) durante el envío: no se toca nada.
      if (session !== sessionRef.current) return
      setEmail(nextEmail)
      setStep("sent")
    } catch (requestError) {
      if (session !== sessionRef.current) return
      if (requestError instanceof TooManyRequestsError) {
        setLimitMessage(
          requestError.message ||
            "Hiciste demasiadas solicitudes. Intenta de nuevo más tarde."
        )
      } else {
        setError("No pudimos enviar el enlace. Intenta de nuevo.")
      }
    } finally {
      if (session === sessionRef.current) setIsBusy(false)
    }
  }

  // Estado y acciones que usa el diálogo de recuperación
  return { step, email, error, limitMessage, isBusy, open, close, submitEmail }
}

// Tipo del valor que devuelve el hook (lo usa RecoveryDialog)
export type RecoveryFlow = ReturnType<typeof useRecoveryFlow>
