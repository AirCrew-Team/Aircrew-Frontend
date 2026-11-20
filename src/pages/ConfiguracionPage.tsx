import { ROLES } from "@/App/types/auth.types"
import { InfoIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { isDemoUserId } from "@/modules/profile/data/profile.data"
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

  // Con una sesión real, parte de los datos son de ejemplo: se avisa para no tomarlos por
  // reales. Va tras la cabecera (después del <h1>) y sin región viva: es un estado fijo.
  const notice = isDemoUserId(user.id) ? null : (
    <p
      className={cn(
        typography.bodyMd,
        "flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground"
      )}
    >
      <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      Algunos datos son de ejemplo: el servidor todavía no los ofrece y los
      cambios no se guardan en el servidor.
    </p>
  )

  if (user.role === ROLES.SUPER_ADMIN) {
    return (
      <div className="flex flex-col gap-6">
        <OperatorProfileHeader userId={user.id} />
        {notice}
        <OperatorSettingsForm userId={user.id} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader isCrew={isCrew} />
      {notice}
      <ProfileSettings user={user} isCrew={isCrew} />
    </div>
  )
}

export default ConfiguracionPage
