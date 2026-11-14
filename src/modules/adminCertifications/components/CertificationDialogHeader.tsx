import type { ReactNode } from "react"

import { CloseIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface CertificationDialogHeaderProps {
  // Recuadro de la izquierda: el ícono de la ventana o el avatar del tripulante.
  leading: ReactNode
  title: string
  description: string
  // Contenido a la izquierda de la X, ej. la etiqueta de estado.
  trailing?: ReactNode
  // Texto de la X para el lector de pantalla, ej. "Cerrar ficha de certificación".
  closeLabel: string
}

// Encabezado azul oscuro de las ventanas de Certificaciones (ficha y formulario).
// DialogTitle y DialogDescription dan nombre y descripción a la ventana.
const CertificationDialogHeader = ({
  leading,
  title,
  description,
  trailing,
  closeLabel,
}: CertificationDialogHeaderProps) => (
  <div className="flex items-center justify-between gap-3 bg-brand-primary px-5 py-4 text-white">
    <div className="flex min-w-0 items-center gap-3">
      {leading}
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

export default CertificationDialogHeader
