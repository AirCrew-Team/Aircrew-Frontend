import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { ArrowRightIcon, ViewIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import Pagination from "@/components/custom/Pagination"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { cn } from "@/lib/utils"
import {
  CrewStatusBadge,
  FlightStatusBadge,
} from "@/modules/adminFlights/components/FlightBadges"
import FlightDetailDialog from "@/modules/adminFlights/components/FlightDetailDialog"
import { useFlightsAdminApi } from "@/modules/adminFlights/hooks/useFlightsAdminApi"
import {
  FLIGHTS_PAGE_SIZE,
  useFlightsSearchParams,
} from "@/modules/adminFlights/hooks/useFlightsSearchParams"
import type { AdminFlight } from "@/modules/adminFlights/types/adminFlights.types"
import {
  durationMinutes,
  formatDuration,
  formatInZone,
} from "@/modules/adminFlights/utils/flightTime"

const headerClass = cn(
  typography.labelSm,
  "px-4 py-3 text-left font-semibold text-muted-foreground uppercase first:pl-6 last:pr-6"
)
// En pantallas grandes es una celda normal; por debajo de lg cada fila es una tarjeta.
const cellClass =
  "min-w-0 align-middle max-lg:block lg:px-4 lg:py-3 lg:first:pl-6 lg:last:pr-6"

// Etiqueta de la columna dentro de la tarjeta (solo pantallas pequeñas). aria-hidden:
// el lector ya asocia la celda con su encabezado.
const MobileLabel = ({ children }: { children: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      typography.labelSm,
      "mb-1 block text-muted-foreground uppercase lg:hidden"
    )}
  >
    {children}
  </span>
)

// «Bogotá → Rionegro»; sin ciudad (aeropuerto fuera del catálogo), el código.
const citiesOf = (flight: AdminFlight) =>
  `${flight.origin.city ?? flight.origin.code} → ${flight.destination.city ?? flight.destination.code}`

// Bloque 4: tabla de vuelos con su paginación (5 por página).
const FlightsTable = () => {
  const { page, search, filter, setPage, hrefForPage } =
    useFlightsSearchParams()
  const { getFlights } = useFlightsAdminApi()
  // Una petición por búsqueda, no por tecla.
  const debouncedSearch = useDebouncedValue(search)
  const [detail, setDetail] = useState<AdminFlight | null>(null)

  const params = {
    page,
    pageSize: FLIGHTS_PAGE_SIZE,
    search: debouncedSearch,
    status: filter,
  }
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: ["adminFlights", "list", params],
    queryFn: () => getFlights(params),
    placeholderData: keepPreviousData,
  })

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1

  // ?page=99 se corrige a la última página sin dejarla en el historial.
  useEffect(() => {
    if (data && !isPlaceholderData && page > totalPages) {
      setPage(totalPages, { replace: true })
    }
  }, [data, isPlaceholderData, page, totalPages, setPage])

  if (isPending) {
    return (
      <p
        role="status"
        className={cn(
          typography.bodySm,
          "rounded-xl bg-card p-6 text-muted-foreground shadow-sm"
        )}
      >
        Cargando vuelos…
      </p>
    )
  }

  if (isError) {
    return (
      <p
        role="alert"
        className={cn(
          typography.bodySm,
          "rounded-xl bg-card p-6 text-destructive shadow-sm"
        )}
      >
        No se pudieron cargar los vuelos.
      </p>
    )
  }

  return (
    <section
      aria-label="Vuelos programados"
      aria-busy={isPlaceholderData}
      className="overflow-hidden rounded-xl bg-card shadow-sm"
    >
      {data.items.length === 0 ? (
        <p className={cn(typography.bodyMd, "p-6 text-muted-foreground")}>
          {debouncedSearch
            ? `Ningún vuelo coincide con «${debouncedSearch}».`
            : "No hay vuelos para este filtro."}
        </p>
      ) : (
        // Escritorio (lg): tabla. Celular y tablet: cada vuelo es una tarjeta. Los role
        // explícitos conservan la semántica de tabla aunque el CSS cambie el display.
        <div className="lg:overflow-x-auto">
          <table
            role="table"
            className="w-full border-collapse max-lg:block lg:min-w-4xl"
          >
            <caption className="sr-only">
              Vuelos, página {data.page} de {totalPages}
            </caption>
            <thead role="rowgroup" className="bg-muted max-lg:sr-only">
              <tr role="row">
                {[
                  "Vuelo",
                  "Ruta",
                  "Salida y llegada",
                  "Aeronave",
                  "Tripulación",
                  "Estado",
                ].map((label) => (
                  <th
                    key={label}
                    role="columnheader"
                    scope="col"
                    className={headerClass}
                  >
                    {label}
                  </th>
                ))}
                <th
                  role="columnheader"
                  scope="col"
                  className={cn(headerClass, "text-right")}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody
              role="rowgroup"
              className="divide-y divide-brand-border max-lg:block"
            >
              {data.items.map((flight) => {
                const departure = formatInZone(
                  flight.departureAt,
                  flight.origin.timezone
                )
                const arrival = formatInZone(
                  flight.arrivalAt,
                  flight.destination.timezone
                )
                const nextDay = departure.day !== arrival.day
                return (
                  <tr
                    key={flight.id}
                    role="row"
                    className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:p-4"
                  >
                    {/* Vuelo: número y puerta. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Vuelo</MobileLabel>
                      <span
                        className={cn(
                          typography.labelLg,
                          "block font-mono font-bold text-brand-primary"
                        )}
                      >
                        {flight.flightNumber}
                      </span>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block text-muted-foreground"
                        )}
                      >
                        {flight.gate ? `Puerta ${flight.gate}` : "Sin puerta"}
                      </span>
                    </td>
                    {/* Ruta: códigos y ciudades. La flecha es decorativa: el texto
                        ya dice «de … a …» para el lector. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Ruta</MobileLabel>
                      <span
                        className={cn(
                          typography.labelMd,
                          "flex items-center gap-1.5 font-semibold text-brand-primary"
                        )}
                      >
                        <span className="sr-only">De </span>
                        {flight.origin.code}
                        <ArrowRightIcon
                          aria-hidden="true"
                          className="size-3.5 text-brand-secondary"
                        />
                        <span className="sr-only"> a </span>
                        {flight.destination.code}
                      </span>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block text-muted-foreground"
                        )}
                      >
                        {citiesOf(flight)}
                      </span>
                    </td>
                    {/* Horario en la hora local de cada aeropuerto y la duración. */}
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Salida y llegada</MobileLabel>
                      <span
                        className={cn(
                          typography.labelMd,
                          "block font-semibold text-brand-primary tabular-nums"
                        )}
                      >
                        {departure.day} · {departure.time} → {arrival.time}
                        {nextDay ? ` (${arrival.day})` : ""}
                      </span>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block text-muted-foreground"
                        )}
                      >
                        {formatDuration(
                          durationMinutes(flight.departureAt, flight.arrivalAt)
                        )}{" "}
                        ·{" "}
                        {flight.scope === "nacional"
                          ? "Nacional"
                          : "Internacional"}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Aeronave</MobileLabel>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block font-medium text-brand-primary"
                        )}
                      >
                        {flight.aircraft.name}
                      </span>
                      <span
                        className={cn(
                          typography.bodySm,
                          "block font-mono text-muted-foreground"
                        )}
                      >
                        {flight.aircraft.registration}
                      </span>
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Tripulación</MobileLabel>
                      <CrewStatusBadge status={flight.crewStatus} />
                    </td>
                    <td role="cell" className={cellClass}>
                      <MobileLabel>Estado</MobileLabel>
                      <FlightStatusBadge status={flight.status} />
                    </td>
                    <td
                      role="cell"
                      className={cn(cellClass, "max-lg:col-span-2")}
                    >
                      <div className="flex items-center justify-end max-lg:border-t max-lg:border-brand-border max-lg:pt-2">
                        <button
                          type="button"
                          aria-label={`Ver vuelo ${flight.flightNumber}`}
                          title="Ver vuelo"
                          onClick={() => setDetail(flight)}
                          className="inline-flex size-11 items-center justify-center rounded-md bg-brand-neutral text-brand-secondary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:size-8"
                        >
                          <ViewIcon aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pie: cuántos se muestran y la paginación. */}
      <div className="flex flex-col gap-3 bg-muted px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            typography.labelSm,
            "font-semibold text-muted-foreground"
          )}
        >
          Mostrando {data.items.length} de {data.total} vuelos
        </p>
        <Pagination
          label="Paginación de vuelos"
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          hrefForPage={hrefForPage}
        />
      </div>

      <FlightDetailDialog flight={detail} onClose={() => setDetail(null)} />
    </section>
  )
}

export default FlightsTable
