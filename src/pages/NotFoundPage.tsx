import { Link } from "react-router"

import { PATHS } from "@/routes/paths"

const NotFoundPage = () => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold text-brand-primary">
        Página no encontrada
      </h1>
      <Link to={PATHS.root} className="text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  )
}

export default NotFoundPage
