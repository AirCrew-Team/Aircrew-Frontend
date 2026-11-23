import { myProfileQueryKey } from "@/App/actions/profile/profile.actions"
import { SecurityIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SectionCard from "@/modules/profile/components/SectionCard"
import ChangePasswordPanel from "@/modules/shared/password/components/ChangePasswordPanel"

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

// «hace 42 días», o «hoy» si fue el mismo día (días de calendario en hora local).
const lastChangeText = (changedAt: string | null) => {
  if (!changedAt) return "Sin registro"
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(changedAt))) / DAY_MS
  )
  if (days <= 0) return "hoy"
  return `hace ${days} ${days === 1 ? "día" : "días"}`
}

interface SecuritySectionProps {
  number: number
  userId: string
  // password_changed_at del perfil; undefined en las cuentas demo (no se muestra).
  passwordChangedAt: string | null | undefined
  disabled: boolean
}

// Seguridad (común): el último cambio y el panel compartido, con su propio botón y su
// propia petición (aparte de «Guardar cambios»).
const SecuritySection = ({
  number,
  userId,
  passwordChangedAt,
  disabled,
}: SecuritySectionProps) => {
  return (
    <SectionCard
      title={`${number}. Seguridad`}
      icon={<SecurityIcon aria-hidden="true" className="size-4.5" />}
    >
      {passwordChangedAt === undefined ? null : (
        <p className={cn(typography.bodyMd, "text-brand-primary")}>
          Último cambio de contraseña: {lastChangeText(passwordChangedAt)}
        </p>
      )}

      <ChangePasswordPanel
        profileQueryKey={myProfileQueryKey(userId)}
        disabled={disabled}
      />
    </SectionCard>
  )
}

export default SecuritySection
