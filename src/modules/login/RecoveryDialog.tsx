import { useState, type FormEvent } from "react"
import { Button } from "@/components/custom/Button"
import { Dialog } from "@/components/custom/Dialog"
import { PasswordChangeForm } from "@/components/custom/PasswordChangeForm"
import type { RecoveryFlow, RecoveryStep } from "./useRecoveryFlow"
import { dialogInputClass, dialogPrimaryButtonClass } from "./styles"

// Título y descripción del diálogo según el paso actual
const STEP_COPY: Record<RecoveryStep, { title: string; description: string }> =
  {
    identify: {
      title: "Recuperar contraseña",
      description: "Ingresa el correo asociado a tu cuenta.",
    },
    password: {
      title: "Crea una contraseña nueva",
      description: "Crea y confirma tu nueva contraseña.",
    },
  }

/** Diálogo de recuperación; todo el estado vive en `useRecoveryFlow`. */
export function RecoveryDialog({ flow }: { flow: RecoveryFlow }) {
  // Textos del paso actual (identify si el diálogo está cerrado)
  const copy = STEP_COPY[flow.step ?? "identify"]

  return (
    // Se abre cuando hay un paso activo
    <Dialog
      description={copy.description}
      isOpen={flow.step !== null}
      onClose={flow.close}
      title={copy.title}
    >
      {/* Solo se muestra el componente del paso actual */}
      {flow.step === "identify" && <IdentifyStep flow={flow} />}
      {flow.step === "password" && (
        <PasswordChangeForm
          onSave={flow.savePassword}
          onSuccess={flow.close}
        />
      )}
    </Dialog>
  )
}

// Paso 1: pide el correo de la cuenta
function IdentifyStep({ flow }: { flow: RecoveryFlow }) {
  const [email, setEmail] = useState(flow.email)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void flow.submitEmail(email)
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-semibold">
        Correo electrónico
        <input
          autoComplete="email"
          autoFocus
          className={dialogInputClass}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </label>
      {/* Mensaje de error del flujo */}
      {flow.error && (
        <p className="m-0 text-sm text-[#b42318]" role="alert">
          {flow.error}
        </p>
      )}
      <Button
        className={`${dialogPrimaryButtonClass} justify-self-end`}
        disabled={flow.isBusy}
        type="submit"
      >
        Continuar
      </Button>
    </form>
  )
}