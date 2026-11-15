import { useEffect, useId, useMemo, useRef } from "react"

import {
  CameraIcon,
  CertificationIcon,
  DeleteIcon,
  DepartureIcon,
  UploadIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { OperatorProfile } from "@/modules/operatorProfile/types/operatorProfile.types"

// Foto de perfil: imagen PNG, JPG o WEBP de hasta 2 MB.
const ACCEPTED_PHOTO = ".png,.jpg,.jpeg,.webp"
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

// «Admin AirCrew» → «AA»: iniciales cuando no hay foto.
const initialsOf = (fullName: string) =>
  fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

interface OperatorProfileCardProps {
  profile: OperatorProfile
  // Nombre que se está editando: la tarjeta lo muestra en vivo.
  fullName: string
  // Foto elegida: un archivo nuevo, null (quitada) o undefined (la que había).
  photo: File | null | undefined
  photoError: string | null
  onPhotoChange: (photo: File | null) => void
  onPhotoError: (message: string | null) => void
}

// Tarjeta del perfil: foto (subir o quitar), nombre, etiqueta del cargo, rol y nivel,
// y los datos de solo lectura (ID operativo, base central y estado de la cuenta).
// La foto se guarda con «Guardar Cambios», junto con el resto del formulario.
const OperatorProfileCard = ({
  profile,
  fullName,
  photo,
  photoError,
  onPhotoChange,
  onPhotoError,
}: OperatorProfileCardProps) => {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Vista previa de la foto nueva desde la memoria del navegador. Se libera al cambiarla
  // o al salir, para no dejar la imagen ocupando memoria.
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
  const shownPhoto = photo === undefined ? profile.photoUrl : previewUrl

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

  const facts = [
    { label: "ID Operativo", value: profile.employeeCode },
    { label: "Base Central", value: profile.base, icon: DepartureIcon },
  ]

  return (
    <section
      aria-label="Perfil"
      className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {/* Foto o iniciales, con el ícono de cámara decorativo como en la referencia. */}
        <div className="relative">
          {shownPhoto ? (
            <img
              src={shownPhoto}
              alt={`Foto de perfil de ${fullName}`}
              className="size-24 rounded-xl border-2 border-brand-secondary object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                typography.headlineLg,
                "flex size-24 items-center justify-center rounded-xl bg-brand-secondary font-bold text-white"
              )}
            >
              {initialsOf(fullName)}
            </span>
          )}
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-md bg-brand-primary text-white"
          >
            <CameraIcon className="size-4" />
          </span>
        </div>
        <p
          className={cn(
            typography.headlineSm,
            "font-bold break-words text-brand-primary"
          )}
        >
          {fullName}
        </p>
        <p
          className={cn(
            typography.labelSm,
            "flex items-center gap-1.5 rounded-full bg-brand-primary px-2.5 py-1 text-white uppercase"
          )}
        >
          <CertificationIcon aria-hidden="true" className="size-3.5" />
          {profile.roleBadge}
        </p>
        <p
          className={cn(typography.bodySm, "font-medium text-brand-secondary")}
        >
          {profile.roleLine}
        </p>
      </div>

      {/* Subir foto (la etiqueta funciona como botón) y quitarla. */}
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
              aria-describedby={photoError ? `${id}-photo-error` : undefined}
              className="sr-only"
              onChange={(event) => onFileChange(event.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            aria-label="Quitar foto de perfil"
            title="Quitar foto"
            disabled={!shownPhoto}
            onClick={() => {
              onPhotoError(null)
              onPhotoChange(null)
            }}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-card text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-40 lg:size-9"
          >
            <DeleteIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        {photoError ? (
          <p
            id={`${id}-photo-error`}
            role="alert"
            className={cn(typography.bodySm, "text-destructive")}
          >
            {photoError}
          </p>
        ) : null}
      </div>

      {/* Datos de solo lectura de la cuenta. */}
      <dl className="flex flex-col gap-2">
        {facts.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2.5"
          >
            <dt className={cn(typography.bodySm, "text-muted-foreground")}>
              {label}
            </dt>
            <dd
              className={cn(
                typography.labelMd,
                "flex items-center gap-1.5 font-bold text-brand-primary"
              )}
            >
              {Icon ? (
                <Icon aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
              {value}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2.5">
          <dt className={cn(typography.bodySm, "text-muted-foreground")}>
            Estado de Cuenta
          </dt>
          <dd
            className={cn(
              typography.labelSm,
              "flex items-center gap-1.5 rounded-full bg-brand-border px-2.5 py-1 text-brand-primary uppercase"
            )}
          >
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-brand-secondary"
            />
            {profile.accountStatus}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export default OperatorProfileCard
