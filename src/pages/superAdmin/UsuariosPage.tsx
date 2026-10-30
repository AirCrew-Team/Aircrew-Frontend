import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const UsuariosPage = () => {
  return (
    <>
      <title>Usuarios | AirCrew</title>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Usuarios
      </h1>
    </>
  )
}

export default UsuariosPage
