import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { ChevronDownIcon, SearchIcon } from "@/App/utils/icons"
import { normalizeForSearch } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import CrewMemberCard from "@/modules/shiftCrew/components/CrewMemberCard"
import CrewOverview from "@/modules/shiftCrew/components/CrewOverview"
import { getShiftCrew } from "@/modules/shiftCrew/data/shiftCrew.data"
import type {
  CrewMember,
  CrewStatus,
} from "@/modules/shiftCrew/types/shiftCrew.types"

// Filtros por estado, en orden; «Todos» no filtra.
const FILTERS: { value: CrewStatus | null; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "guardia", label: "De guardia" },
  { value: "en_vuelo", label: "En vuelo" },
  { value: "programado", label: "Programados" },
  { value: "descanso", label: "En descanso" },
  { value: "ausente", label: "Ausentes" },
  { value: "sin_asignar", label: "Sin asignación" },
]

// Tarjetas visibles al cargar y cuántas añade cada «Ver más»: 12 llena filas completas
// con 2 y con 3 columnas.
const LIMIT = 12

// Busca en el nombre y en el vuelo (también sin guion: «av4021»), no en el cargo ni en la
// ubicación.
const matchesSearch = (member: CrewMember, search: string) =>
  [
    member.fullName,
    ...("flight" in member && member.flight
      ? [
          member.flight.flightNumber,
          member.flight.flightNumber.replace("-", ""),
        ]
      : []),
  ].some((value) => normalizeForSearch(value).includes(search))

const crewLabel = (count: number) =>
  `${count} ${count === 1 ? "tripulante" : "tripulantes"}`

// Como en Ausencias: tarjeta blanca sobre el fondo de la página.
const messageClass = "rounded-xl bg-card p-4 shadow-sm sm:p-5"

// B: una sola consulta; panorama, buscador, filtros por estado, lista y límite.
const ShiftCrewBoard = () => {
  const id = useId()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<CrewStatus | null>(null)
  const [limit, setLimit] = useState(LIMIT)
  const { data, isPending } = useQuery({
    queryKey: ["crew", "shift"],
    queryFn: getShiftCrew,
  })

  const members = data?.members ?? []
  const query = search.trim()
  const normalizedQuery = normalizeForSearch(query)
  const visible = members.filter(
    (member) =>
      (filter === null || member.status === filter) &&
      matchesSearch(member, normalizedQuery)
  )
  const shown = visible.slice(0, limit)
  const hidden = visible.length - shown.length
  const nextBatch = Math.min(LIMIT, hidden)

  return (
    <div className="flex flex-col gap-6">
      {/* Siempre montado; sin datos (carga, error o turno vacío) queda vacío. */}
      <p role="status" className="sr-only">
        {members.length ? crewLabel(visible.length) : ""}
      </p>

      {/* Sin datos tras la carga es el error de carga. Una recarga en segundo plano que
          falla (p. ej. tras un aviso en vivo) conserva los datos: el tablero sigue igual. */}
      {isPending ? (
        <p
          role="status"
          className={cn(
            typography.bodyMd,
            messageClass,
            "text-muted-foreground"
          )}
        >
          Cargando tripulación…
        </p>
      ) : !data ? (
        <p
          role="alert"
          className={cn(typography.bodyMd, messageClass, "text-destructive")}
        >
          No se pudo cargar la tripulación del turno.
        </p>
      ) : data.members.length === 0 ? (
        <p
          className={cn(
            typography.bodyMd,
            messageClass,
            "text-muted-foreground"
          )}
        >
          No hay tripulantes asignados al turno.
        </p>
      ) : (
        <>
          <CrewOverview crew={data} />

          <div className="flex flex-col gap-4">
            {/* lg:items-start + lg:py-0.5 en el grupo: las pastillas (32 px) quedan centradas
                con el buscador (36 px) y, si llegan a partirse en dos filas, el buscador se
                alinea con la primera. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
              {/* Botones de alternancia (aria-pressed); el conteo es del turno completo y
                  no cambia con la búsqueda. En móvil, rejilla de 2; si el último queda solo, ocupa la fila. */}
              <div
                role="group"
                aria-label="Filtrar por estado"
                className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:py-0.5"
              >
                {FILTERS.map(({ value, label }) => {
                  const count =
                    value === null
                      ? members.length
                      : members.filter(({ status }) => status === value).length
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={filter === value}
                      onClick={() => {
                        setFilter(value)
                        setLimit(LIMIT)
                      }}
                      className={cn(
                        typography.labelMd,
                        // forced-colors: el fondo desaparece; el subrayado marca el activo.
                        "min-h-11 rounded-full px-3.5 font-semibold transition-colors last:odd:col-span-2 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden motion-reduce:transition-none lg:min-h-8 lg:px-3 forced-colors:aria-pressed:underline forced-colors:aria-pressed:decoration-2 forced-colors:aria-pressed:underline-offset-4",
                        filter === value
                          ? "bg-brand-primary text-white"
                          : "bg-brand-neutral text-brand-primary hover:bg-brand-border active:bg-brand-border-strong"
                      )}
                    >
                      {`${label} (${count})`}
                    </button>
                  )
                })}
              </div>

              {/* lg:w-60 (xl, el de la maqueta): con 7 pastillas, a 1024 px pueden partirse en dos filas. */}
              <div className="relative w-full lg:w-60 lg:shrink-0 xl:w-72">
                <label htmlFor={`${id}-search`} className="sr-only">
                  Buscar tripulante o vuelo
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
                  placeholder="Buscar tripulante o vuelo…"
                  className={cn(
                    typography.bodySm,
                    // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
                    "min-h-11 w-full rounded-sm border border-muted-foreground/70 bg-card py-1.5 pr-3 pl-9 text-foreground shadow-xs transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-9"
                  )}
                />
              </div>
            </div>

            <h2 id={`${id}-list`} className="sr-only">
              Tripulantes del turno
            </h2>

            {/* Sin región viva: el status de resultados ya anuncia «0 tripulantes». */}
            {visible.length === 0 ? (
              <p
                className={cn(
                  typography.bodyMd,
                  messageClass,
                  "break-words text-muted-foreground"
                )}
              >
                {query
                  ? `Ningún tripulante coincide con «${query}».`
                  : "No hay tripulantes en este estado."}
              </p>
            ) : (
              // role="list": Safari deja de exponer como lista un <ul> con list-style: none.
              // items-start (maqueta y Ausencias): abrir un detalle no estira la fila.
              <ul
                role="list"
                aria-labelledby={`${id}-list`}
                className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {shown.map((member) => (
                  <li key={member.id}>
                    <CrewMemberCard member={member} />
                  </li>
                ))}
              </ul>
            )}

            {/* Siempre el mismo botón (cambia su texto), así el foco no se pierde. Sin
                aria-label: su nombre es el texto visible. */}
            {visible.length > LIMIT ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setLimit(hidden > 0 ? shown.length + nextBatch : LIMIT)
                  }
                  className={cn(
                    typography.labelLg,
                    "inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-brand-secondary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden active:text-brand-secondary-hover lg:min-h-9"
                  )}
                >
                  {hidden > 0 ? `Ver ${nextBatch} más` : "Mostrar menos"}
                  <ChevronDownIcon
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                      hidden === 0 && "rotate-180"
                    )}
                  />
                </button>
                <p className={cn(typography.bodySm, "text-muted-foreground")}>
                  {`Mostrando ${shown.length} de ${visible.length}`}
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export default ShiftCrewBoard
