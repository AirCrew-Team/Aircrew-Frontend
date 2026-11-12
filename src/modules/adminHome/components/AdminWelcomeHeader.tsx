import { useQuery } from "@tanstack/react-query"

import { getOpsCenter } from "@/modules/adminHome/data/adminHome.data"
import OpsWelcomeHeader from "@/modules/shared/opsHome/components/OpsWelcomeHeader"

// Bloque 1: bienvenida del admin. Hace la consulta y pasa sus textos al bloque compartido.
const AdminWelcomeHeader = () => {
  // Consulta propia de la sección: su clave empieza por el dominio ("admin").
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin", "opsCenter"],
    queryFn: getOpsCenter,
  })

  return (
    <OpsWelcomeHeader
      greeting="Bienvenido a AirCrew"
      subtitle="Centro de Operaciones y Despacho Aéreo • Turno Activo"
      showClockBar
      center={data}
      isPending={isPending}
      isError={isError}
    />
  )
}

export default AdminWelcomeHeader
