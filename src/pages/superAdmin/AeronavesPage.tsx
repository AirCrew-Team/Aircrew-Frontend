import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const AeronavesPage = () => {
  return (
    <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
      Aeronaves
    </h1>
  )
}

export default AeronavesPage
