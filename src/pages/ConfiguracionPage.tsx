import { ROLES } from "@/App/types/auth.types"
import ProfileHeader from "@/modules/profile/components/ProfileHeader"
import ProfileSettings from "@/modules/profile/components/ProfileSettings"
import OperatorProfileHeader from "@/modules/operatorProfile/components/OperatorProfileHeader"
import OperatorSettingsForm from "@/modules/operatorProfile/components/OperatorSettingsForm"
import { useAuthStore } from "@/stores/auth.store"

// Configuración (/configuracion):
// - Tripulante y supervisor: la pantalla del módulo profile (cada uno con sus bloques propios).
// - Super admin: «Mi Perfil y Configuración» (módulo operatorProfile).
const ConfiguracionPage = () => {
  const user = useAuthStore((state) => state.user)

  // ProtectedRoute garantiza la sesión; esto solo estrecha el tipo.
  if (!user) return null

  const isCrew = user.role === ROLES.TRIPULANTE

  if (user.role === ROLES.SUPER_ADMIN) {
    return (
      <div className="flex flex-col gap-6">
        <OperatorProfileHeader userId={user.id} />
        <OperatorSettingsForm userId={user.id} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader isCrew={isCrew} />
      <ProfileSettings user={user} isCrew={isCrew} />
    </div>
  )
}

export default ConfiguracionPage
