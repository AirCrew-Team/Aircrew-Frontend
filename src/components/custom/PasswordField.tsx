import { useId, useState, type InputHTMLAttributes } from "react"
import { VisibilityToggle } from "@/components/custom/VisibilityToggle"

// Props: hereda las del input (sin id ni type, que se controlan aquí) y añade label y toggleLabel
type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  label: string
  /** Texto del aria-label del botón de visibilidad. Por defecto, el label en minúsculas. */
  toggleLabel?: string
}

/** Campo de contraseña con etiqueta visible y botón mostrar/ocultar. */
export function PasswordField({
  label,
  toggleLabel,
  ...props
}: PasswordFieldProps) {
  // ID único para enlazar la etiqueta con el input
  const inputId = useId()
  // Controla si la contraseña se muestra en texto plano
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="grid gap-2">
      {/* Etiqueta visible */}
      <label className="text-sm font-semibold" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        {/* Input: alterna entre "text" y "password" según isVisible */}
        <input
          className="h-12 w-full rounded-lg border border-[#d8e2ee] bg-white px-3 pr-12 text-base font-normal outline-none focus:border-[#4aa5d4] focus:ring-4 focus:ring-[#4aa5d4]/15"
          id={inputId}
          type={isVisible ? "text" : "password"}
          {...props}
        />
        {/* Botón mostrar/ocultar, posicionado dentro del input a la derecha */}
        <VisibilityToggle
          className="absolute top-1/2 right-1 size-10 -translate-y-1/2 text-[#315775]"
          isVisible={isVisible}
          label={toggleLabel ?? label.toLowerCase()}
          onToggle={() => setIsVisible((visible) => !visible)}
        />
      </div>
    </div>
  )
}