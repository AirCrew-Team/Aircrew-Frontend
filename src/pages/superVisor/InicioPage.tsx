import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const InicioPage = () => {
  return (
    <>
      <title>Inicio | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Inicio
      </h1>
    </>
  )
}

export default InicioPage
