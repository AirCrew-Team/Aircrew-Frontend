import { InfoIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import ProfileHeader from "@/modules/profile/components/ProfileHeader"
import ProfileSettings from "@/modules/profile/components/ProfileSettings"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Configuración (/configuracion): la misma pantalla para los tres roles, con los datos
// reales de la cuenta. Las cuentas demo la ven deshabilitada y sin peticiones.
const ConfiguracionPage = () => {
  const user = useAuthStore((state) => state.user)

  // ProtectedRoute garantiza la sesión; esto solo estrecha el tipo.
  if (!user) return null

  const isDemo = isDemoUser(user)

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader />
      {/* Estado fijo, sin región viva. */}
      {isDemo ? (
        <p
          className={cn(
            typography.bodyMd,
            "flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground"
          )}
        >
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Cuenta de demostración: inicia sesión con una cuenta real para ver y
          guardar tus datos.
        </p>
      ) : null}
      {/* key: «Rol (dev)» cambia de usuario sin salir de la pantalla. */}
      <ProfileSettings key={user.id} user={user} isDemo={isDemo} />
    </div>
  )
}

export default ConfiguracionPage
