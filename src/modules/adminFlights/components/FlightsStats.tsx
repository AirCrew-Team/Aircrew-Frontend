import { useQuery } from "@tanstack/react-query"

import {
  CalendarIcon,
  ClockIcon,
  FlightIcon,
  PositionIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { useFlightsAdminApi } from "@/modules/adminFlights/hooks/useFlightsAdminApi"

// Bloque 2: indicadores de los vuelos, como en Aeronaves. Comparte la consulta
// ["adminFlights", "stats"] con los conteos de los filtros (FlightsToolbar).
const FlightsStats = () => {
  const { getFlightsStats } = useFlightsAdminApi()
  const { data, isPending, isError } = useQuery({
    queryKey: ["adminFlights", "stats"],
    queryFn: getFlightsStats,
  })

  if (isPending) {
    return (
      <p
        role="status"
        className={cn(typography.bodySm, "text-muted-foreground")}
      >
        Cargando indicadores…
      </p>
    )
  }

  if (isError) {
    return (
      <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
        No se pudieron cargar los indicadores.
      </p>
    )
  }

  const neutral = "border-brand-border bg-brand-neutral text-brand-secondary"
  // «Sin tripulación» en ámbar: es lo que el supervisor tiene pendiente.
  const stats = [
    {
      icon: FlightIcon,
      value: data.total,
      label: "Total vuelos",
      iconBox: neutral,
    },
    { icon: CalendarIcon, value: data.today, label: "Hoy", iconBox: neutral },
    {
      icon: PositionIcon,
      value: data.withoutCrew,
      label: "Sin tripulación",
      iconBox: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      icon: ClockIcon,
      value: data.byStatus.retrasado,
      label: "Retrasados",
      iconBox: neutral,
    },
  ]

  return (
    // Celular y tablet: 2 columnas. Desde lg: las 4 en una fila; en xl, al lado del
    // título sin encogerse.
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:shrink-0">
      {stats.map(({ icon: Icon, value, label, iconBox }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md border",
              iconBox
            )}
          >
            <Icon className="size-4.5" />
          </span>
          {/* flex-col-reverse: el número se ve arriba, pero el lector lee primero la etiqueta. */}
          <div className="flex min-w-0 flex-col-reverse">
            <dt
              className={cn(
                typography.labelSm,
                "text-muted-foreground uppercase"
              )}
            >
              {label}
            </dt>
            <dd
              className={cn(
                typography.headlineSm,
                "font-bold text-brand-primary tabular-nums"
              )}
            >
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

export default FlightsStats
