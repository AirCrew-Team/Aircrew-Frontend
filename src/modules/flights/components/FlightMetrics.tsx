import { useQuery } from "@tanstack/react-query"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SpokenText from "@/modules/flights/components/SpokenText"
import { getFlightMetrics } from "@/modules/flights/data/flights.data"

// 45 → «45h 00m».
const formatHours = (hours: number) =>
  `${Math.floor(hours)}h ${String(Math.round((hours % 1) * 60)).padStart(2, "0")}m`

const cardClass =
  "flex flex-col justify-between gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
const titleClass = cn(
  typography.labelSm,
  "tracking-wider text-muted-foreground uppercase"
)
const figureClass = cn(typography.headlineLg, "font-bold text-foreground")
const unitClass = cn(typography.bodyMd, "text-muted-foreground")

// M1 a M3: una sola query para las tres tarjetas del mes.
const FlightMetrics = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["flights", "metrics"],
    queryFn: getFlightMetrics,
  })

  if (isPending) {
    return (
      <p
        role="status"
        className={cn(typography.bodySm, "text-muted-foreground")}
      >
        Cargando métricas del mes…
      </p>
    )
  }

  if (isError) {
    return (
      <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
        No se pudieron cargar las métricas.
      </p>
    )
  }

  const { fdp, rest, month } = data
  const usedPercent = Math.round((fdp.usedHours / fdp.maxHours) * 100)

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <div className={cardClass}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <h2 className={titleClass}>Límite Mensual FDP</h2>
            <p
              className={cn(
                typography.labelSm,
                "rounded-full bg-brand-border px-2 py-0.5 text-brand-primary"
              )}
            >
              {fdp.regulation}
            </p>
          </div>
          <p className="flex flex-wrap items-baseline gap-1">
            <span className={figureClass}>
              <SpokenText text={formatHours(fdp.usedHours)} />
            </span>{" "}
            <span className={unitClass}>
              <SpokenText text={`/ ${fdp.maxHours}h máx legal`} />
            </span>
          </p>
          <p
            className={cn(
              typography.bodySm,
              "font-medium text-brand-secondary"
            )}
          >
            <SpokenText
              text={`+${fdp.maxHours - fdp.usedHours}h de margen disponible seguro`}
            />
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div
            role="meter"
            aria-label="Consumo FDP mensual"
            aria-valuemin={0}
            aria-valuemax={fdp.maxHours}
            aria-valuenow={fdp.usedHours}
            aria-valuetext={`${fdp.usedHours} de ${fdp.maxHours} horas`}
            className="h-2 w-full overflow-hidden rounded-full bg-brand-neutral forced-colors:border"
          >
            {/* En colores forzados el fondo desaparece: el relleno usa el color de texto del sistema. */}
            <div
              className="h-full rounded-full bg-brand-secondary forced-colors:bg-[color:CanvasText] forced-colors:forced-color-adjust-none"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p
            className={cn(
              typography.labelSm,
              "flex flex-wrap justify-between gap-x-2 text-muted-foreground"
            )}
          >
            <span>Acumulado: {usedPercent}%</span>{" "}
            <span>Ciclo cierra en {fdp.cycleClosesInDays} días</span>
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <h2 className={titleClass}>Descanso Reglamentario</h2>
            <p
              className={cn(
                typography.labelSm,
                "flex items-center gap-1 text-brand-secondary"
              )}
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-brand-secondary"
              />
              {rest.status}
            </p>
          </div>
          <p className="flex flex-wrap items-baseline gap-1">
            <span className={figureClass}>
              <SpokenText text={rest.guaranteed} />
            </span>{" "}
            <span className={unitClass}>garantizadas</span>
          </p>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            <SpokenText text={rest.note} />
          </p>
        </div>
        <p
          className={cn(
            typography.labelSm,
            "flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md bg-muted p-2"
          )}
        >
          <span className="text-muted-foreground">
            Fin de descanso en base:
          </span>{" "}
          <span className="text-foreground">{rest.endsAt}</span>
        </p>
      </div>

      <div className={cardClass}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <h2 className={titleClass}>Vuelos este Mes</h2>
            <p className={cn(typography.labelSm, "text-muted-foreground")}>
              {month.label}
            </p>
          </div>
          <p className="flex flex-wrap items-baseline gap-1">
            <span className={figureClass}>{month.completedSectors}</span>{" "}
            <span className={unitClass}>sectores completados</span>
          </p>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            {month.crewDelays} demoras operacionales atribuibles a tripulación
          </p>
        </div>
        <div className={cn(typography.labelSm, "grid grid-cols-2 gap-1")}>
          {/* Los 10 px de la referencia suben a 11 px (labelSm del contenedor). */}
          <p className="flex flex-col rounded-sm bg-muted p-2 text-center">
            <span className="font-bold text-foreground">
              {month.domestic} Nac.
            </span>{" "}
            <span className="font-medium text-muted-foreground">
              Domésticos
            </span>
          </p>
          <p className="flex flex-col rounded-sm bg-muted p-2 text-center">
            <span className="font-bold text-foreground">
              {month.international} Int.
            </span>{" "}
            <span className="font-medium text-muted-foreground">
              Troncales MIA/LIM
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default FlightMetrics
