import { MedicalServiceIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// R3: servicio médico de base (estático, sin encabezado).
const MedicalServiceNotice = () => {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-brand-border bg-muted p-4">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-border-strong text-muted-foreground"
      >
        <MedicalServiceIcon className="size-5" />
      </span>
      <p className="flex min-w-0 flex-col">
        <span
          className={cn(typography.labelMd, "font-semibold text-brand-primary")}
        >
          Servicio Médico de Base
        </span>
        <span className={cn(typography.bodySm, "text-muted-foreground")}>
          Consultorio Muelle Nacional T1 disponible para valoración prioritaria.
        </span>
      </p>
    </div>
  )
}

export default MedicalServiceNotice
