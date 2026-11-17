import type { InputHTMLAttributes, ReactNode } from "react"

// Props del input: hereda las nativas y añade label, icono, contenido final y clases por zona
type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Nombre accesible del campo (visible solo para lectores de pantalla). */
  label: string
  fieldClassName?: string
  icon?: ReactNode
  iconClassName?: string
  inputClassName?: string
  trailing?: ReactNode
  trailingClassName?: string
}

/** Input con icono y contenido final opcionales; el consumidor define el estilo. */
export function InputField({
  label,
  fieldClassName,
  icon,
  iconClassName,
  inputClassName,
  trailing,
  trailingClassName,
  ...props
}: InputFieldProps) {
  return (
    // Contenedor: al ser <label>, hacer clic en él enfoca el input
    <label className={fieldClassName}>
      {/* Texto solo para lectores de pantalla */}
      <span className="sr-only">{label}</span>
      {/* Icono inicial (opcional) */}
      {icon && (
        <span aria-hidden="true" className={iconClassName}>
          {icon}
        </span>
      )}
      {/* Input: recibe el resto de props nativas */}
      <input className={inputClassName} {...props} />
      {/* Contenido final (opcional), ej. botón de mostrar contraseña */}
      {trailing && <span className={trailingClassName}>{trailing}</span>}
    </label>
  )
}