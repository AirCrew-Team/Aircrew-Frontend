import type { ReactNode } from "react"

import { CloseIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface FlightDialogHeaderProps {
  // Ícono de la ventana (decorativo).
  icon: ReactNode
  title: string
  description: string
  // Texto de la X para el lector de pantalla, ej. "Cerrar formulario de vuelo".
  closeLabel: string
  // A la derecha del título, ej. la etiqueta de estado.
  trailing?: ReactNode
}

// Encabezado azul oscuro de las ventanas de Vuelos, como en Aeronaves y
// Certificaciones. DialogTitle y DialogDescription dan nombre y descripción a la ventana.
const FlightDialogHeader = ({
  icon,
  title,
  description,
  closeLabel,
  trailing,
}: FlightDialogHeaderProps) => (
  <div className="flex items-center justify-between gap-3 bg-brand-primary px-5 py-4 text-white">
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-secondary"
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <DialogTitle
          className={cn(typography.headlineSm, "font-bold text-white")}
        >
          {title}
        </DialogTitle>
        <DialogDescription className={cn(typography.labelSm, "text-white/70")}>
          {description}
        </DialogDescription>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {trailing}
      <DialogClose
        aria-label={closeLabel}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-9"
      >
        <CloseIcon aria-hidden="true" className="size-5" />
      </DialogClose>
    </div>
  </div>
)

export default FlightDialogHeader
