import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import type { AuthUser } from "@/App/types/auth.types"
import {
  CameraIcon,
  CommuteIcon,
  DepartureIcon,
  FlightIcon,
  LogbookIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import {
  getCrewProfile,
  getUserProfile,
} from "@/modules/profile/data/profile.data"

interface IdentityCardProps {
  user: AuthUser
  isCrew: boolean
}

// Mismo criterio que el navbar: iniciales de las dos primeras palabras del nombre.
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

// I1 (común): identidad desde el store y estado desde el perfil. I2 (tripulante): datos de vuelo.
const IdentityCard = ({ user, isCrew }: IdentityCardProps) => {
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

  const quickStats = crew.data
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

  return (
    <section
      aria-labelledby={nameId}
      className="flex flex-col items-center gap-4 rounded-xl border border-brand-border/70 bg-card p-4 text-center shadow-sm sm:p-6"
    >
      <div className="relative">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
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

      <button
        type="button"
        aria-disabled="true"
        aria-label="Actualizar Foto, próximamente"
        className={cn(
          typography.labelMd,
          "inline-flex min-h-11 w-full cursor-not-allowed items-center justify-between gap-2 rounded-md border border-transparent bg-muted px-4 py-2.5 font-semibold text-muted-foreground/80 shadow-xs focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden lg:min-h-9"
        )}
      >
        <span className="flex items-center gap-1.5">
          <CameraIcon aria-hidden="true" className="size-4.5 shrink-0" />
          Actualizar Foto
        </span>
        <span className="font-medium">Próximamente</span>
      </button>

      {isCrew ? (
        <div className="w-full border-t border-brand-border/70 pt-4 text-left">
          {crew.isPending ? (
            <p
              role="status"
              className={cn(typography.bodySm, "text-muted-foreground")}
            >
              Cargando datos de vuelo…
            </p>
          ) : crew.isError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudieron cargar los datos de vuelo.
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
                  {/* ml-auto: si salta de línea sigue alineado a la derecha. El último (traslado) va en azul, como la referencia. */}
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
      ) : null}
    </section>
  )
}

export default IdentityCard
