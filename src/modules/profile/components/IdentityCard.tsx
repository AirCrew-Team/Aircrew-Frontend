import { useId, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  deleteMyPhoto,
  myPhotoUrl,
  myProfileQueryKey,
  uploadMyPhoto,
} from "@/App/actions/profile/profile.actions"
import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"
import type { MyProfile } from "@/App/types/profile.types"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import PhotoUploadControls from "@/modules/shared/photo/PhotoUploadControls"

const ROLE_LABELS: Record<Role, string> = {
  [ROLES.TRIPULANTE]: "Tripulante",
  [ROLES.SUPER_VISOR]: "Supervisor",
  [ROLES.SUPER_ADMIN]: "Administrador",
}

// Mismo criterio que el navbar: iniciales de las dos primeras palabras del nombre.
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

const formatMonthYear = (iso: string) =>
  new Intl.DateTimeFormat("es-US", { month: "long", year: "numeric" }).format(
    new Date(iso)
  )

interface IdentityCardProps {
  user: AuthUser
  // null en las cuentas demo: solo el nombre y el rol del store.
  profile: MyProfile | null
  // Cargo del tripulante, de crew (no del store).
  crewPosition: string | undefined
}

// Tarjeta de identidad (común): foto real o iniciales, nombre y rol del store, cargo del
// tripulante, estado y fecha de alta. La foto se sube y se quita al momento.
const IdentityCard = ({ user, profile, crewPosition }: IdentityCardProps) => {
  const nameId = useId()
  const queryClient = useQueryClient()
  const isDemo = profile === null
  const [photoError, setPhotoError] = useState<string | null>(null)
  // URL que no se pudo cargar: vuelven las iniciales hasta que haya otra versión.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)

  const photoMutation = useMutation({
    mutationFn: async (file: File | null) => {
      if (file) return (await uploadMyPhoto(file)).photo_updated_at
      await deleteMyPhoto()
      return null
    },
    onSuccess: (photoUpdatedAt, file) => {
      queryClient.setQueryData<MyProfile>(
        myProfileQueryKey(user.id),
        (old) => old && { ...old, photo_updated_at: photoUpdatedAt }
      )
      toast.success(file ? "Foto actualizada." : "Foto eliminada.")
    },
  })

  const savedPhoto = profile?.photo_updated_at
    ? myPhotoUrl(profile.photo_updated_at)
    : null
  const shownPhoto = savedPhoto !== brokenSrc ? savedPhoto : null

  const error =
    photoError ??
    (photoMutation.isError
      ? photoMutation.variables
        ? "No se pudo subir la foto. Intenta de nuevo."
        : "No se pudo quitar la foto. Intenta de nuevo."
      : null)

  return (
    <section
      aria-labelledby={nameId}
      className="flex flex-col items-center gap-4 rounded-xl border border-brand-border/70 bg-card p-4 text-center shadow-sm sm:p-6"
    >
      {shownPhoto ? (
        <img
          src={shownPhoto}
          alt={`Foto de perfil de ${user.fullName}`}
          onError={() => setBrokenSrc(shownPhoto)}
          className="size-28 rounded-xl object-cover shadow-md"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            typography.headlineLg,
            "flex size-28 items-center justify-center rounded-xl bg-brand-secondary font-bold text-white shadow-md forced-colors:border"
          )}
        >
          {getInitials(user.fullName)}
        </span>
      )}

      <div className="flex min-w-0 flex-col items-center gap-0.5">
        <h2
          id={nameId}
          className={cn(
            typography.headlineSm,
            "font-bold wrap-break-word text-brand-primary"
          )}
        >
          {user.fullName}
        </h2>
        <p className={cn(typography.labelLg, "text-brand-secondary")}>
          {ROLE_LABELS[user.role]}
        </p>
        {crewPosition ? (
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            {crewPosition}
          </p>
        ) : null}
      </div>

      {profile ? (
        <div className="flex flex-col items-center gap-1.5">
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-1 rounded-full bg-brand-border px-2 py-0.5 tracking-wide text-brand-primary uppercase"
            )}
          >
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-brand-secondary"
            />
            {profile.is_active ? "Cuenta activa" : "Cuenta inactiva"}
          </p>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            En AirCrew desde {formatMonthYear(profile.created_at)}
          </p>
        </div>
      ) : null}

      {/* Ancho completo y texto a la izquierda. */}
      <div className="w-full text-left">
        <PhotoUploadControls
          hasPhoto={Boolean(savedPhoto)}
          error={error}
          disabled={isDemo}
          pending={
            photoMutation.isPending
              ? photoMutation.variables
                ? "upload"
                : "remove"
              : null
          }
          onPhotoChange={(file) => photoMutation.mutate(file)}
          onPhotoError={setPhotoError}
        />
      </div>
    </section>
  )
}

export default IdentityCard
