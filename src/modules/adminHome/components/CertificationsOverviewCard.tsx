import { useQuery } from "@tanstack/react-query"

import { CertificationIcon } from "@/App/utils/icons"
import AdminModuleCard from "@/modules/adminHome/components/AdminModuleCard"
import { getCertificationsRenewals } from "@/modules/adminHome/data/adminHome.data"
import { PATHS } from "@/routes/paths"

// Tarjeta 3: licencias por renovar.
const CertificationsOverviewCard = () => {
  // Clave distinta de ["certifications", "summary"] (Inicio del tripulante): sus datos
  // tienen otra forma y, al cambiar de rol, la caché los confundiría.
  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "renewals"],
    queryFn: getCertificationsRenewals,
  })

  return (
    <AdminModuleCard
      icon={CertificationIcon}
      accent="muted"
      title="Certificaciones y Licencias"
      description="Catálogo regulatorio de licencias aeronáuticas, vigencias y control de aptitud para vuelo según normatividad OACI y RAC vigente."
      link={{
        label: "Revisar Certificaciones",
        to: PATHS.superAdmin.certificaciones,
      }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando vigencias…"
      errorText="No se pudo cargar el estado de las certificaciones."
      badge={data ? `${data.toRenew} por renovar` : undefined}
      metric={
        data
          ? {
              label: "Vigencia reglamentaria",
              value: `${data.expiringAlerts} Alertas en ${data.alertWindowDays}d`,
            }
          : undefined
      }
      // En rojo solo si hay licencias por vencer.
      alert={Boolean(data && data.expiringAlerts > 0)}
    />
  )
}

export default CertificationsOverviewCard
