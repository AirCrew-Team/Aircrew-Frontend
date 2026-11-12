import { useQuery } from "@tanstack/react-query"

import { SyncIcon } from "@/App/utils/icons"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { getReplacementRequestsSummary } from "@/modules/supervisorHome/data/supervisorHome.data"
import { PATHS } from "@/routes/paths"

// Tarjeta 1: sugerencias de reemplazo de la IA pendientes de aprobación.
const ReplacementRequestsCard = () => {
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["replacements", "summary"],
    queryFn: getReplacementRequestsSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <ModuleCard
      icon={SyncIcon}
      accent="secondary"
      title="Solicitudes de Reemplazo"
      description="Sugerencias de reemplazo propuestas por la IA, pendientes de tu aprobación."
      link={{
        label: "Revisar Solicitudes",
        to: PATHS.superVisor.solicitudesReemplazo,
      }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando solicitudes de reemplazo…"
      errorText="No se pudo cargar el resumen de solicitudes."
      badge={data ? `${data.pendingApproval} por aprobar` : undefined}
      metric={
        data
          ? {
              label: "Tasa de resolución",
              value: `${data.resolutionRate}% Resuelto`,
            }
          : undefined
      }
    />
  )
}

export default ReplacementRequestsCard
