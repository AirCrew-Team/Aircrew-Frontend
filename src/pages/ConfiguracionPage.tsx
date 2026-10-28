import { ROLES } from "@/App/types/auth.types"
import FdpUsageCard from "@/modules/profile/components/FdpUsageCard"
import IdentityCard from "@/modules/profile/components/IdentityCard"
import MedicalCertificateNotice from "@/modules/profile/components/MedicalCertificateNotice"
import ProfileForm from "@/modules/profile/components/ProfileForm"
import ProfileHeader from "@/modules/profile/components/ProfileHeader"
import { useAuthStore } from "@/stores/auth.store"

// Configuración, común a los tres roles: el tripulante ve además sus bloques propios.
const ConfiguracionPage = () => {
  const user = useAuthStore((state) => state.user)

  // ProtectedRoute garantiza la sesión; esto solo estrecha el tipo.
  if (!user) return null

  const isCrew = user.role === ROLES.TRIPULANTE

  return (
    <>
      <title>Configuración | AirCrew</title>
      <div className="flex flex-col gap-6">
        <ProfileHeader isCrew={isCrew} />
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4">
            <IdentityCard user={user} isCrew={isCrew} />
            {isCrew ? (
              <>
                <FdpUsageCard userId={user.id} />
                <MedicalCertificateNotice userId={user.id} />
              </>
            ) : null}
          </div>
          <div className="min-w-0 lg:col-span-2">
            <ProfileForm userId={user.id} isCrew={isCrew} />
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfiguracionPage
