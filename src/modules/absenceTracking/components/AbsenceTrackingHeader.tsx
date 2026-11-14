import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// C: antetítulo, h1 y descripción de la pantalla.
const AbsenceTrackingHeader = () => (
  <div className="flex flex-col gap-1">
    <p
      className={cn(
        typography.labelSm,
        "tracking-wider text-brand-secondary uppercase"
      )}
    >
      Seguimiento de ausencias · Hoy · Horas en UTC
    </p>
    <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
      Ausencias
    </h1>
    <p className={cn(typography.bodyMd, "text-muted-foreground")}>
      Estado del reemplazo de cada ausencia reportada en el turno.
    </p>
  </div>
)

export default AbsenceTrackingHeader
