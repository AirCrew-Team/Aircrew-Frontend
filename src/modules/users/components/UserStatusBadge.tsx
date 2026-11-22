import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { CrewUser, UserStatus } from "@/modules/users/types/users.types"
import { STATUS_LABEL } from "@/modules/users/utils/userLabels"

// Colores de cada estado.
const STATUS_STYLE: Record<UserStatus, { badge: string; dot: string }> = {
  disponible: {
    badge: "bg-brand-border text-brand-primary",
    dot: "bg-brand-secondary",
  },
  guardia: {
    badge: "bg-brand-primary text-white",
    dot: "bg-brand-tertiary",
  },
  vuelo: {
    badge: "bg-accent text-brand-secondary",
    dot: "bg-brand-secondary",
  },
  permiso_medico: {
    badge: "bg-error-container text-on-error-container",
    dot: "bg-destructive",
  },
  fuera_turno: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  licencia: {
    badge: "bg-error-container text-on-error-container",
    dot: "bg-destructive",
  },
}

const pillClass = cn(
  typography.labelSm,
  "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap uppercase"
)

// Etiqueta del estado de un usuario. La usan la tabla y la ventana de detalle. Sin estado
// (administrador, o el servicio de tripulación no respondió) se muestra «—».
const UserStatusBadge = ({ status }: { status: UserStatus | null }) => {
  if (status === null) {
    return (
      <span className={cn(typography.bodySm, "text-muted-foreground")}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sin estado</span>
      </span>
    )
  }
  const { badge, dot } = STATUS_STYLE[status]
  return (
    <span className={cn(pillClass, badge)}>
      {/* Punto decorativo: el estado ya se dice con el texto. */}
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", dot)}
      />
      {STATUS_LABEL[status]}
    </span>
  )
}

// Estado de la cuenta: «Inactivo» (desactivado) o «Pendiente de activación» (aún no
// abrió su correo). Una cuenta activa no muestra nada.
export const AccountStatusTag = ({
  user,
}: {
  user: Pick<CrewUser, "isActive" | "pendingActivation">
}) => {
  if (!user.isActive) {
    return (
      <span className={cn(pillClass, "bg-muted text-muted-foreground")}>
        Inactivo
      </span>
    )
  }
  if (user.pendingActivation) {
    return (
      <span
        className={cn(
          pillClass,
          "border border-brand-tertiary bg-card text-brand-secondary"
        )}
      >
        Pendiente de activación
      </span>
    )
  }
  return null
}

export default UserStatusBadge
