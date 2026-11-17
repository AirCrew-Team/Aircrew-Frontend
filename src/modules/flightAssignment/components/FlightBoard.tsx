import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { typography } from "@/App/utils/typography"
import { Tabs } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import FlightDetail from "@/modules/flightAssignment/components/FlightDetail"
import FlightList, {
  LIMIT,
  matchesFilter,
  type FlightFilter,
} from "@/modules/flightAssignment/components/FlightList"
import { dayParts } from "@/modules/flightAssignment/components/scheduleDates"
import { getDayFlights } from "@/modules/shared/flightAssignment/data/flightAssignment.data"
import type { PlannedFlight } from "@/modules/shared/flightAssignment/types/flightAssignment.types"

interface FlightBoardProps {
  // Día elegido, en ISO de solo día. La página monta un tablero por día (key), así cambiar de
  // día reinicia el filtro, el corte y la selección.
  date: string
}

// Lista de vuelos del día (1/3) y ficha del vuelo seleccionado (2/3), con el patrón de pestañas
// verticales de Recomendaciones. Guarda la selección, el filtro y el corte.
const FlightBoard = ({ date }: FlightBoardProps) => {
  const titleId = useId()
  // null: aún no se eligió ninguno, así que vale el primero por completar (o el primero).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FlightFilter>("todos")
  // Los vuelos que dejó el filtro al elegirlo (null = todos): la lista no se recalcula tras
  // una acción, solo al cambiar de filtro o de día.
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { data, isPending, isError } = useQuery({
    queryKey: ["assignment", "flights", date],
    queryFn: () => getDayFlights(date),
  })

  const { longWeekday, day } = dayParts(date)
  const flights = data ?? []
  const listed = filteredIds
    ? flights.filter((flight) => filteredIds.includes(flight.id))
    : flights
  // Los vuelos con pestaña (lo que muestra FlightList con el corte).
  const visible = expanded ? listed : listed.slice(0, LIMIT)
  // Por defecto, el primero por completar entre los visibles (o el primer visible): nunca
  // una ficha sin su pestaña.
  const selected =
    flights.find((flight) => flight.id === selectedId) ??
    visible.find((flight) => flight.status !== "confirmada") ??
    visible.at(0)

  // Si el filtro o el corte dejan fuera de la vista al vuelo seleccionado, se selecciona el
  // primero visible: nunca hay ficha sin su pestaña.
  const keepVisible = (visible: PlannedFlight[]) =>
    setSelectedId(
      selected && visible.some((flight) => flight.id === selected.id)
        ? selected.id
        : (visible.at(0)?.id ?? null)
    )

  const chooseFilter = (next: FlightFilter) => {
    const ids =
      next === "todos"
        ? null
        : flights
            .filter((flight) => matchesFilter(next, flight))
            .map((flight) => flight.id)
    setFilter(next)
    setFilteredIds(ids)
    setExpanded(false)
    keepVisible(
      (ids
        ? flights.filter((flight) => ids.includes(flight.id))
        : flights
      ).slice(0, LIMIT)
    )
  }

  const toggleExpanded = () => {
    if (expanded) keepVisible(listed.slice(0, LIMIT))
    setExpanded(!expanded)
  }

  return (
    <Tabs
      orientation="vertical"
      value={selected?.id ?? null}
      onValueChange={(value) => {
        const next = flights.find((flight) => flight.id === value)
        if (next) setSelectedId(next.id)
      }}
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
    >
      <section
        aria-labelledby={titleId}
        className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "font-bold text-brand-primary"
            )}
          >
            {`Vuelos del ${longWeekday} ${day}`}
          </h2>
          {data ? (
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              {data.length === 1 ? "1 vuelo" : `${data.length} vuelos`}
            </p>
          ) : null}
        </div>

        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodyMd, "text-muted-foreground")}
          >
            Cargando vuelos…
          </p>
        ) : isError ? (
          <p role="alert" className={cn(typography.bodyMd, "text-destructive")}>
            No se pudieron cargar los vuelos.
          </p>
        ) : (
          <FlightList
            flights={flights}
            listed={listed}
            filter={filter}
            onFilter={chooseFilter}
            expanded={expanded}
            onToggleExpanded={toggleExpanded}
            labelledBy={titleId}
          />
        )}
      </section>

      {/* key: cambiar de vuelo reinicia el puesto abierto y la alerta de la acción. */}
      {selected && listed.length > 0 ? (
        <FlightDetail
          key={selected.id}
          flight={selected}
          onActionStart={() => setSelectedId(selected.id)}
        />
      ) : null}
    </Tabs>
  )
}

export default FlightBoard
