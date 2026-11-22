import { useId, useState, type FormEvent } from "react"

import { InfoIcon } from "@/App/utils/icons"
import { Button } from "@/components/custom/Button"
import { Dialog } from "@/components/custom/Dialog"
import {
  dialogInputClass,
  dialogPrimaryButtonClass,
  infoNoticeClass,
} from "@/modules/shared/auth/styles"

import { INVALID_EMAIL_MESSAGE, type RecoveryFlow } from "./useRecoveryFlow"

/** Diálogo de recuperación en dos pasos; todo el estado vive en `useRecoveryFlow`. */
export function RecoveryDialog({ flow }: { flow: RecoveryFlow }) {
  const isSent = flow.step === "sent"

  return (
    // Se abre cuando hay un paso activo
    <Dialog
      description={
        isSent
          ? undefined
          : "Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
      }
      isOpen={flow.step !== null}
      onClose={flow.close}
      title={isSent ? "Revisa tu correo" : "Recuperar contraseña"}
    >
      {isSent ? <SentStep flow={flow} /> : <EmailStep flow={flow} />}
    </Dialog>
  )
}

// Paso 1: pide el correo de la cuenta
function EmailStep({ flow }: { flow: RecoveryFlow }) {
  const [email, setEmail] = useState(flow.email)
  const errorId = useId()
  const limitId = useId()
  // El campo se describe con el aviso del límite y con el error, si los hay
  const describedBy =
    [flow.limitMessage && limitId, flow.error && errorId]
      .filter(Boolean)
      .join(" ") || undefined

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void flow.submitEmail(email)
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-semibold">
        Correo electrónico
        <input
          aria-describedby={describedBy}
          aria-invalid={flow.error === INVALID_EMAIL_MESSAGE ? true : undefined}
          autoComplete="email"
          autoFocus
          className={dialogInputClass}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </label>
      {/* Límite (429): aviso informativo, nunca a la vez que el error */}
      {flow.limitMessage && (
        <p className={infoNoticeClass} id={limitId} role="status">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {flow.limitMessage}
        </p>
      )}
      {flow.error && (
        <p className="m-0 text-sm text-[#b42318]" id={errorId} role="alert">
          {flow.error}
        </p>
      )}
      <Button
        className={`${dialogPrimaryButtonClass} justify-self-end`}
        disabled={flow.isBusy}
        type="submit"
      >
        {flow.isBusy ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  )
}

// Paso 2: confirma el envío. Estado persistente: sin toast ni región viva.
function SentStep({ flow }: { flow: RecoveryFlow }) {
  const messageId = useId()

  return (
    <div className="grid gap-6">
      <p
        className="m-0 text-[15px] leading-relaxed text-[#245475]"
        id={messageId}
      >
        Si <strong className="font-semibold">{flow.email}</strong> corresponde a
        una cuenta activa, te enviamos un enlace para crear una contraseña
        nueva. Vence en 10 minutos. Revisa también la carpeta de spam.
      </p>
      {/* El foco pasa aquí al desaparecer el formulario; la descripción lee el aviso */}
      <Button
        aria-describedby={messageId}
        autoFocus
        className={`${dialogPrimaryButtonClass} justify-self-end`}
        onClick={flow.close}
        type="button"
      >
        Entendido
      </Button>
    </div>
  )
}
