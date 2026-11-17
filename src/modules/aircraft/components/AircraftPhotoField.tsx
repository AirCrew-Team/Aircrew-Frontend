import { useEffect, useId, useMemo, useRef, useState } from "react"

import { CameraIcon, UploadIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Foto de la aeronave: imagen PNG, JPG o WEBP de hasta 2 MB.
const ACCEPTED_FILES = ".png,.jpg,.jpeg,.webp"
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

interface AircraftPhotoFieldProps {
  // Foto guardada de la aeronave (al editar); null si no tiene.
  currentUrl: string | null
  // Foto elegida: un archivo nuevo o undefined (la que había).
  photo: File | undefined
  // Si se intentó registrar sin foto.
  missing: boolean
  onChange: (photo: File) => void
}

// Campo «Foto de la aeronave» (obligatoria): al registrar, un espacio vacío hasta que el
// usuario elige una foto; al editar, la foto actual. Luego se puede cambiar. La foto se
// guarda con el resto del formulario.
const AircraftPhotoField = ({
  currentUrl,
  photo,
  missing,
  onChange,
}: AircraftPhotoFieldProps) => {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  // Vista previa de la foto nueva desde la memoria del navegador (como en
  // Configuración). Se libera al cambiarla o al cerrar, para no ocupar memoria.
  const previewUrl = useMemo(
    () =>
      photo && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(photo)
        : null,
    [photo]
  )
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  // Foto que se ve: la nueva o la que ya tenía.
  const shownUrl = photo === undefined ? currentUrl : previewUrl
  // Mensaje bajo el campo: formato/tamaño no válido, o que falta la foto.
  const message = error ?? (missing ? "Sube la foto de la aeronave." : null)

  // Revisa la foto elegida: formato y tamaño. Si no sirve, no se usa y se avisa.
  const onFileChange = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no válido. Sube una imagen PNG, JPG o WEBP.")
    } else if (file.size > MAX_PHOTO_BYTES) {
      setError("La foto supera los 2 MB.")
    } else {
      setError(null)
      onChange(file)
    }
    // Permite volver a elegir el mismo archivo después de quitarlo.
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    // Celular: foto arriba y botones abajo. Desde sm: lado a lado.
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {shownUrl ? (
        <img
          src={shownUrl}
          alt="Foto de la aeronave"
          className="aspect-video w-full rounded-md object-cover sm:w-44"
        />
      ) : (
        // Espacio vacío: todavía no hay foto elegida.
        <div
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed bg-muted text-muted-foreground sm:w-44",
            message ? "border-destructive" : "border-brand-border"
          )}
        >
          <CameraIcon aria-hidden="true" className="size-6" />
          <span className={typography.labelSm}>Sin foto</span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {/* La etiqueta funciona como botón: abre el selector de archivos. */}
          <label
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-brand-border bg-card px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary lg:min-h-9"
            )}
          >
            <UploadIcon aria-hidden="true" className="size-4" />
            {shownUrl ? "Cambiar foto" : "Subir foto"}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_FILES}
              aria-required="true"
              aria-invalid={message ? true : undefined}
              aria-describedby={[`${id}-hint`, message && `${id}-error`]
                .filter(Boolean)
                .join(" ")}
              className="sr-only"
              onChange={(event) => onFileChange(event.target.files?.[0])}
            />
          </label>
        </div>
        <p
          id={`${id}-hint`}
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          PNG, JPG o WEBP de hasta 2 MB.
        </p>
        {message ? (
          <p
            id={`${id}-error`}
            role="alert"
            className={cn(typography.bodySm, "text-destructive")}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default AircraftPhotoField
