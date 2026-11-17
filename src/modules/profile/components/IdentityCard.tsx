import { useEffect, useId, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import type { AuthUser } from "@/App/types/auth.types"
import {
  ClockIcon,
  CommuteIcon,
  DepartureIcon,
  FlightIcon,
  LogbookIcon,
  RadioChannelIcon,
  SupervisorIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import {
  getCrewProfile,
  getSupervisorProfile,
  getUserProfile,
} from "@/modules/profile/data/profile.data"
import PhotoUploadControls from "@/modules/shared/photo/PhotoUploadControls"

interface IdentityCardProps {
  user: AuthUser
  isCrew: boolean
  // Foto elegida: un archivo nuevo, null (quitada) o undefined (la guardada).
  photo: File | null | undefined
  photoError: string | null
  onPhotoChange: (photo: File | null) => void
  onPhotoError: (message: string | null) => void
}

// Mismo criterio que el navbar: iniciales de las dos primeras palabras del nombre.
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

// I1 (común): identidad desde el store; estado y foto desde el perfil. La foto se sube o se
// quita aquí y se guarda con «Guardar Cambios». Debajo, la lista rápida de cada rol: datos
// de vuelo (tripulante) o base y turno (supervisor).
const IdentityCard = ({
  user,
  isCrew,
  photo,
  photoError,
  onPhotoChange,
  onPhotoError,
}: IdentityCardProps) => {
  const nameId = useId()
  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: () => getUserProfile(user.id),
  })
  const crew = useQuery({
    queryKey: ["profile", "crew", user.id],
    queryFn: () => getCrewProfile(user.id),
    enabled: isCrew,
  })
  const supervisor = useQuery({
    queryKey: ["profile", "supervisor", user.id],
    queryFn: () => getSupervisorProfile(user.id),
    enabled: !isCrew,
  })

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
  const shownPhoto = photo === undefined ? profile.data?.photoUrl : previewUrl

  // Estado de la lista rápida del rol.
  const { isPending, isError } = isCrew ? crew : supervisor

  const crewStats = crew.data
    ? [
        {
          label: "Base Principal",
          value: crew.data.quickStats.base,
          Icon: DepartureIcon,
        },
        {
          label: "Flota Asignada",
          value: crew.data.quickStats.fleet,
          Icon: FlightIcon,
        },
        {
          label: "Horas de Vuelo Totales",
          value: crew.data.quickStats.totalHours,
          Icon: LogbookIcon,
        },
        {
          label: "Traslado a Base",
          value: crew.data.quickStats.commute,
          Icon: CommuteIcon,
        },
      ]
    : []

  const supervisorStats = supervisor.data
    ? [
        {
          label: "Base Asignada",
          value: supervisor.data.quickStats.base,
          Icon: DepartureIcon,
        },
        {
          label: "Turno",
          value: supervisor.data.quickStats.shift,
          Icon: ClockIcon,
        },
        {
          label: "Área",
          value: supervisor.data.quickStats.area,
          Icon: SupervisorIcon,
        },
        {
          label: "Canal OCC",
          value: supervisor.data.quickStats.occChannel,
          Icon: RadioChannelIcon,
        },
      ]
    : []

  const quickStats = isCrew ? crewStats : supervisorStats

  return (
    <section
      aria-labelledby={nameId}
      className="flex flex-col items-center gap-4 rounded-xl border border-brand-border/70 bg-card p-4 text-center shadow-sm sm:p-6"
    >
      <div className="relative">
        {shownPhoto ? (
          <img
            src={shownPhoto}
            alt={`Foto de perfil de ${user.fullName}`}
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
        {crew.data ? (
          <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm ring-2 ring-card forced-colors:border">
            <FlightIcon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>

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
          {user.position}
        </p>
        {profile.isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "text-muted-foreground")}
          >
            Cargando perfil…
          </p>
        ) : profile.isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            No se pudo cargar el perfil.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-1 pt-1.5">
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
              {profile.data.status} • ID: {profile.data.employeeCode}
            </p>
            {crew.data ? (
              <p
                className={cn(
                  typography.labelSm,
                  "rounded-full bg-brand-neutral px-2 py-0.5 text-muted-foreground uppercase"
                )}
              >
                {crew.data.category}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Ancho completo y texto a la izquierda, como los controles del admin. */}
      <div className="w-full text-left">
        <PhotoUploadControls
          hasPhoto={Boolean(shownPhoto)}
          error={photoError}
          onPhotoChange={onPhotoChange}
          onPhotoError={onPhotoError}
        />
      </div>

      <div className="w-full border-t border-brand-border/70 pt-4 text-left">
        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "text-muted-foreground")}
          >
            {isCrew ? "Cargando datos de vuelo…" : "Cargando datos del turno…"}
          </p>
        ) : isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            {isCrew
              ? "No se pudieron cargar los datos de vuelo."
              : "No se pudieron cargar los datos del turno."}
          </p>
        ) : (
          <dl className="flex flex-col gap-2">
            {quickStats.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="group flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5 py-1"
              >
                <dt
                  className={cn(
                    typography.bodySm,
                    "flex items-center gap-1.5 text-muted-foreground"
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand-secondary"
                  />
                  {label}
                </dt>
                {/* ml-auto: si salta de línea sigue alineado a la derecha. El último (traslado o canal) va en azul, como la referencia. */}
                <dd
                  className={cn(
                    typography.labelMd,
                    "ml-auto text-right font-semibold text-brand-primary group-last:font-bold group-last:text-brand-secondary"
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

export default IdentityCard
