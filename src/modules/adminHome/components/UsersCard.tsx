import { useQuery } from "@tanstack/react-query"

import { PositionIcon } from "@/App/utils/icons"
import AdminModuleCard from "@/modules/adminHome/components/AdminModuleCard"
import { getUsersSummary } from "@/modules/adminHome/data/adminHome.data"
import { PATHS } from "@/routes/paths"

// Tarjeta 1: nómina de tripulantes y disponibilidad del turno.
const UsersCard = () => {
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["users", "summary"],
    queryFn: getUsersSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <AdminModuleCard
      icon={PositionIcon}
      accent="secondary"
      title="Gestión de Usuarios"
      description="Consulta nómina de tripulantes y supervisores, disponibilidad de relevo y guardias activas sin comprometer datos confidenciales en tránsito."
      link={{ label: "Ir a Usuarios", to: PATHS.superAdmin.usuarios }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando resumen de usuarios…"
      errorText="No se pudo cargar el resumen de usuarios."
      badge={
        data ? `${data.registeredCrew} tripulantes registrados` : undefined
      }
      metric={
        data
          ? {
              label: "Disponibilidad en turno",
              value: `${data.availabilityPercent}% Apto`,
            }
          : undefined
      }
    />
  )
}

export default UsersCard
