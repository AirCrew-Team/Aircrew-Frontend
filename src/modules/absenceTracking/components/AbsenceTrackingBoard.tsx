import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { SearchIcon } from "@/App/utils/icons"
import { normalizeForSearch } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import TrackingColumn from "@/modules/absenceTracking/components/TrackingColumn"
import { getAbsenceTracking } from "@/modules/absenceTracking/data/absenceTracking.data"
import type {
  TrackedAbsence,
  TrackingStatus,
} from "@/modules/absenceTracking/types/absenceTracking.types"

// Columnas en orden; el estado nunca va solo en el color del punto (el título lo dice).
const COLUMNS: {
  status: TrackingStatus
  title: string
  dotClassName: string
}[] = [
  {
    status: "por_aprobar",
    title: "Por aprobar",
    dotClassName: "bg-destructive",
  },
  {
    status: "esperando_confirmacion",
    title: "Esperando confirmación",
    dotClassName: "bg-brand-tertiary",
  },
  {
    status: "cubierta",
    title: "Cubiertas",
    dotClassName: "bg-brand-secondary",
  },
]

// Busca en el vuelo (también sin guion: «AV9344»), en quien reportó y en el reemplazo
// (si ya lo hay), no en el historial.
const matchesSearch = (absence: TrackedAbsence, search: string) =>
  [
    absence.flightNumber,
    absence.flightNumber.replace("-", ""),
    absence.reportedBy,
    absence.status === "por_aprobar" ? "" : absence.replacement.fullName,
  ].some((value) => normalizeForSearch(value).includes(search))

const absencesLabel = (count: number) =>
  `${count} ${count === 1 ? "ausencia" : "ausencias"}`

// Como el aviso de recálculo de Recomendaciones: tarjeta blanca sobre el fondo de la página.
const messageClass = "rounded-xl bg-card p-4 shadow-sm sm:p-5"

// B: buscador, resultados para el lector y las tres columnas por estado.
const AbsenceTrackingBoard = () => {
  const id = useId()
  const [search, setSearch] = useState("")
  const { data, isPending, isError } = useQuery({
    queryKey: ["absences", "tracking"],
    queryFn: getAbsenceTracking,
  })

  const query = search.trim()
  const normalizedQuery = normalizeForSearch(query)
  const visible = (data ?? []).filter((absence) =>
    matchesSearch(absence, normalizedQuery)
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Siempre montado; sin datos (carga, error o turno vacío) queda vacío. */}
      <p role="status" className="sr-only">
        {data?.length ? absencesLabel(visible.length) : ""}
      </p>

      {isPending ? (
        <p
          role="status"
          className={cn(
            typography.bodyMd,
            messageClass,
            "text-muted-foreground"
          )}
        >
          Cargando ausencias…
        </p>
      ) : isError ? (
        <p
          role="alert"
          className={cn(typography.bodyMd, messageClass, "text-destructive")}
        >
          No se pudieron cargar las ausencias.
        </p>
      ) : data.length === 0 ? (
        <p
          className={cn(
            typography.bodyMd,
            messageClass,
            "text-muted-foreground"
          )}
        >
          No hay ausencias reportadas en el turno.
        </p>
      ) : (
        <>
          <div className="relative w-full lg:w-72 lg:self-end">
            <label htmlFor={`${id}-search`} className="sr-only">
              Buscar vuelo o tripulante
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
              placeholder="Buscar vuelo o tripulante…"
              className={cn(
                typography.bodySm,
                // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
                "min-h-11 w-full rounded-sm border border-muted-foreground/70 bg-card py-1.5 pr-3 pl-9 text-foreground shadow-xs transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-9"
              )}
            />
          </div>

          {/* Sin región viva: el status de resultados ya anuncia «0 ausencias». */}
          {visible.length === 0 && query ? (
            <p
              className={cn(
                typography.bodyMd,
                messageClass,
                "break-words text-muted-foreground"
              )}
            >
              Ninguna ausencia coincide con «{query}».
            </p>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            {COLUMNS.map((column) => (
              <TrackingColumn
                key={column.status}
                title={column.title}
                dotClassName={column.dotClassName}
                absences={visible.filter(
                  (absence) => absence.status === column.status
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default AbsenceTrackingBoard
