import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Cabecera común a los tres roles: antetítulo, h1 y subtítulo.
const ProfileHeader = () => {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p
        className={cn(
          typography.labelSm,
          "flex w-fit items-center gap-1.5 tracking-widest text-brand-secondary uppercase"
        )}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-brand-secondary"
        />
        Tu cuenta en AirCrew
      </p>
      <h1
        className={cn(
          typography.headlineLg,
          "font-bold tracking-tight text-brand-primary"
        )}
      >
        Mi perfil y configuración
      </h1>
      <p className={cn(typography.bodyMd, "max-w-2xl text-muted-foreground")}>
        Consulta tus datos, actualiza tu contacto y gestiona tu contraseña.
      </p>
    </div>
  )
}

export default ProfileHeader
