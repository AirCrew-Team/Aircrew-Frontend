import { useId, useRef } from "react"

import { DeleteIcon, UploadIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Foto de perfil: imagen PNG, JPG o WEBP de hasta 2 MB.
const ACCEPTED_PHOTO = ".png,.jpg,.jpeg,.webp"
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

interface PhotoUploadControlsProps {
  // Hay una foto a la vista (la guardada o la elegida): habilita «Quitar».
  hasPhoto: boolean
  error: string | null
  onPhotoChange: (photo: File | null) => void
  onPhotoError: (message: string | null) => void
}

// Subir foto (la etiqueta funciona como botón) y quitarla, con la validación de formato y
// tamaño. La foto se guarda con «Guardar Cambios», junto con el resto del formulario.
const PhotoUploadControls = ({
  hasPhoto,
  error,
  onPhotoChange,
  onPhotoError,
}: PhotoUploadControlsProps) => {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Revisa la foto elegida: formato y tamaño.
  const onFileChange = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onPhotoError("Formato no válido. Sube una imagen PNG, JPG o WEBP.")
    } else if (file.size > MAX_PHOTO_BYTES) {
      onPhotoError("La foto supera los 2 MB.")
    } else {
      onPhotoError(null)
      onPhotoChange(file)
    }
    // Permite volver a elegir el mismo archivo después de quitarlo.
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 rounded-lg bg-muted p-2">
        <label
          className={cn(
            typography.labelMd,
            "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-card font-semibold text-brand-primary transition-colors hover:bg-brand-neutral has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary lg:min-h-9"
          )}
        >
          <UploadIcon aria-hidden="true" className="size-4" />
          Subir Foto
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_PHOTO}
            aria-describedby={error ? `${id}-photo-error` : undefined}
            className="sr-only"
            onChange={(event) => onFileChange(event.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          aria-label="Quitar foto de perfil"
          title="Quitar foto"
          disabled={!hasPhoto}
          onClick={() => {
            onPhotoError(null)
            onPhotoChange(null)
          }}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-card text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 lg:size-9"
        >
          <DeleteIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
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
