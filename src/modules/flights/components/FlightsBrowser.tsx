import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { FilterIcon, SearchIcon } from "@/App/utils/icons"
import { normalizeForSearch } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import FlightCard from "@/modules/flights/components/FlightCard"
import {
  getFlightHistory,
  getUpcomingFlights,
} from "@/modules/flights/data/flights.data"
import type { CrewFlight } from "@/modules/flights/types/flights.types"

type FlightsTab = "upcoming" | "history"

const TABS: { value: FlightsTab; label: string }[] = [
  { value: "upcoming", label: "Próximos Vuelos" },
  { value: "history", label: "Historial de Vuelos Anteriores" },
]

const MONTHS = [
  { value: "2024-09", label: "Septiembre 2024", short: "Septiembre 2024" },
  { value: "2024-10", label: "Octubre 2024 (Actual)", short: "Octubre 2024" },
  { value: "2024-11", label: "Noviembre 2024", short: "Noviembre 2024" },
]

const matchesSearch = (flight: CrewFlight, search: string) =>
  [
    flight.flightNumber,
    flight.origin.code,
    flight.origin.city,
    flight.destination.code,
    flight.destination.city,
  ].some((value) => normalizeForSearch(value).includes(search))

// Borde muted-foreground/70 (4.06:1 sobre blanco): brand-border (1.34:1) no delimita un campo.
const controlClass = cn(
  typography.labelMd,
  "min-h-11 rounded-sm border border-muted-foreground/70 bg-card text-foreground shadow-xs transition-colors hover:border-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none lg:min-h-9"
)

// B: pestañas, buscador, mes y filtros, con la lista de la pestaña activa.
// Las dos listas se piden al entrar porque las pestañas muestran sus conteos.
const FlightsBrowser = () => {
  const id = useId()
  const [tab, setTab] = useState<FlightsTab>("upcoming")
  const [search, setSearch] = useState("")
  const [month, setMonth] = useState("2024-10")

  const upcoming = useQuery({
    queryKey: ["flights", "upcoming"],
    queryFn: getUpcomingFlights,
  })
  const history = useQuery({
    queryKey: ["flights", "history"],
    queryFn: getFlightHistory,
  })

  const query = search.trim()
  const normalizedQuery = normalizeForSearch(query)
  const lists = TABS.map(({ value, label }) => {
    const { data, isPending, isError } =
      value === "upcoming" ? upcoming : history
    const monthFlights = data?.filter((flight) => flight.month === month)
    const visible = monthFlights?.filter((flight) =>
      matchesSearch(flight, normalizedQuery)
    )
    return { value, label, isPending, isError, monthFlights, visible }
  })

  const active = lists.find((list) => list.value === tab)
  const monthLabel = MONTHS.find((option) => option.value === month)?.short
  const results = active?.visible
    ? `${active.visible.length} ${active.visible.length === 1 ? "vuelo" : "vuelos"} en ${active.label}, ${monthLabel}`
    : ""

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = TABS.find((option) => option.value === value)
        if (next) setTab(next.value)
      }}
      className="gap-4"
    >
      <div className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <TabsList
          aria-label="Vuelos del roster"
          className="w-full flex-wrap gap-1 rounded-md bg-brand-neutral p-1 group-data-horizontal/tabs:h-auto sm:w-fit"
        >
          {lists.map(({ value, label, monthFlights }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                typography.labelLg,
                // Inactiva en muted-foreground (8.1:1); el text-foreground/60 de shadcn da 4.4:1.
                // En colores forzados el fondo blanco desaparece: la activa se subraya.
                "h-auto min-h-11 gap-2 rounded-sm px-4 py-1.5 whitespace-normal text-muted-foreground transition-colors not-data-active:hover:bg-card/60 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none lg:min-h-9 data-active:bg-card forced-colors:data-active:underline forced-colors:data-active:decoration-2 forced-colors:data-active:underline-offset-4"
              )}
            >
              <span>{label}</span>
              {monthFlights ? (
                <>
                  {" "}
                  <span
                    className={cn(
                      typography.labelSm,
                      "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 tabular-nums",
                      value === tab
                        ? "bg-brand-secondary font-bold text-white"
                        : "bg-brand-border-strong text-muted-foreground"
                    )}
                  >
                    {monthFlights.length}
                  </span>
                </>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {/* En móvil el buscador ocupa su fila; desde sm comparte fila con el mes. */}
          <div className="relative min-w-0 flex-1 basis-full sm:w-64 sm:basis-auto">
            <label htmlFor={`${id}-search`} className="sr-only">
              Buscar vuelo
            </label>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar vuelo (ej. AV-9344, MIA)…"
              className={cn(
                controlClass,
                typography.bodySm,
                // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
                "w-full py-1.5 pr-3 pl-9 placeholder:text-muted-foreground max-lg:text-base max-lg:leading-6"
              )}
            />
          </div>
          <div className="flex flex-1 items-center gap-2 sm:flex-none">
            <label htmlFor={`${id}-month`} className="sr-only">
              Mes del roster
            </label>
            <select
              id={`${id}-month`}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={cn(
                controlClass,
                "min-w-0 flex-1 px-3 py-1.5 max-lg:text-base max-lg:leading-6 sm:flex-none"
              )}
            >
              {MONTHS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-disabled="true"
              aria-label="Filtrar por aeronave, próximamente"
              className={cn(
                controlClass,
                // Deshabilitado: borde e ícono atenuados (exentos de 1.4.11), sin hover.
                "inline-flex min-w-11 shrink-0 cursor-not-allowed items-center justify-center gap-1.5 border-brand-border text-muted-foreground hover:border-brand-border sm:px-3 lg:min-w-9"
              )}
            >
              <FilterIcon aria-hidden="true" className="size-5 opacity-60" />
              <span className="hidden sm:inline">Próximamente</span>
            </button>
          </div>
        </div>

        <p role="status" className="sr-only">
          {results}
        </p>
      </div>

      {lists.map(({ value, isPending, isError, monthFlights, visible }) => (
        <TabsContent
          key={value}
          value={value}
          className="rounded-xl focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-hidden"
        >
          {isPending ? (
            <p
              role="status"
              className={cn(typography.bodySm, "text-muted-foreground")}
            >
              Cargando vuelos…
            </p>
          ) : isError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudieron cargar los vuelos.
            </p>
          ) : monthFlights?.length === 0 ? (
            <p className={cn(typography.bodyMd, "text-muted-foreground")}>
              No hay vuelos para este mes.
            </p>
          ) : visible?.length === 0 ? (
            <p className={cn(typography.bodyMd, "text-muted-foreground")}>
              Ningún vuelo coincide con «{query}».
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {visible?.map((flight) => (
                <FlightCard key={flight.flightNumber} flight={flight} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default FlightsBrowser
