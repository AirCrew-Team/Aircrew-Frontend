import { useEffect, useMemo } from "react"

import { CameraIcon, CertificationIcon, DepartureIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { OperatorProfile } from "@/modules/operatorProfile/types/operatorProfile.types"
import PhotoUploadControls from "@/modules/shared/photo/PhotoUploadControls"

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

      <PhotoUploadControls
        hasPhoto={Boolean(shownPhoto)}
        error={photoError}
        onPhotoChange={onPhotoChange}
        onPhotoError={onPhotoError}
      />

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
