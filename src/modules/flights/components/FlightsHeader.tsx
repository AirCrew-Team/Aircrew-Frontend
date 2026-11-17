import { CalendarIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// C: antetítulo, h1 y descripción.
const FlightsHeader = () => {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p
        className={cn(
          typography.labelSm,
          "flex items-center gap-1 tracking-wider text-brand-secondary uppercase"
        )}
      >
        <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
        Roster Operativo • Itinerario Mensual
      </p>
      <h1
        className={cn(
          typography.headlineLg,
          "font-bold tracking-tight text-balance text-brand-primary"
        )}
      >
        Mis Vuelos Asignados
      </h1>
      <p className={cn(typography.bodyMd, "max-w-2xl text-muted-foreground")}>
        Gestión de itinerarios, vuelos programados y seguimiento de horas
        reglamentarias FDP (RAC 121).
      </p>
    </div>
  )
}

export default FlightsHeader
