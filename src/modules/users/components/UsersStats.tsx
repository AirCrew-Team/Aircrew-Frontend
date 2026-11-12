import { useQuery } from "@tanstack/react-query"

import {
  CertificationIcon,
  ClockIcon,
  DepartureIcon,
  PositionIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getUsersStats } from "@/modules/users/data/users.data"

// Bloque 2: indicadores de la nómina. Comparte la consulta ["users", "stats"] con los
// conteos de los filtros (UsersToolbar): TanStack Query la pide una sola vez.
const UsersStats = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["users", "stats"],
    queryFn: getUsersStats,
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

  // Los cuatro indicadores del diseño, en orden: ícono, valor y etiqueta de cada uno.
  const stats = [
    { icon: PositionIcon, value: data.total, label: "Total dotación" },
    { icon: DepartureIcon, value: data.inFlight, label: "En vuelo" },
    { icon: ClockIcon, value: data.onDuty, label: "En guardia" },
    {
      icon: CertificationIcon,
      value: `${data.medicalFitnessPercent}%`,
      label: "Aptitud médica",
    },
  ]

  return (
    // Lista de pares etiqueta/valor. Celular y tablet: 2 columnas. Desde lg: las 4 en
    // una fila (con espacio suficiente para «Total dotación» sin cortarse).
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:shrink-0">
      {stats.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm"
        >
          {/* Ícono decorativo: el indicador ya se nombra con su etiqueta. */}
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-neutral text-brand-secondary"
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

export default UsersStats
