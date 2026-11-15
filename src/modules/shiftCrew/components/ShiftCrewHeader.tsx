import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// C: antetítulo, h1 y descripción de la pantalla.
const ShiftCrewHeader = () => (
  <div className="flex flex-col gap-1">
    <p
      className={cn(
        typography.labelSm,
        "tracking-wider text-brand-secondary uppercase"
      )}
    >
      Tripulación del turno · Hoy · Horas en UTC
    </p>
    <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
      Tripulación
    </h1>
    <p className={cn(typography.bodyMd, "text-muted-foreground")}>
      Quién de tu base está disponible durante el turno.
    </p>
  </div>
)

export default ShiftCrewHeader
