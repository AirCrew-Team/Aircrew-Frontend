import { AbsenceIcon, CloseIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { DialogClose, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Encabezado fijo del popup «Detalle de la ausencia», con el estilo de los demás detalles
// (p. ej. «Detalle del Usuario»): ícono, título y la X. DialogTitle da nombre a la ventana.
const AbsenceDetailHeader = () => (
  <div className="flex items-center justify-between gap-4 bg-brand-primary px-5 py-4 text-white">
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-secondary"
      >
        <AbsenceIcon className="size-5" />
      </span>
      <DialogTitle
        className={cn(typography.headlineSm, "font-bold text-white")}
      >
        Detalle de la ausencia
      </DialogTitle>
    </div>
    <DialogClose
      aria-label="Cerrar detalle de la ausencia"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-9"
    >
      <CloseIcon aria-hidden="true" className="size-5" />
    </DialogClose>
  </div>
)

export default AbsenceDetailHeader
