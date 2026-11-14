import { useId } from "react"

import { LockIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import ChangePasswordPanel from "@/modules/operatorProfile/components/ChangePasswordPanel"
import { sectionClass } from "@/modules/operatorProfile/components/formStyles"
import SectionTitle from "@/modules/operatorProfile/components/SectionTitle"
import type { OperatorProfile } from "@/modules/operatorProfile/types/operatorProfile.types"

// «Último cambio: hace 42 días»; «hoy» si se acaba de cambiar.
const lastChangeText = (days: number) =>
  days === 0 ? "hoy" : `hace ${days} ${days === 1 ? "día" : "días"}`

interface SecuritySectionProps {
  userId: string
  profile: OperatorProfile
}

// 2. Seguridad y Contraseña: el cambio de contraseña, con su propio botón (aparte del perfil).
const SecuritySection = ({ userId, profile }: SecuritySectionProps) => {
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <SectionTitle
        id={`${id}-title`}
        icon={LockIcon}
        title="2. Seguridad y Contraseña"
        description="Protección de acceso al control de itinerarios y tripulación."
        aside={
          <p
            className={cn(
              typography.labelSm,
              "rounded-full bg-brand-neutral px-2.5 py-1 text-brand-secondary"
            )}
          >
            Último cambio:{" "}
            {lastChangeText(profile.security.lastPasswordChangeDays)}
          </p>
        }
      />

      <ChangePasswordPanel userId={userId} />
    </section>
  )
}

export default SecuritySection
