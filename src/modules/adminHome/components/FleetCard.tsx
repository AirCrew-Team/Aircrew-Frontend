import { useQuery } from "@tanstack/react-query"

import { getAircraftStats } from "@/App/actions/aircraft/aircraft.actions"
import type { FleetSummary } from "@/modules/adminHome/types/adminHome.types"
import { FlightIcon } from "@/App/utils/icons"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { getFleetSummary } from "@/modules/adminHome/data/adminHome.data"
import { PATHS } from "@/routes/paths"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Sesión real: el resumen sale de los indicadores de la flota (GET /aircraft/stats).
// Activas = operativas; los modelos en línea son los de las operativas, unidos con « / ».
const getRealFleetSummary = async (): Promise<FleetSummary> => {
  const stats = await getAircraftStats()
  return {
    activeAircraft: stats.operational,
    models: stats.modelsInService.join(" / "),
    operational: stats.operational,
    total: stats.total,
  }
}

// Tarjeta 2: estado de la flota. Las cuentas demo ven los datos de ejemplo.
const FleetCard = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["fleet", "summary"],
    queryFn: isDemo ? getFleetSummary : getRealFleetSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <ModuleCard
      icon={FlightIcon}
      accent="primary"
      title="Flota de Aeronaves"
      description="Revisa estado de aeronaves, capacidad de pasajeros, dotación mínima requerida y destinos asignados en la malla de rutas corporativa."
      link={{ label: "Ver Aeronaves", to: PATHS.superAdmin.aeronaves }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando estado de la flota…"
      errorText="No se pudo cargar el estado de la flota."
      badge={data ? `${data.activeAircraft} activas` : undefined}
      metric={
        data
          ? {
              // Sin aeronaves operativas no hay modelos en línea.
              label: data.models
                ? `${data.models} en línea`
                : "Sin modelos en línea",
              value: `${data.operational} / ${data.total} Operativas`,
            }
          : undefined
      }
    />
  )
}

export default FleetCard
