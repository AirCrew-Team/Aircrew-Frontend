import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { UserStatus } from "@/modules/users/types/users.types"

// Texto y colores de cada estado.
const STATUS: Record<
  UserStatus,
  { label: string; badge: string; dot: string }
> = {
  disponible: {
    label: "Disponible",
    badge: "bg-brand-border text-brand-primary",
    dot: "bg-brand-secondary",
  },
  guardia: {
    label: "En guardia",
    badge: "bg-brand-primary text-white",
    dot: "bg-brand-tertiary",
  },
  vuelo: {
    label: "En vuelo",
    badge: "bg-accent text-brand-secondary",
    dot: "bg-brand-secondary",
  },
  permiso_medico: {
    label: "Permiso médico",
    badge: "bg-error-container text-on-error-container",
    dot: "bg-destructive",
  },
}

// Etiqueta del estado de un usuario. La usan la tabla y la ventana de detalle.
const UserStatusBadge = ({ status }: { status: UserStatus }) => {
  const { label, badge, dot } = STATUS[status]
  return (
    <span
      className={cn(
        typography.labelSm,
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap uppercase",
        badge
      )}
    >
      {/* Punto decorativo: el estado ya se dice con el texto. */}
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", dot)}
      />
      {label}
    </span>
  )
}

export default UserStatusBadge
