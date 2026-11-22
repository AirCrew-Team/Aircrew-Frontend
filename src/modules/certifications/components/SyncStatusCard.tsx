import { useQuery } from "@tanstack/react-query"

import { SyncIcon, VerifiedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCertifications } from "@/modules/shared/certifications/data/certifications.data"
import { getCertificationStatus } from "@/modules/shared/certifications/utils/expiry"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

const cardClass =
  "flex flex-col gap-2 rounded-xl border border-brand-border/70 bg-card p-5 shadow-sm sm:p-6"
const titleClass = cn(
  typography.headlineSm,
  "font-bold text-balance text-brand-primary"
)
const badgeClass = cn(
  typography.labelSm,
  "rounded-full border border-transparent bg-brand-border px-2 py-0.5 text-brand-primary"
)

// Sesión real: no hay sincronización con la FAA, así que la tarjeta cuenta el estado del
// expediente (lo coteja el super_admin), con la misma query que la lista. Mientras carga o
// si falla no se pinta: la lista ya muestra su estado.
const RecordVerificationCard = () => {
  const { data } = useQuery({
    queryKey: ["certifications", "list"],
    queryFn: getCertifications,
  })
  if (!data) return null

  const today = new Date()
  const statuses = data.map(
    (certification) => getCertificationStatus(certification, today).status
  )
  const state = statuses.includes("verificado")
    ? {
        label: "Verificado",
        text: "La administración de AirCrew ya cotejó tu certificación.",
      }
    : statuses.includes("por_verificar")
      ? {
          label: "Por verificar",
          text: "Tu certificación está registrada; falta que la administración la coteje.",
        }
      : {
          label: "Sin certificación",
          text: "Aún no tienes una certificación registrada. La registra la administración de AirCrew.",
        }

  return (
    <div className={cardClass}>
      <h2 className={titleClass}>Verificación del expediente</h2>
      <div className="order-first flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            typography.labelSm,
            "flex items-start gap-1 font-bold tracking-wider text-brand-secondary uppercase"
          )}
        >
          <VerifiedIcon aria-hidden="true" className="size-3.5 shrink-0" />
          Expediente
        </p>
        <span className={badgeClass}>{state.label}</span>
      </div>
      <p className={cn(typography.bodySm, "text-muted-foreground")}>
        {state.text}
      </p>
    </div>
  )
}

// T1: estado de la sincronización con la FAA. Texto fijo de la demo: no hay sincronización real.
const SyncStatusCard = () => {
  const demo = useAuthStore((state) => isDemoUser(state.user))
  if (!demo) return <RecordVerificationCard />

  return (
    <div className={cardClass}>
      <h2 className={titleClass}>Sincronización FAA en Tiempo Real</h2>
      <div className="order-first flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            typography.labelSm,
            "flex items-start gap-1 font-bold tracking-wider text-brand-secondary uppercase"
          )}
        >
          <SyncIcon aria-hidden="true" className="size-3.5 shrink-0" />
          API FAA conectada
        </p>
        <span className={badgeClass}>En línea</span>
      </div>
      <p className={cn(typography.bodySm, "text-muted-foreground")}>
        Las horas de vuelo, calificaciones y chequeos médicos se concilian
        automáticamente con la base de datos central de la Administración
        Federal de Aviación (FAA).
      </p>
      <div
        className={cn(
          typography.labelSm,
          "mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-4 text-muted-foreground"
        )}
      >
        <p className="min-w-0">Última comprobación: Hoy, 06:15 UTC</p>
        <p className="min-w-0 wrap-anywhere text-brand-secondary">
          Hash: #FAA-88192-OK
        </p>
      </div>
    </div>
  )
}

export default SyncStatusCard
