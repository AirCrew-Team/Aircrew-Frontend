import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const SolicitudesReemplazoPage = () => {
  return (
    <>
      <title>Solicitudes de Reemplazo | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Solicitudes de Reemplazo
      </h1>
    </>
  )
}

export default SolicitudesReemplazoPage
