import { useQuery } from "@tanstack/react-query"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { dayParts } from "@/modules/flightAssignment/components/scheduleDates"
import { getScheduleDays } from "@/modules/shared/flightAssignment/data/flightAssignment.data"
import type { ScheduleDay } from "@/modules/shared/flightAssignment/types/flightAssignment.types"

interface DaySelectorProps {
  // Hoy a hoy + 6, en ISO de solo día.
  dates: string[]
  selectedIndex: number
  onSelect: (index: number) => void
}

// «6 vuelos · 3 por completar», «1 vuelo · listo», «5 vuelos · listos».
const summaryOf = ({ flightCount, pendingCount }: ScheduleDay) => {
  const flights = flightCount === 1 ? "1 vuelo" : `${flightCount} vuelos`
  if (pendingCount > 0) return `${flights} · ${pendingCount} por completar`
  return `${flights} · ${flightCount === 1 ? "listo" : "listos"}`
}

// Grupo «Día»: un botón por día con su resumen. Los botones se ven aunque los resúmenes
// estén cargando o hayan fallado; el estado de la consulta va dentro del grupo.
const DaySelector = ({ dates, selectedIndex, onSelect }: DaySelectorProps) => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["assignment", "days"],
    queryFn: getScheduleDays,
  })

  return (
    <div
      role="group"
      aria-label="Día"
      className="-mx-4 -my-2 grid snap-x scroll-px-4 grid-cols-[repeat(7,minmax(8rem,1fr))] gap-2 overflow-x-auto px-4 py-2 md:-mx-8 md:scroll-px-8 md:px-8 lg:m-0 lg:grid-cols-7 lg:overflow-visible lg:p-0"
    >
      {dates.map((date, index) => {
        const { weekday, day, month } = dayParts(date)
        const summary = data?.find((item) => item.date === date)
        const pressed = index === selectedIndex
        return (
          <button
            key={date}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(index)}
            className={cn(
              "flex min-h-11 snap-start flex-col items-start gap-0.5 rounded-xl p-3 text-left shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden motion-reduce:transition-none forced-colors:aria-pressed:underline forced-colors:aria-pressed:decoration-2 forced-colors:aria-pressed:underline-offset-4",
              pressed
                ? "bg-brand-primary text-white shadow-md ring-2 ring-brand-secondary"
                : "bg-card text-brand-primary hover:bg-muted active:bg-brand-neutral"
            )}
          >
            <span
              className={cn(
                typography.labelSm,
                "uppercase",
                pressed ? "text-brand-border" : "text-muted-foreground"
              )}
            >
              {index === 0 ? `Hoy · ${weekday}` : weekday}
            </span>{" "}
            <span
              className={cn(typography.headlineSm, "font-bold tabular-nums")}
            >
              {`${day} ${month}`}
            </span>
            {summary ? (
              <>
                {" "}
                <span
                  className={cn(
                    typography.bodySm,
                    pressed
                      ? "font-semibold text-white"
                      : summary.pendingCount > 0
                        ? "font-semibold text-brand-secondary"
                        : "text-muted-foreground"
                  )}
                >
                  {summaryOf(summary)}
                </span>
              </>
            ) : null}
          </button>
        )
      })}
      {isPending ? (
        <p
          role="status"
          className={cn(
            typography.bodySm,
            "col-span-full text-muted-foreground"
          )}
        >
          Cargando días…
        </p>
      ) : isError ? (
        <p
          role="alert"
          className={cn(typography.bodySm, "col-span-full text-destructive")}
        >
          No se pudo cargar la programación.
        </p>
      ) : null}
    </div>
  )
}

export default DaySelector
