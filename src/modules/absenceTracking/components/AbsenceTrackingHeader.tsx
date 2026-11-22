import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// C: antetítulo, h1 y descripción de la pantalla. La sesión real ve todas las ausencias,
// no solo las de hoy ni las del turno.
const AbsenceTrackingHeader = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))

  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          typography.labelSm,
          "tracking-wider text-brand-secondary uppercase"
        )}
      >
        {isDemo
          ? "Seguimiento de ausencias · Hoy · Horas en UTC"
          : "Seguimiento de ausencias · Horas en UTC"}
      </p>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Ausencias
      </h1>
      <p className={cn(typography.bodyMd, "text-muted-foreground")}>
        {isDemo
          ? "Estado del reemplazo de cada ausencia reportada en el turno."
          : "Estado del reemplazo de cada ausencia reportada."}
      </p>
    </div>
  )
}

export default AbsenceTrackingHeader
