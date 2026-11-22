import { useId, type ReactNode } from "react"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  // Con su número delante, por ejemplo «1. Contacto».
  title: string
  icon: ReactNode
  // Rótulo a la derecha del título (p. ej. «Solo lectura»).
  aside?: ReactNode
  children: ReactNode
}

// Bloque numerado del formulario: <section> con su h2 en una banda superior. El h2 se
// pinta siempre, también mientras el contenido del bloque carga.
const SectionCard = ({ title, icon, aside, children }: SectionCardProps) => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="-mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-xl border-b border-brand-neutral bg-background px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-border text-brand-primary">
            {icon}
          </span>
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "min-w-0 font-bold text-brand-primary"
            )}
          >
            {title}
          </h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

export default SectionCard
