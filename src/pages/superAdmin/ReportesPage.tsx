import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const ReportesPage = () => {
  return (
    <>
      <title>Reportes | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Reportes
      </h1>
    </>
  )
}

export default ReportesPage
