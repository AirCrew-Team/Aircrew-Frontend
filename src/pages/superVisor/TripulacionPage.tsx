import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const TripulacionPage = () => {
  return (
    <>
      <title>Tripulación | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Tripulación
      </h1>
    </>
  )
}

export default TripulacionPage
