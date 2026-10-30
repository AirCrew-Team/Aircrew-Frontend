import { useState, type FormEvent } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/custom/Button"
import { PasswordField } from "@/components/custom/PasswordField"
import {
  PASSWORD_RULES,
  isPasswordValid,
} from "@/components/custom/passwordRules"

// Props del formulario: onSave guarda la contraseña y onSuccess avisa al padre
type PasswordChangeFormProps = {
  /** Guarda la contraseña. Devuelve un mensaje de error o null si todo salió bien. */
  onSave: (newPassword: string) => Promise<string | null>
  onSuccess: () => void
}

/** Campos, reglas y visibilidad de contraseña reutilizables en los flujos de cambio. */
export function PasswordChangeForm({
  onSave,
  onSuccess,
}: PasswordChangeFormProps) {
  // Estado de los campos, el error visible y el guardado en curso
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Indica si la nueva contraseña cumple todas las reglas
  const requirementsMet = isPasswordValid(newPassword)

  // Valida los campos, guarda la contraseña y notifica el resultado
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Evita envíos duplicados mientras se guarda
    if (isSaving) return

    if (!requirementsMet) {
      setError("La contraseña todavía no cumple todos los requisitos.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsSaving(true)
    const saveError = await onSave(newPassword)
    setIsSaving(false)

    // Si el guardado falló, muestra el error y se detiene
    if (saveError) {
      setError(saveError)
      return
    }

    setError("")
    onSuccess()
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      {/* Nueva contraseña (limpia el error al escribir) */}
      <PasswordField
        autoComplete="new-password"
        label="Nueva contraseña"
        onChange={(event) => {
          setNewPassword(event.target.value)
          setError("")
        }}
        required
        value={newPassword}
      />

      {/* Lista de requisitos: solo aparece mientras se escribe y no se cumplen todos */}
      {newPassword.length > 0 && !requirementsMet && (
        <ul
          aria-label="Requisitos de contraseña"
          className="-mt-2 mb-0 grid list-none gap-1 rounded-lg bg-[#f0f5f9] p-3 text-xs"
        >
          {PASSWORD_RULES.map((rule) => {
            const isSatisfied = rule.test(newPassword)
            return (
              // Verde si la regla se cumple, gris si está pendiente
              <li
                className={`flex items-center gap-2 ${
                  isSatisfied ? "text-[#177245]" : "text-[#8192a8]"
                }`}
                key={rule.label}
              >
                <Check
                  aria-hidden="true"
                  className={isSatisfied ? "opacity-100" : "opacity-30"}
                  size={14}
                />
                {rule.label}
                {/* Estado para lectores de pantalla */}
                <span className="sr-only">
                  {isSatisfied ? " (cumplido)" : " (pendiente)"}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Confirmación de contraseña */}
      <PasswordField
        autoComplete="new-password"
        label="Confirmar contraseña"
        onChange={(event) => {
          setConfirmPassword(event.target.value)
          setError("")
        }}
        required
        toggleLabel="confirmación de contraseña"
        value={confirmPassword}
      />

      {/* Mensaje de error (anunciado por lectores de pantalla) */}
      {error && (
        <p className="m-0 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      )}

      {/* Botón de envío; se deshabilita mientras guarda */}
      <Button
        className="h-11 w-full rounded-full bg-[#07436a] text-white hover:bg-[#083d61]"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  )
}