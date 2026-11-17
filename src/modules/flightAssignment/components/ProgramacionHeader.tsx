import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Antetítulo, h1 y descripción de la pantalla.
const ProgramacionHeader = () => (
  <div className="flex flex-col gap-1">
    <p
      className={cn(
        typography.labelSm,
        "flex items-start gap-1.5 tracking-wider text-brand-secondary uppercase before:mt-0.75 before:size-2 before:shrink-0 before:rounded-full before:bg-brand-secondary"
      )}
    >
      Programación de tripulaciones · Base Eldorado · BOG · Horas en UTC
    </p>
    <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
      Programación
    </h1>
    <p className={cn(typography.bodyMd, "text-muted-foreground")}>
      Asigna la tripulación de los vuelos que salen de tu base.
    </p>
  </div>
)

export default ProgramacionHeader
