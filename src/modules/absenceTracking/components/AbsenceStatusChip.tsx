import type { Absence } from "@/App/types/absences.types"
import {
  ClockIcon,
  CloseIcon,
  ConfirmedIcon,
  DurationIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface AbsenceStatusChipProps {
  status: Absence["status"]
}

// Texto, ícono y color de cada estado. El texto distingue los estados; el ícono y el color
// solo acompañan.
const CHIP: Record<
  Absence["status"],
  { label: string; Icon: typeof ClockIcon; className: string }
> = {
  reported: {
    label: "Pendiente de reemplazo",
    Icon: ClockIcon,
    className: "text-brand-secondary",
  },
  pending_ack: {
    label: "Esperando confirmación",
    Icon: DurationIcon,
    className: "text-brand-secondary",
  },
  covered: {
    label: "Cubierta",
    Icon: ConfirmedIcon,
    className: "text-brand-primary",
  },
  // Solo en el popup: una ausencia cancelada después de cargar el tablero.
  cancelled: {
    label: "Cancelada",
    Icon: CloseIcon,
    className: "text-muted-foreground",
  },
}

// Estado de una ausencia real (tarjeta, popup y cada vuelo del popup).
const AbsenceStatusChip = ({ status }: AbsenceStatusChipProps) => {
  const { label, Icon, className } = CHIP[status]
  return (
    <p
      className={cn(
        typography.labelSm,
        "inline-flex items-center gap-1 rounded-full bg-brand-neutral px-2.5 py-1",
        className
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {label}
    </p>
  )
}

export default AbsenceStatusChip
