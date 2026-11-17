import type { ComponentType, SVGProps } from "react"

import { CloseIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface UserDialogHeaderProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description: string
  // Texto del botón X para el lector de pantalla, ej. "Cerrar detalle del usuario".
  closeLabel: string
}

// Encabezado azul oscuro de las ventanas de Usuarios (detalle y creación): ícono, título,
// descripción y la X. DialogTitle y DialogDescription dan nombre y descripción a la ventana.
const UserDialogHeader = ({
  icon: Icon,
  title,
  description,
  closeLabel,
}: UserDialogHeaderProps) => (
  <div className="flex items-center justify-between gap-4 bg-brand-primary px-5 py-4 text-white">
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-secondary"
      >
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <DialogTitle
          className={cn(typography.headlineSm, "font-bold text-white")}
        >
          {title}
        </DialogTitle>
        <DialogDescription
          className={cn(typography.labelSm, "text-white/70 uppercase")}
        >
          {description}
        </DialogDescription>
      </div>
    </div>
    <DialogClose
      aria-label={closeLabel}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-9"
    >
      <CloseIcon aria-hidden="true" className="size-5" />
    </DialogClose>
  </div>
)

export default UserDialogHeader
