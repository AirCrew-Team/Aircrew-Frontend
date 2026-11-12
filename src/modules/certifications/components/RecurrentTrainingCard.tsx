import { useQuery } from "@tanstack/react-query"

import { CalendarIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getRecurrentTraining } from "@/modules/certifications/data/certifications.data"
import { formatShortDate } from "@/modules/certifications/utils/expiry"

// T2: próximo entrenamiento recurrente en simulador.
const RecurrentTrainingCard = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "recurrentTraining"],
    queryFn: getRecurrentTraining,
  })

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-border/70 bg-card p-5 shadow-sm sm:p-6">
      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando calendario de recurrentes…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudo cargar el calendario de recurrentes.
        </p>
      ) : (
        <>
          <h2
            className={cn(
              typography.headlineSm,
              "font-bold text-balance text-brand-primary"
            )}
          >
            {data.title}
          </h2>
          <p
            className={cn(
              typography.labelSm,
              "order-first font-bold tracking-wider text-muted-foreground uppercase"
            )}
          >
            Calendario de recurrentes
          </p>
          {/* mb-2: aire mínimo sobre el recuadro cuando la tarjeta no se estira. */}
          <p className={cn(typography.bodySm, "mb-2 text-muted-foreground")}>
            Tu próximo entrenamiento en simulador de vuelo completo para la
            renovación anual está agendado en el centro de instrucción Bogotá.
          </p>
          <div className="mt-auto flex items-center gap-3 rounded-md bg-brand-neutral px-3 py-2.5">
            <CalendarIcon
              aria-hidden="true"
              className="size-6 shrink-0 text-brand-secondary"
            />
            <div className="flex min-w-0 flex-col">
              <p
                className={cn(
                  typography.labelLg,
                  "text-foreground tabular-nums"
                )}
              >
                {formatShortDate(data.startsOn)} al{" "}
                {formatShortDate(data.endsOn)}
              </p>
              <p
                className={cn(
                  typography.labelSm,
                  "break-words text-muted-foreground"
                )}
              >
                {data.location}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default RecurrentTrainingCard
