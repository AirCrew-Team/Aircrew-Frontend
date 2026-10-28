import { CertificationIcon, ClockIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface ProfileHeaderProps {
  isCrew: boolean
}

// Etiquetas del tripulante: la de cumplimiento es una pastilla y la de zona horaria, un rótulo.
const tagClassName = cn(
  typography.labelSm,
  "flex items-center bg-brand-neutral py-1.5 uppercase"
)

// Cabecera: antetítulo, h1 y descripción; el tripulante ve además sus etiquetas.
const ProfileHeader = ({ isCrew }: ProfileHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
          {isCrew
            ? "Expediente personal • Portal tripulación"
            : "Expediente personal"}
        </p>
        <h1
          className={cn(
            typography.headlineLg,
            "font-bold tracking-tight text-brand-primary"
          )}
        >
          {isCrew ? "Mi Perfil y Ajustes de Tripulante" : "Mi perfil y ajustes"}
        </h1>
        <p className={cn(typography.bodyMd, "max-w-2xl text-muted-foreground")}>
          {isCrew
            ? "Gestiona tus datos de contacto operativo, consulta tu información laboral registrada y administra tus preferencias de notificaciones en guardia."
            : "Gestiona tus datos de contacto y la seguridad de tu cuenta."}
        </p>
      </div>
      {isCrew ? (
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <p
            className={cn(
              tagClassName,
              "gap-1.5 rounded-full px-4 text-brand-primary shadow-sm"
            )}
          >
            <CertificationIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            RAC 121 • Perfil conforme
          </p>
          <p
            className={cn(
              tagClassName,
              "gap-1 rounded-sm px-2 text-muted-foreground"
            )}
          >
            <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
            UTC-5 (BOG)
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default ProfileHeader
