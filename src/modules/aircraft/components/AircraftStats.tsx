import { useQuery } from "@tanstack/react-query"

import {
  CabinCrewIcon,
  ConfirmedIcon,
  FlightIcon,
  SettingsIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getAircraftStats } from "@/modules/aircraft/data/aircraft.data"

// Bloque 2: indicadores de la flota, en tarjetas pequeñas como en Usuarios y
// Certificaciones. Comparte la consulta ["aircraft", "stats"] con los conteos de los
// filtros (AircraftToolbar): TanStack Query la pide una sola vez.
const AircraftStats = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["aircraft", "stats"],
    queryFn: getAircraftStats,
  })

  // Estados de la consulta: cargando (status) o error (alert). Si falla, solo esta
  // sección muestra el error; la tabla y la barra siguen funcionando.
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

  // Los cuatro indicadores: ícono, valor, etiqueta y color del ícono.
  const stats = [
    {
      icon: FlightIcon,
      value: data.total,
      label: "Total aeronaves",
      iconBox: "border-brand-border bg-brand-neutral text-brand-secondary",
    },
    {
      icon: ConfirmedIcon,
      value: data.operational,
      label: "Operativas",
      iconBox: "border-brand-border bg-brand-neutral text-brand-secondary",
    },
    {
      icon: SettingsIcon,
      value: data.maintenance,
      label: "En mantenimiento",
      iconBox: "border-error-container bg-error-container/50 text-destructive",
    },
    {
      icon: CabinCrewIcon,
      // «3,612»: separador de miles.
      value: data.totalSeats.toLocaleString("en-US"),
      label: "Asientos totales",
      iconBox: "border-brand-border bg-brand-neutral text-brand-secondary",
    },
  ]

  return (
    // Lista de pares etiqueta/valor. Celular y tablet: 2 columnas. Desde lg: las 4 en
    // una fila; en xl, al lado del título sin encogerse (como en Usuarios).
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:shrink-0">
      {stats.map(({ icon: Icon, value, label, iconBox }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm"
        >
          {/* Ícono decorativo: el indicador ya se nombra con su etiqueta. */}
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

export default AircraftStats
