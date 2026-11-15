import { useId } from "react"

import { SecurityIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { changePassword } from "@/modules/profile/data/profile.data"
import type { UserProfile } from "@/modules/profile/types/profile.types"
import ChangePasswordPanel from "@/modules/shared/password/components/ChangePasswordPanel"

// «Último cambio: hace 42 días»; «hoy» si se acaba de cambiar.
const lastChangeText = (days: number) =>
  days === 0 ? "hoy" : `hace ${days} ${days === 1 ? "día" : "días"}`

interface SecuritySectionProps {
  userId: string
  security: UserProfile["security"]
}

// F4 (común): la contraseña, con el panel compartido y su propio botón (aparte del perfil).
const SecuritySection = ({ userId, security }: SecuritySectionProps) => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="-mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-xl border-b border-brand-neutral bg-background px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-border text-brand-primary">
            <SecurityIcon aria-hidden="true" className="size-4.5" />
          </span>
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "min-w-0 font-bold text-brand-primary"
            )}
          >
            4. Seguridad y Contraseña
          </h2>
        </div>
        <p
          className={cn(
            typography.labelSm,
            "shrink-0 rounded-sm bg-brand-border px-2 py-0.5 text-brand-secondary-hover uppercase"
          )}
        >
          Último cambio: {lastChangeText(security.lastPasswordChangeDays)}
        </p>
      </div>

      <p className={cn(typography.bodySm, "text-muted-foreground")}>
        Tu contraseña protege el acceso a tus vuelos, tus ausencias y tus datos
        de contacto.
      </p>

      <ChangePasswordPanel
        changePassword={(input) => changePassword(userId, input)}
        profileQueryKey={["profile", userId]}
      />
    </section>
  )
}

export default SecuritySection
