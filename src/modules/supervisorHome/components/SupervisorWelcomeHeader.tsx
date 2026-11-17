import { useQuery } from "@tanstack/react-query"

import OpsWelcomeHeader from "@/modules/shared/opsHome/components/OpsWelcomeHeader"
import { getSupervisionCenter } from "@/modules/supervisorHome/data/supervisorHome.data"

// Bloque 1: bienvenida del supervisor. Hace la consulta y pasa sus textos al bloque compartido.
// Sin subtítulo ni barra bajo el reloj (spec inicio-supervisor).
const SupervisorWelcomeHeader = () => {
  // Consulta propia de la sección: su clave empieza por el dominio ("supervisor").
  const { data, isPending, isError } = useQuery({
    queryKey: ["supervisor", "center"],
    queryFn: getSupervisionCenter,
  })

  return (
    <OpsWelcomeHeader
      greeting="Bienvenida a AirCrew"
      center={data}
      isPending={isPending}
      isError={isError}
    />
  )
}

export default SupervisorWelcomeHeader
