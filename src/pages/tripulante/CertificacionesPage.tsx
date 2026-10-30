import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const CertificacionesPage = () => {
  return (
    <>
      <title>Certificaciones | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Certificaciones
      </h1>
    </>
  )
}

export default CertificacionesPage
