import { useQuery } from "@tanstack/react-query"

import {
  getMyCrewMember,
  getMyProfile,
  getUsCities,
  myProfileQueryKey,
} from "@/App/actions/profile/profile.actions"
import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import IdentityCard from "@/modules/profile/components/IdentityCard"
import ProfileForm from "@/modules/profile/components/ProfileForm"

interface ProfileSettingsProps {
  user: AuthUser
  // Cuenta demo o «Rol (dev)»: sin backend, la misma pantalla deshabilitada.
  isDemo: boolean
}

const messageClass =
  "rounded-xl border border-brand-border/70 bg-card p-6 shadow-sm"

// Cuerpo de Configuración: la tarjeta a la izquierda y el formulario a la derecha (una
// columna en móvil). Las consultas de la pantalla van aquí, en paralelo, y los bloques
// reciben los datos por props para no abrir otro observador de la misma clave. El navbar
// (MainLayout) observa también la del perfil, con sus propias opciones.
const ProfileSettings = ({ user, isDemo }: ProfileSettingsProps) => {
  const isCrew = user.role === ROLES.TRIPULANTE
  const profileQuery = useQuery({
    queryKey: myProfileQueryKey(user.id),
    queryFn: getMyProfile,
    enabled: !isDemo,
  })
  const crew = useQuery({
    queryKey: ["profile", "crew", user.id],
    queryFn: getMyCrewMember,
    enabled: isCrew && !isDemo,
  })
  // Catálogo fijo del backend: se pide una vez por sesión de la app. Su clave queda fuera
  // de ["profile", …] para que guardar el perfil no lo vuelva a pedir.
  const cities = useQuery({
    queryKey: ["catalogs", "us-cities"],
    queryFn: getUsCities,
    enabled: !isDemo,
    staleTime: Infinity,
  })

  // Se decide por la falta de datos, no por isError: si una recarga en segundo plano
  // falla, la consulta queda en error pero conserva los datos y el formulario sigue.
  if (!isDemo && !profileQuery.data) {
    return profileQuery.isPending ? (
      <p
        role="status"
        className={cn(typography.bodyMd, messageClass, "text-muted-foreground")}
      >
        Cargando tu perfil…
      </p>
    ) : (
      <p
        role="alert"
        className={cn(typography.bodyMd, messageClass, "text-destructive")}
      >
        No se pudo cargar tu perfil. Intenta de nuevo.
      </p>
    )
  }

  const profile = isDemo ? null : (profileQuery.data ?? null)

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
      <div className="min-w-0">
        <IdentityCard
          user={user}
          profile={profile}
          crewPosition={crew.data?.position}
        />
      </div>
      <div className="min-w-0 lg:col-span-2">
        <ProfileForm
          user={user}
          profile={profile}
          crew={crew}
          cities={isDemo ? undefined : cities.data}
          citiesFailed={!isDemo && cities.isError}
        />
      </div>
    </div>
  )
}

export default ProfileSettings
