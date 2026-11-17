import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  MailIcon,
  PositionIcon,
  PrintIcon,
  VerifiedIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import UserDialogHeader from "@/modules/users/components/UserDialogHeader"
import UserStatusBadge from "@/modules/users/components/UserStatusBadge"
import { getUserDetail } from "@/modules/users/data/users.data"
import type { UserDetail } from "@/modules/users/types/users.types"
import { fullName, initials } from "@/modules/users/utils/userName"

// 1110 → «18h 30m».
const formatMinutes = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`

const cardClass = "flex flex-col gap-1 rounded-lg bg-card p-4 shadow-xs"
const cardLabelClass = cn(typography.labelSm, "text-muted-foreground uppercase")
const noteClass = cn(typography.bodySm, "text-muted-foreground")

// Barra de progreso decorativa: el porcentaje ya se dice en el texto de la tarjeta.
const ProgressBar = ({ percent, tone }: { percent: number; tone: string }) => (
  <div
    aria-hidden="true"
    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-brand-neutral"
  >
    <div
      className={cn("h-full rounded-full", tone)}
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
)

// Horas de vuelo y descanso reglamentario: solo Tripulación.
const FlightCards = ({
  flight,
}: {
  flight: NonNullable<UserDetail["flight"]>
}) => {
  const { hours, rest } = flight
  const restMet = rest.minutes >= rest.requiredMinutes
  // «Excede» por encima del mínimo, «Cumple» justo en el mínimo y «Por debajo del» si falta.
  const restWord =
    rest.minutes > rest.requiredMinutes
      ? "Excede"
      : restMet
        ? "Cumple"
        : "Por debajo del"

  return (
    <>
      <div className={cardClass}>
        <p className={cardLabelClass}>Horas de vuelo</p>
        <p
          className={cn(
            typography.headlineSm,
            "font-bold text-brand-primary tabular-nums"
          )}
        >
          {hours.total.toLocaleString("en-US")} hrs
        </p>
        <ProgressBar
          percent={hours.annualLimitPercent}
          tone="bg-brand-secondary"
        />
        <p className={noteClass}>
          Límite anual seguro ({hours.annualLimitPercent}%)
        </p>
      </div>

      <div className={cardClass}>
        <p className={cardLabelClass}>Descanso reglamentario</p>
        <p
          className={cn(
            typography.headlineSm,
            "font-bold tabular-nums",
            restMet ? "text-brand-secondary" : "text-destructive"
          )}
        >
          {formatMinutes(rest.minutes)}
        </p>
        <ProgressBar
          percent={(rest.minutes / rest.requiredMinutes) * 100}
          tone={restMet ? "bg-brand-tertiary/60" : "bg-destructive"}
        />
        <p className={noteClass}>
          {restWord} mínimo exigido ({rest.requiredMinutes / 60}h)
        </p>
      </div>
    </>
  )
}

// Lista de etiquetas (certificados o habilitaciones).
const TagList = ({ label, tags }: { label: string; tags: string[] }) => (
  <ul aria-label={label} className="flex flex-wrap gap-1.5">
    {tags.map((tag) => (
      <li
        key={tag}
        className={cn(
          typography.labelSm,
          "rounded-sm bg-brand-border px-2 py-0.5 text-brand-primary"
        )}
      >
        {tag}
      </li>
    ))}
  </ul>
)

// Contenido de la ficha, con los datos ya cargados. Supervisor y Administrador no
// tienen horas de vuelo, descanso, licencia ni habilitaciones: solo se muestran sus datos.
const UserDetailContent = ({ user }: { user: UserDetail }) => {
  const sectionTitleId = useId()

  return (
    <div className="flex flex-col gap-4">
      {/* Identificación: avatar, nombre, ID, cargo, base y correo; a la derecha, estado y turno. */}
      <section
        aria-label="Identificación"
        className="flex flex-col gap-4 rounded-lg bg-brand-neutral p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className={cn(
              typography.headlineMd,
              "flex size-14 shrink-0 items-center justify-center rounded-lg bg-brand-secondary font-bold text-white"
            )}
          >
            {initials(user)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  typography.headlineSm,
                  "font-bold text-brand-primary"
                )}
              >
                {fullName(user)}
              </span>
              <span
                className={cn(
                  typography.labelSm,
                  "rounded-sm bg-brand-border px-1.5 py-0.5 font-mono text-brand-primary"
                )}
              >
                {user.id}
              </span>
            </p>
            <p
              className={cn(
                typography.bodySm,
                "font-semibold text-brand-secondary"
              )}
            >
              {user.roleTitle} · {user.baseLabel}
            </p>
            <p
              className={cn(
                typography.bodySm,
                "flex items-center gap-1.5 break-all text-muted-foreground"
              )}
            >
              <MailIcon aria-hidden="true" className="size-3.5 shrink-0" />
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <UserStatusBadge status={user.status} />
          <p className={cn(typography.labelSm, "font-medium text-foreground")}>
            Turno Activo: {user.shift}
          </p>
        </div>
      </section>

      {/* Móvil: una columna. Desde md: indicadores a la izquierda y licencia a la derecha. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-3">
          {user.flight ? <FlightCards flight={user.flight} /> : null}

          <div className={cardClass}>
            <p className={cardLabelClass}>Disponibilidad operacional</p>
            <p
              className={cn(typography.labelLg, "font-bold text-brand-primary")}
            >
              {user.availability.label}
            </p>
            <p className={noteClass}>{user.availability.note}</p>
          </div>
        </div>

        <section
          aria-labelledby={sectionTitleId}
          className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-xs"
        >
          <h3
            id={sectionTitleId}
            className={cn(typography.headlineSm, "text-brand-primary")}
          >
            {user.license
              ? "Certificaciones y Licencias Aeronáuticas"
              : "Contacto operativo"}
          </h3>

          <dl
            className={cn(
              "grid grid-cols-1 gap-3",
              user.license && "sm:grid-cols-2"
            )}
          >
            {user.license ? (
              <div className="flex flex-col gap-0.5 rounded-md bg-muted p-3">
                <dt className={cardLabelClass}>Número de licencia</dt>
                <dd
                  className={cn(
                    typography.labelLg,
                    "font-bold text-brand-primary"
                  )}
                >
                  {user.license.number}
                </dd>
                <dd className={noteClass}>Licencia FAA</dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5 rounded-md bg-muted p-3">
              <dt className={cardLabelClass}>Celular de contacto operativo</dt>
              <dd
                className={cn(
                  typography.labelLg,
                  "font-bold text-brand-primary"
                )}
              >
                {/* Enlace tel: en el celular abre la llamada directamente. */}
                <a
                  href={`tel:${user.phone.number.replace(/\s/g, "")}`}
                  className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden"
                >
                  {user.phone.number}
                </a>
              </dd>
              <dd className={noteClass}>{user.phone.note}</dd>
            </div>
          </dl>

          {user.license ? (
            <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
              <p
                className={cn(
                  typography.labelMd,
                  "flex items-center gap-1.5 font-bold text-brand-primary"
                )}
              >
                <VerifiedIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-brand-secondary"
                />
                Certificados
              </p>
              {user.license.certificates.length > 0 ? (
                <TagList
                  label="Certificados"
                  tags={user.license.certificates}
                />
              ) : (
                <p className={noteClass}>Sin certificados registrados.</p>
              )}
            </div>
          ) : null}

          {user.rating ? (
            <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
              <p
                className={cn(
                  typography.labelMd,
                  "font-bold text-brand-primary"
                )}
              >
                {user.rating.title}
              </p>
              <p className={cn(typography.bodySm, "text-foreground")}>
                {user.rating.description}
              </p>
              <TagList label="Habilitaciones" tags={user.rating.tags} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

interface UserDetailDialogProps {
  // ID del usuario a mostrar; null con la ventana cerrada.
  userId: string | null
  onClose: () => void
}

// Ventana «Detalle del Usuario». Pide la ficha del usuario solo al abrirse:
// la clave ["users", "detail", id] guarda cada ficha, así reabrir la misma no repite la petición.
// Se cierra con la X, con Esc o al pulsar fuera, y el foco vuelve a «Ver más información».
const UserDetailDialog = ({ userId, onClose }: UserDetailDialogProps) => {
  // Último usuario abierto: al cerrar, userId pasa a null, pero la ficha sigue visible
  // durante la animación de salida en lugar de cambiar a «Cargando…».
  const [shownUserId, setShownUserId] = useState(userId)
  if (userId !== null && userId !== shownUserId) setShownUserId(userId)

  const { data, isPending, isError } = useQuery({
    queryKey: ["users", "detail", shownUserId],
    queryFn: () => getUserDetail(shownUserId as string),
    // Sin usuario no hay nada que pedir.
    enabled: shownUserId !== null,
  })

  return (
    // Abierta mientras haya un usuario elegido; la X, Esc o pulsar fuera piden cerrar.
    <Dialog
      open={userId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {/* Sin la X genérica de shadcn: la pone UserDialogHeader, en español y en blanco. */}
      <DialogContent
        showCloseButton={false}
        // Ancho de la referencia en escritorio; en pantallas bajas el contenido se desplaza.
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-4xl"
      >
        <UserDialogHeader
          icon={PositionIcon}
          title="Detalle del Usuario"
          description="Ficha técnica · Flight Ops Central"
          closeLabel="Cerrar detalle del usuario"
        />

        {/* Cuerpo con su propio desplazamiento: el encabezado y el pie quedan fijos. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Estados de la ficha: cargando (status), error (alert) o el contenido. */}
          {isPending ? (
            <p
              role="status"
              className={cn(typography.bodySm, "text-muted-foreground")}
            >
              Cargando detalle del usuario…
            </p>
          ) : isError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudo cargar el detalle del usuario.
            </p>
          ) : (
            <UserDetailContent user={data} />
          )}
        </div>

        {/* Pie: solo «Descargar Ficha PDF», visible pero sin función hasta que exista. */}
        <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
          <button
            type="button"
            aria-disabled="true"
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-md bg-brand-secondary px-4 font-semibold text-white lg:min-h-9"
            )}
          >
            <PrintIcon aria-hidden="true" className="size-4" />
            Descargar Ficha PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserDetailDialog
