import { useState } from "react"

import type { AuthUser } from "@/App/types/auth.types"
import FdpUsageCard from "@/modules/profile/components/FdpUsageCard"
import IdentityCard from "@/modules/profile/components/IdentityCard"
import MedicalCertificateNotice from "@/modules/profile/components/MedicalCertificateNotice"
import ProfileForm from "@/modules/profile/components/ProfileForm"

interface ProfileSettingsProps {
  user: AuthUser
  isCrew: boolean
}

// Cuerpo de la Configuración: I1 (con I3 e I4 del tripulante) a la izquierda y el formulario
// a la derecha. Guarda la foto elegida porque la eligen en I1 y se guarda con el formulario.
const ProfileSettings = ({ user, isCrew }: ProfileSettingsProps) => {
  // Foto elegida: un archivo nuevo, null (quitar) o undefined (dejar la guardada).
  const [photo, setPhoto] = useState<File | null | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Tras guardar o al cancelar: vuelve a la foto guardada, sin error.
  const resetPhoto = () => {
    setPhoto(undefined)
    setPhotoError(null)
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4">
        <IdentityCard
          user={user}
          isCrew={isCrew}
          photo={photo}
          photoError={photoError}
          onPhotoChange={setPhoto}
          onPhotoError={setPhotoError}
        />
        {isCrew ? (
          <>
            <FdpUsageCard userId={user.id} />
            <MedicalCertificateNotice userId={user.id} />
          </>
        ) : null}
      </div>
      <div className="min-w-0 lg:col-span-2">
        <ProfileForm
          userId={user.id}
          isCrew={isCrew}
          photo={photo}
          onPhotoReset={resetPhoto}
        />
      </div>
    </div>
  )
}

export default ProfileSettings
