import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewProfile } from "@/modules/profile/data/profile.data"

interface FdpUsageCardProps {
  userId: string
}

// I3 (tripulante): consumo mensual del FDP frente al máximo legal.
const FdpUsageCard = ({ userId }: FdpUsageCardProps) => {
  const titleId = useId()
  const { data, isPending, isError } = useQuery({
    queryKey: ["profile", "crew", userId],
    queryFn: () => getCrewProfile(userId),
  })

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2
          id={titleId}
          className={cn(
            typography.labelSm,
            "tracking-wider text-muted-foreground uppercase"
          )}
        >
          Consumo FDP Mensual
        </h2>
        {data ? (
          <p
            className={cn(
              typography.labelSm,
              "font-bold text-brand-secondary uppercase"
            )}
          >
            {((data.fdp.usedHours / data.fdp.maxHours) * 100).toFixed(1)}%
            utilizado
          </p>
        ) : null}
      </div>
      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando datos de vuelo…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudieron cargar los datos de vuelo.
        </p>
      ) : (
        <>
          <div
            role="meter"
            aria-labelledby={titleId}
            aria-valuemin={0}
            aria-valuemax={data.fdp.maxHours}
            aria-valuenow={data.fdp.usedHours}
            aria-valuetext={`${data.fdp.usedHours} de ${data.fdp.maxHours} horas`}
            className="h-2.5 w-full overflow-hidden rounded-full bg-brand-neutral forced-colors:border"
          >
            {/* En colores forzados el fondo desaparece: el relleno usa el color de texto del sistema. */}
            <div
              className="h-full rounded-full bg-brand-secondary forced-colors:bg-[color:CanvasText] forced-colors:forced-color-adjust-none"
              style={{
                width: `${(data.fdp.usedHours / data.fdp.maxHours) * 100}%`,
              }}
            />
          </div>
          <div
            className={cn(
              typography.labelSm,
              "flex flex-wrap justify-between gap-x-2 pt-0.5 text-muted-foreground"
            )}
          >
            <span>{data.fdp.usedHours}h computadas</span>
            <span className="font-semibold text-brand-primary">
              {data.fdp.maxHours}h máx legal
            </span>
          </div>
        </>
      )}
    </section>
  )
}

export default FdpUsageCard
