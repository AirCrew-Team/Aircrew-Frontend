import { CertificationIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// C: antetítulo, h1 y descripción.
const CertificationsHeader = () => {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6">
      <p
        className={cn(
          typography.labelSm,
          "flex items-start gap-1 tracking-wider text-brand-secondary uppercase"
        )}
      >
        <CertificationIcon aria-hidden="true" className="size-3.5 shrink-0" />
        Auditoría RAC / DGAC • Expediente de Vuelo
      </p>
      <h1
        className={cn(
          typography.headlineLg,
          "font-bold tracking-tight text-balance text-brand-primary"
        )}
      >
        Certificaciones y Licencias
      </h1>
      <p className={cn(typography.bodyMd, "max-w-2xl text-muted-foreground")}>
        Registro oficial de aptitud técnica y médica auditado por la Aeronáutica
        Civil (Aerocivil / RAC). Consulta oficial de solo lectura.
      </p>
    </div>
  )
}

export default CertificationsHeader
