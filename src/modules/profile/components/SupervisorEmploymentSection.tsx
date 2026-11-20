import type {
  SupervisorEmployment,
  SupervisorOperationalStatus,
  SupervisorShift,
} from "@/App/types/profile.types"
import { LockIcon, PositionIcon, VerifiedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SectionCard from "@/modules/profile/components/SectionCard"

// Hubs de Delta en los que puede tener base un supervisor, con su código IATA.
const BASE_CITIES: Record<string, string> = {
  ATL: "Atlanta",
  BOS: "Boston",
  DTW: "Detroit",
  LAX: "Los Ángeles",
  MSP: "Minneapolis",
  JFK: "Nueva York",
  LGA: "Nueva York",
  SLC: "Salt Lake City",
  SEA: "Seattle",
}

const SHIFT_LABELS: Record<SupervisorShift, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  night: "Noche",
}

const STATUS_LABELS: Record<SupervisorOperationalStatus, string> = {
  available: "Disponible",
  on_duty: "En turno",
  off_duty: "Fuera de turno",
  leave: "De licencia",
}

// «Atlanta (ATL)»; un código que no está en la lista se muestra tal cual.
const baseLabel = (base: string | null) => {
  if (!base) return "Sin base asignada"
  return Object.hasOwn(BASE_CITIES, base)
    ? `${BASE_CITIES[base]} (${base})`
    : base
}

// Etiqueta de un valor del backend, o el valor tal cual si no la tiene (hasOwn: un valor
// como «toString» no debe leer el prototipo); sin valor, el texto de respaldo.
const labelOf = (
  labels: Record<string, string>,
  value: string | null,
  fallback: string
) => {
  if (!value) return fallback
  return Object.hasOwn(labels, value) ? labels[value] : value
}

interface SupervisorEmploymentSectionProps {
  // `employment` de GET /users/me (la consulta es de ProfileSettings).
  employment: SupervisorEmployment
}

// Información laboral del supervisor (solo lectura): sale de su cuenta y la asigna un
// administrador.
const SupervisorEmploymentSection = ({
  employment,
}: SupervisorEmploymentSectionProps) => {
  const items = [
    {
      label: "Código de empleado",
      value: employment.employee_code ?? "Sin código asignado",
    },
    { label: "Base", value: baseLabel(employment.base) },
    {
      label: "Turno",
      value: labelOf(SHIFT_LABELS, employment.shift, "Sin turno asignado"),
    },
    {
      label: "Estado operativo",
      value: labelOf(
        STATUS_LABELS,
        employment.operational_status,
        "Sin estado asignado"
      ),
    },
  ]

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
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ label, value }) => (
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
        La gestiona un administrador; pídele los cambios.
      </p>
    </SectionCard>
  )
}

export default SupervisorEmploymentSection
