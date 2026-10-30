import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const ReportarAusenciaPage = () => {
  return (
    <>
      <title>Reportar Ausencia | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Reportar Ausencia
      </h1>
    </>
  )
}

export default ReportarAusenciaPage
