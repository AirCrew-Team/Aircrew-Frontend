import type { UseQueryResult } from "@tanstack/react-query"

import type {
  CrewMemberStatus,
  MyCrewMember,
} from "@/App/actions/profile/profile.actions"
import { LockIcon, PositionIcon, VerifiedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SectionCard from "@/modules/profile/components/SectionCard"

const STATUS_LABELS: Record<CrewMemberStatus, string> = {
  available: "Disponible",
  on_duty: "En servicio",
  in_flight: "En vuelo",
  medical_leave: "Incapacidad médica",
  vacation: "Vacaciones",
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-US", { dateStyle: "long" }).format(new Date(iso))

interface EmploymentSectionProps {
  // GET /crew-members/me (la consulta es de ProfileSettings).
  crew: UseQueryResult<MyCrewMember>
}

// Información laboral (solo el tripulante, solo lectura): sale de crew. Si crew falla, el
// error se queda en este bloque y el resto de la pantalla sigue funcionando.
const EmploymentSection = ({ crew }: EmploymentSectionProps) => {
  // Por la falta de datos, no por isError: una recarga que falla conserva los datos.
  const { data, isPending } = crew

  return (
    <SectionCard
      title="2. Información laboral"
      icon={<PositionIcon aria-hidden="true" className="size-4.5" />}
      aside={
        <p
          className={cn(
            typography.labelSm,
            "flex shrink-0 items-center gap-1 text-muted-foreground"
          )}
        >
          <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />
          Solo lectura
        </p>
      }
    >
      {!data ? (
        isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "text-muted-foreground")}
          >
            Cargando información laboral…
          </p>
        ) : (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            No se pudo cargar la información laboral.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Código de empleado", value: data.employee_code },
              { label: "Cargo", value: data.position },
              {
                label: "Base",
                value: data.current_location ?? "Sin base asignada",
              },
              { label: "Estado operativo", value: STATUS_LABELS[data.status] },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex min-w-0 flex-col gap-0.5 rounded-sm border border-brand-border bg-muted px-3 py-2"
              >
                <dt className={cn(typography.labelMd, "text-muted-foreground")}>
                  {label}
                </dt>
                <dd
                  className={cn(
                    typography.labelLg,
                    "wrap-break-word text-brand-primary"
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            Registrado en tripulación desde {formatDate(data.created_at)}
          </p>
        </div>
      )}

      <p
        className={cn(
          typography.bodySm,
          "flex items-start gap-1.5 border-t border-brand-neutral pt-3 text-muted-foreground"
        )}
      >
        <VerifiedIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-brand-secondary"
        />
        La gestiona un supervisor; pídele los cambios.
      </p>
    </SectionCard>
  )
}

export default EmploymentSection
