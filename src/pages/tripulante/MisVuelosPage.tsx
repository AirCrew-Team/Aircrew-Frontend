import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const MisVuelosPage = () => {
  return (
    <>
      <title>Mis Vuelos | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Mis Vuelos
      </h1>
    </>
  )
}

export default MisVuelosPage
