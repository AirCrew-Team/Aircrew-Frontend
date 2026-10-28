import { Link } from "react-router"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { PATHS } from "@/routes/paths"

const NotFoundPage = () => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <title>Página no encontrada | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Página no encontrada
      </h1>
      <Link
        to={PATHS.root}
        className={cn(
          typography.labelLg,
          "text-brand-secondary underline underline-offset-4"
        )}
      >
        Volver al inicio
      </Link>
    </div>
  )
}

export default NotFoundPage
