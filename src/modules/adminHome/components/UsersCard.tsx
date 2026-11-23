import { useQuery } from "@tanstack/react-query"

import { getUsersSummary as getRealUsersSummary } from "@/App/actions/users/users.actions"
import { PositionIcon } from "@/App/utils/icons"
import { getUsersSummary } from "@/modules/adminHome/data/adminHome.data"
import type { UsersSummary } from "@/modules/adminHome/types/adminHome.types"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { PATHS } from "@/routes/paths"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Sesión real: tripulantes registrados (by_role.crew) y disponibles (crew_available) de
// GET /users/stats. El porcentaje de aptos todavía no existe en el backend: «—».
const getBackendUsersSummary = async (): Promise<UsersSummary> => {
  const { registeredCrew, availableCrew } = await getRealUsersSummary()
  return { registeredCrew, availableCrew, availabilityPercent: null }
}

// Tarjeta 1: nómina de tripulantes y disponibilidad del turno. Las cuentas demo ven los
// datos de ejemplo.
const UsersCard = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["users", "summary"],
    queryFn: isDemo ? getUsersSummary : getBackendUsersSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <ModuleCard
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
              label:
                data.availableCrew === undefined
                  ? "Disponibilidad en turno"
                  : `${data.availableCrew} tripulantes disponibles`,
              value:
                data.availabilityPercent === null
                  ? "— Apto"
                  : `${data.availabilityPercent}% Apto`,
            }
          : undefined
      }
    />
  )
}

export default UsersCard
