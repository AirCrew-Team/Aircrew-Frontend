import { useQuery } from "@tanstack/react-query"

import { ScheduleIcon } from "@/App/utils/icons"
import { getScheduleDays } from "@/modules/shared/flightAssignment/data/flightAssignment.data"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { PATHS } from "@/routes/paths"

// Tarjeta 1: vuelos por completar de los próximos 7 días. Usa la misma consulta que el
// selector de día de Programación, así el contador sigue a las asignaciones.
const ProgramacionCard = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["assignment", "days"],
    queryFn: getScheduleDays,
  })

  const pending = data?.reduce((sum, day) => sum + day.pendingCount, 0)
  const total = data?.reduce((sum, day) => sum + day.flightCount, 0)

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <ModuleCard
      icon={ScheduleIcon}
      accent="secondary"
      title="Programación"
      description="Asignación de tripulaciones a los vuelos de los próximos 7 días."
      link={{ label: "Ver Programación", to: PATHS.superVisor.programacion }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando programación…"
      errorText="No se pudo cargar la programación."
      badge={data ? `${pending} por completar` : undefined}
      metric={
        data
          ? { label: "Vuelos por completar", value: `${pending} de ${total}` }
          : undefined
      }
    />
  )
}

export default ProgramacionCard
