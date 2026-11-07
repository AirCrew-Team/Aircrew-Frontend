import { useQuery } from "@tanstack/react-query"

import { FlightIcon } from "@/App/utils/icons"
import AdminModuleCard from "@/modules/adminHome/components/AdminModuleCard"
import { getFleetSummary } from "@/modules/adminHome/data/adminHome.data"
import { PATHS } from "@/routes/paths"

// Tarjeta 2: estado de la flota.
const FleetCard = () => {
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["fleet", "summary"],
    queryFn: getFleetSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <AdminModuleCard
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
              label: `${data.models} en línea`,
              value: `${data.operational} / ${data.total} Operativas`,
            }
          : undefined
      }
    />
  )
}

export default FleetCard
