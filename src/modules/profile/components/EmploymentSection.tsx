import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  CalendarIcon,
  DepartureIcon,
  FlightIcon,
  GaugeIcon,
  LockIcon,
  LogbookIcon,
  PositionIcon,
  RankIcon,
  VerifiedIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewProfile } from "@/modules/profile/data/profile.data"

interface EmploymentSectionProps {
  userId: string
}

// F2 (tripulante, solo lectura): información laboral registrada por RRHH.
const EmploymentSection = ({ userId }: EmploymentSectionProps) => {
  const titleId = useId()
  const fieldId = useId()
  const { data, isPending, isError } = useQuery({
    queryKey: ["profile", "crew", userId],
    queryFn: () => getCrewProfile(userId),
  })

  const fields = data
    ? [
        {
          label: "Base Principal",
          value: data.employment.base,
          Icon: DepartureIcon,
        },
        {
          label: "Cargo Oficial / Escalafón",
          value: data.employment.officialPosition,
          Icon: RankIcon,
        },
        {
          label: "Flota Autorizada",
          value: data.employment.authorizedFleet,
          Icon: FlightIcon,
        },
        {
          label: "Fecha de Ingreso",
          value: data.employment.hireDate,
          Icon: CalendarIcon,
        },
        {
          label: "Horas Totales de Vuelo",
          value: data.employment.totalHours,
          Icon: LogbookIcon,
        },
        {
          label: "Límite Mensual FDP",
          value: data.employment.fdpLimit,
          Icon: GaugeIcon,
        },
      ]
    : []

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="-mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-xl border-b border-brand-neutral bg-background px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-neutral text-foreground">
            <PositionIcon aria-hidden="true" className="size-4.5" />
          </span>
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "min-w-0 font-bold text-brand-primary"
            )}
          >
            2. Información Laboral y Escalafón (Solo Lectura - Registrada)
          </h2>
        </div>
        <p
          className={cn(
            typography.labelSm,
            "flex shrink-0 items-center gap-1 text-muted-foreground"
          )}
        >
          <LockIcon aria-hidden="true" className="size-3.5 shrink-0" />
          RRHH & Operaciones
        </p>
      </div>

      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando datos de vuelo…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudieron cargar los datos de vuelo.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {fields.map(({ label, value, Icon }, index) => (
            // group: el último campo (límite FDP) va en azul, como la referencia.
            <div key={label} className="group flex min-w-0 flex-col gap-1">
              <label
                htmlFor={`${fieldId}-${index}`}
                className={cn(
                  typography.labelMd,
                  "font-semibold text-brand-primary"
                )}
              >
                {label}
              </label>
              <div className="relative">
                <Icon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id={`${fieldId}-${index}`}
                  type="text"
                  readOnly
                  value={value}
                  className={cn(
                    typography.bodyMd,
                    "min-h-11 w-full min-w-0 cursor-not-allowed truncate rounded-sm border border-brand-border bg-muted py-2 pr-3 pl-10 text-foreground group-last:font-medium group-last:text-brand-secondary focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-10"
                  )}
                />
              </div>
            </div>
          ))}
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
        Información registrada y auditada por Recursos Humanos y Operaciones de
        Vuelo. Para solicitar modificaciones, contacte a Gestión de
        Tripulaciones.
      </p>
    </section>
  )
}

export default EmploymentSection
