import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface ConfirmCrewBarProps {
  emptyCount: number
  // Puestos del vuelo: a cuántos tripulantes se avisará.
  total: number
  // Solo con el estado «completa».
  canConfirm: boolean
  disabled: boolean
  onConfirm: () => void
}

// Barra de confirmación: cuántos puestos faltan y el botón para confirmar y avisar.
const ConfirmCrewBar = ({
  emptyCount,
  total,
  canConfirm,
  disabled,
  onConfirm,
}: ConfirmCrewBarProps) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card p-4 shadow-sm">
    <p
      className={cn(
        typography.bodyMd,
        "min-w-0 grow basis-64 text-muted-foreground"
      )}
    >
      {emptyCount === 0
        ? `Tripulación completa. Al confirmar se avisará a los ${total} tripulantes.`
        : `${emptyCount === 1 ? "Falta 1 puesto" : `Faltan ${emptyCount} puestos`}. Completa la tripulación para confirmarla y avisar a cada tripulante.`}
    </p>
    <button
      type="button"
      data-focus-id="confirm"
      disabled={disabled || !canConfirm}
      onClick={onConfirm}
      className={cn(
        typography.labelLg,
        "min-h-11 w-full rounded-md bg-brand-secondary px-6 py-2 text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden enabled:hover:bg-brand-secondary-hover enabled:active:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:w-auto lg:min-h-9"
      )}
    >
      Confirmar tripulación
    </button>
  </div>
)

export default ConfirmCrewBar
