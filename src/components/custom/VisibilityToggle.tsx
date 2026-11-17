import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/custom/Button"

// Props: estado actual, nombre del campo para el aria-label y callback al pulsar
type VisibilityToggleProps = {
  className?: string
  iconSize?: number
  isVisible: boolean
  /** Nombre del campo, p. ej. "contraseña" → "Mostrar contraseña". */
  label: string
  onToggle: () => void
}

/** Botón para mostrar u ocultar el contenido de un campo de contraseña. */
export function VisibilityToggle({
  className,
  iconSize = 20,
  isVisible,
  label,
  onToggle,
}: VisibilityToggleProps) {
  // Ojo tachado si el contenido está visible, ojo normal si está oculto
  const Icon = isVisible ? EyeOff : Eye

  return (
    // Botón de solo ícono; aria-label y aria-pressed informan a lectores de pantalla
    <Button
      aria-label={`${isVisible ? "Ocultar" : "Mostrar"} ${label}`}
      aria-pressed={isVisible}
      className={className}
      onClick={onToggle}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" size={iconSize} />
    </Button>
  )
}