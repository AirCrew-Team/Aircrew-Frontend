import { useEffect, useId, useRef } from "react"

import { DeleteIcon, UploadIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Foto de perfil: imagen PNG, JPG o WEBP de hasta 2 MB.
const ACCEPTED_PHOTO = ".png,.jpg,.jpeg,.webp"
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

interface PhotoUploadControlsProps {
  // Hay una foto guardada: aparece «Quitar foto».
  hasPhoto: boolean
  error: string | null
  // Cuentas demo: los controles van deshabilitados de forma nativa.
  disabled: boolean
  // Acción en curso: los controles quedan con aria-disabled (conservan el foco) y no
  // repiten la petición.
  pending: "upload" | "remove" | null
  // Un archivo válido para subir, o null para quitar la foto.
  onPhotoChange: (photo: File | null) => void
  onPhotoError: (message: string | null) => void
}

// Subir foto (la etiqueta funciona como botón) y quitarla, con la validación de formato y
// tamaño antes de enviar nada. Cada acción se guarda al momento, aparte del formulario.
const PhotoUploadControls = ({
  hasPhoto,
  error,
  disabled,
  pending,
  onPhotoChange,
  onPhotoError,
}: PhotoUploadControlsProps) => {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  // Al quitar la foto, «Quitar foto» desaparece: el foco pasa a «Subir foto».
  const focusUploadRef = useRef(false)
  const busy = pending !== null

  useEffect(() => {
    if (!hasPhoto && focusUploadRef.current) {
      focusUploadRef.current = false
      inputRef.current?.focus()
    }
  }, [hasPhoto])

  // Revisa la foto elegida: formato y tamaño.
  const onFileChange = (file: File | undefined) => {
    if (file && !busy) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onPhotoError("Formato no admitido. Usa PNG, JPG o WEBP.")
      } else if (file.size > MAX_PHOTO_BYTES) {
        onPhotoError("La foto supera el máximo de 2 MB.")
      } else {
        onPhotoError(null)
        onPhotoChange(file)
      }
    }
    // Permite volver a elegir el mismo archivo.
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 rounded-lg bg-muted p-2">
        <label
          className={cn(
            typography.labelMd,
            "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-card font-semibold text-brand-primary transition-colors hover:bg-brand-neutral has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:bg-card has-aria-disabled:cursor-not-allowed has-aria-disabled:opacity-60 has-aria-disabled:hover:bg-card motion-reduce:transition-none lg:min-h-9"
          )}
        >
          <UploadIcon aria-hidden="true" className="size-4" />
          Subir foto
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_PHOTO}
            disabled={disabled}
            aria-disabled={busy || undefined}
            aria-describedby={error ? `${id}-photo-error` : undefined}
            className="sr-only"
            // Mientras hay una acción en curso no se abre el selector de archivos.
            onClick={(event) => {
              if (busy) event.preventDefault()
            }}
            onChange={(event) => onFileChange(event.target.files?.[0])}
          />
        </label>
        {hasPhoto ? (
          <button
            type="button"
            disabled={disabled}
            aria-disabled={busy || undefined}
            onClick={() => {
              if (busy) return
              focusUploadRef.current = true
              onPhotoError(null)
              onPhotoChange(null)
            }}
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-card px-3 font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-card motion-reduce:transition-none lg:min-h-9"
            )}
          >
            <DeleteIcon aria-hidden="true" className="size-4" />
            Quitar foto
          </button>
        ) : null}
      </div>
      {pending === "upload" ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Subiendo foto…
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-photo-error`}
          role="alert"
          className={cn(typography.bodySm, "text-destructive")}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default PhotoUploadControls
