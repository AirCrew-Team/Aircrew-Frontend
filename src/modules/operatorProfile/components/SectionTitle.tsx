import type { ComponentType, ReactNode, SVGProps } from "react"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface SectionTitleProps {
  id: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  // Título numerado, ej. "1. Información Personal".
  title: string
  description: string
  // Contenido a la derecha, ej. «Último cambio: hace 42 días».
  aside?: ReactNode
}

// Encabezado de cada sección numerada: ícono, título (h2), descripción y un dato opcional.
const SectionTitle = ({
  id,
  icon: Icon,
  title,
  description,
  aside,
}: SectionTitleProps) => (
  <div className="flex flex-wrap items-start justify-between gap-2">
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-neutral text-brand-secondary"
      >
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <h2
          id={id}
          className={cn(typography.headlineSm, "font-bold text-brand-primary")}
        >
          {title}
        </h2>
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          {description}
        </p>
      </div>
    </div>
    {aside}
  </div>
)

export default SectionTitle
