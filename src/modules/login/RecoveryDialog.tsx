import { useState, type FormEvent } from "react"
import { Button } from "@/components/custom/Button"
import { Dialog } from "@/components/custom/Dialog"
import { PasswordChangeForm } from "@/components/custom/PasswordChangeForm"
import { DEMO_RECOVERY_CODE } from "./authService"
import type { RecoveryChannel } from "./types"
import type { RecoveryFlow, RecoveryStep } from "./useRecoveryFlow"
import { dialogInputClass, dialogPrimaryButtonClass } from "./styles"

// Título y descripción del diálogo según el paso actual
const STEP_COPY: Record<RecoveryStep, { title: string; description: string }> =
  {
    identify: {
      title: "Recuperar contraseña",
      description: "Ingresa el correo asociado a tu cuenta.",
    },
    channel: {
      title: "Verifica tu identidad",
      description: "Elige dónde recibir el código de verificación.",
    },
    code: {
      title: "Verifica tu identidad",
      description: "Ingresa el código de verificación para continuar.",
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
      {flow.step === "channel" && <ChannelStep flow={flow} />}
      {flow.step === "code" && <CodeStep flow={flow} />}
      {flow.step === "password" && (
        <PasswordChangeForm
          onSave={flow.savePassword}
          onSuccess={flow.close}
        />
      )}
    </Dialog>
  )
}

function ChannelStep({ flow }: { flow: RecoveryFlow }) {
  const options: {
    channel: RecoveryChannel
    label: string
    hint: string
  }[] = [
    {
      channel: "email",
      label: "Correo electrónico",
      hint: flow.contacts?.email ?? "",
    },
    {
      channel: "sms",
      label: "Mensaje de texto (SMS)",
      hint: flow.contacts?.phone ?? "",
    },
  ]

  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          className="rounded-xl border border-[#d8e2ee] bg-white p-4 text-left hover:border-[#4aa5d4] disabled:opacity-60"
          disabled={flow.isBusy}
          key={option.channel}
          onClick={() => void flow.selectChannel(option.channel)}
          type="button"
        >
          <span className="block font-semibold">{option.label}</span>
          <span className="mt-1 block text-sm text-[#8192a8]">
            {option.hint}
          </span>
        </button>
      ))}
    </div>
  )
}

function CodeStep({ flow }: { flow: RecoveryFlow }) {
  const target =
    flow.channel === "sms"
      ? `el teléfono ${flow.contacts?.phone ?? ""}`
      : `el correo ${flow.contacts?.email ?? ""}`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void flow.submitCode()
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <p className="m-0 rounded-lg bg-[#e8f4fb] p-3 text-sm text-[#245475]">
        Ingresa el código de verificación enviado a {target}.
        {import.meta.env.DEV && (
          <>
            {" "}
            Código de prueba: <strong>{DEMO_RECOVERY_CODE}</strong>.
          </>
        )}
      </p>
      <label className="grid gap-2 text-sm font-semibold">
        Código de verificación
        <input
          autoComplete="one-time-code"
          autoFocus
          className={`${dialogInputClass} tracking-[.25em]`}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => flow.updateCode(event.target.value)}
          required
          value={flow.code}
        />
      </label>
      {flow.error && (
        <p className="m-0 text-sm text-[#b42318]" role="alert">
          {flow.error}
        </p>
      )}
      <Button
        className={`${dialogPrimaryButtonClass} justify-self-end`}
        disabled={flow.isBusy || flow.code.length < 6}
        type="submit"
      >
        Validar código
      </Button>
    </form>
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