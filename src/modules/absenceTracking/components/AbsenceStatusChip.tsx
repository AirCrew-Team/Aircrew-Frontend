import type { Absence } from "@/App/types/absences.types"
import { ClockIcon, ConfirmedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface AbsenceStatusChipProps {
  status: Absence["status"]
}

// Estado de una ausencia real (tarjeta y popup): siempre con texto, el color solo acompaña.
const AbsenceStatusChip = ({ status }: AbsenceStatusChipProps) => {
  const Icon = status === "covered" ? ConfirmedIcon : ClockIcon
  return (
    <p
      className={cn(
        typography.labelSm,
        "inline-flex items-center gap-1 rounded-full bg-brand-neutral px-2.5 py-1",
        status === "covered" ? "text-brand-primary" : "text-brand-secondary"
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {status === "covered" ? "Cubierta" : "Pendiente de reemplazo"}
    </p>
  )
}

export default AbsenceStatusChip
