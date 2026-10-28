import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const AusenciasPage = () => {
  return (
    <>
      <title>Ausencias | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Ausencias
      </h1>
    </>
  )
}

export default AusenciasPage
