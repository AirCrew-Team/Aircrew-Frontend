import { useQuery } from "@tanstack/react-query"

import { CertificationIcon } from "@/App/utils/icons"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { getCertificationsRenewals } from "@/modules/adminHome/data/adminHome.data"
import type { CertificationsOverview } from "@/modules/adminHome/types/adminHome.types"
import { PATHS } from "@/routes/paths"

// Etiqueta, dato del pie y alerta de la tarjeta. Datos de ejemplo: renovaciones. Sesión
// real: verificación (las stats no traen vencimientos); en rojo si alguien no tiene
// certificado.
const presentation = (data: CertificationsOverview) =>
  data.kind === "renewals"
    ? {
        badge: `${data.toRenew} por renovar`,
        metric: {
          label: "Vigencia reglamentaria",
          value: `${data.expiringAlerts} Alertas en ${data.alertWindowDays}d`,
        },
        alert: data.expiringAlerts > 0,
      }
    : {
        badge: `${data.pendingVerification} por verificar`,
        metric: {
          label: `${data.verified} de ${data.total} verificados`,
          value: `${data.uncertified} sin certificado`,
        },
        alert: data.uncertified > 0,
      }

// Tarjeta 3: estado de las certificaciones.
const CertificationsOverviewCard = () => {
  // Clave distinta de ["certifications", "summary"] (Inicio del tripulante): sus datos
  // tienen otra forma y, al cambiar de rol, la caché los confundiría.
  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "renewals"],
    queryFn: getCertificationsRenewals,
  })

  const shown = data ? presentation(data) : null

  return (
    <ModuleCard
      icon={CertificationIcon}
      accent="muted"
      title="Certificaciones y Licencias"
      description="Catálogo regulatorio de licencias aeronáuticas, vigencias y control de aptitud para vuelo según normatividad OACI y FAA vigente."
      link={{
        label: "Revisar Certificaciones",
        to: PATHS.superAdmin.certificaciones,
      }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando vigencias…"
      errorText="No se pudo cargar el estado de las certificaciones."
      badge={shown?.badge}
      metric={shown?.metric}
      alert={shown?.alert}
    />
  )
}

export default CertificationsOverviewCard
