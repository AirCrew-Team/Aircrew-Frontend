import { useQuery } from "@tanstack/react-query"

import { AbsenceIcon } from "@/App/utils/icons"
import ModuleCard from "@/modules/shared/opsHome/components/ModuleCard"
import { getAbsencesSummary } from "@/modules/supervisorHome/data/supervisorHome.data"
import { PATHS } from "@/routes/paths"

// Tarjeta 2: ausencias abiertas de la tripulación.
const AbsencesCard = () => {
  // Consulta propia: si este servicio falla, solo esta tarjeta muestra el error.
  const { data, isPending, isError } = useQuery({
    queryKey: ["absences", "summary"],
    queryFn: getAbsencesSummary,
  })

  return (
    // La etiqueta y el dato del pie solo se pasan cuando ya hay datos.
    <ModuleCard
      icon={AbsenceIcon}
      accent="primary"
      title="Ausencias"
      description="Novedades médicas y operacionales de tripulantes, priorizadas por impacto en itinerario."
      link={{ label: "Gestionar Ausencias", to: PATHS.superVisor.ausencias }}
      isPending={isPending}
      isError={isError}
      loadingText="Cargando resumen de ausencias…"
      errorText="No se pudo cargar el resumen de ausencias."
      badge={data ? `${data.open} abiertas` : undefined}
      metric={
        data
          ? {
              label: "Salidas críticas",
              value: `${data.criticalDepartures} crítica <2h`,
            }
          : undefined
      }
      // En rojo solo si hay ausencias abiertas (las críticas son parte de ellas).
      alert={Boolean(data && data.open > 0)}
    />
  )
}

export default AbsencesCard
