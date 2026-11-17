import { useQuery } from "@tanstack/react-query"

import { PositionIcon } from "@/App/utils/icons"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { getCrewSummary } from "@/modules/supervisorHome/data/supervisorHome.data"
import { PATHS } from "@/routes/paths"

// Tarjeta 3: tripulación en servicio y disponibilidad del turno.
const CrewCard = () => {
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["crew", "summary"],
    queryFn: getCrewSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <ModuleCard
      icon={PositionIcon}
      accent="muted"
      title="Tripulación"
      description="Disponibilidad y guardias de la tripulación del turno."
      link={{ label: "Ver Tripulación", to: PATHS.superVisor.tripulacion }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando resumen de tripulación…"
      errorText="No se pudo cargar el resumen de tripulación."
      badge={data ? `${data.onDuty} en servicio` : undefined}
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

export default CrewCard
