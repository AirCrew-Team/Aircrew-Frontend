import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { getAbsences } from "@/App/actions/absences/absences.actions"
import type { Absence } from "@/App/types/absences.types"
import { SearchIcon } from "@/App/utils/icons"
import { normalizeForSearch } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import AbsenceDetail from "@/modules/absenceTracking/components/AbsenceDetail"
import AbsenceDetailHeader from "@/modules/absenceTracking/components/AbsenceDetailHeader"
import AbsenceTrackingCard from "@/modules/absenceTracking/components/AbsenceTrackingCard"
import CrewAbsenceCard from "@/modules/absenceTracking/components/CrewAbsenceCard"
import TrackingColumn from "@/modules/absenceTracking/components/TrackingColumn"
import { getAbsenceTracking } from "@/modules/absenceTracking/data/absenceTracking.data"
import type {
  TrackedAbsence,
  TrackingStatus,
} from "@/modules/absenceTracking/types/absenceTracking.types"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

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

// Ausencias reales: sin vuelo, se busca en el tripulante, su código y el reemplazo (los
// tres pueden llegar en null).
const matchesRealSearch = (absence: Absence, search: string) =>
  [
    absence.crew_name ?? "",
    absence.employee_code ?? "",
    absence.replacement_name ?? "",
  ].some((value) => normalizeForSearch(value).includes(search))

// El backend solo tiene «reported» y «covered»: «Esperando confirmación» queda vacía.
const REAL_COLUMN: Record<Absence["status"], TrackingStatus> = {
  reported: "por_aprobar",
  covered: "cubierta",
}

const absencesLabel = (count: number) =>
  `${count} ${count === 1 ? "ausencia" : "ausencias"}`

// Como el aviso de recálculo de Recomendaciones: tarjeta blanca sobre el fondo de la página.
const messageClass = "rounded-xl bg-card p-4 shadow-sm sm:p-5"

// B: buscador, resultados para el lector y las tres columnas por estado. Las cuentas demo
// ven las ausencias de ejemplo; la sesión real, las del backend con su popup de detalle.
const AbsenceTrackingBoard = () => {
  const id = useId()
  const [search, setSearch] = useState("")
  // Última ausencia abierta: al cerrar se conserva, así el detalle sigue visible durante la
  // animación de salida en lugar de quedar vacío.
  const [detailId, setDetailId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  const demo = useQuery({
    queryKey: ["absences", "tracking"],
    queryFn: getAbsenceTracking,
    enabled: isDemo,
  })
  const real = useQuery({
    queryKey: ["absences", "list"],
    queryFn: getAbsences,
    enabled: !isDemo,
  })
  // La consulta deshabilitada se queda en «pending»: cuenta solo la de la sesión.
  const { data, isPending, isError } = isDemo ? demo : real

  const query = search.trim()
  const normalizedQuery = normalizeForSearch(query)
  const visibleDemo = (demo.data ?? []).filter((absence) =>
    matchesSearch(absence, normalizedQuery)
  )
  const visibleReal = (real.data ?? []).filter((absence) =>
    matchesRealSearch(absence, normalizedQuery)
  )
  const visibleCount = isDemo ? visibleDemo.length : visibleReal.length
  const searchLabel = isDemo ? "Buscar vuelo o tripulante" : "Buscar tripulante"

  return (
    <div className="flex flex-col gap-4">
      {/* Siempre montado; sin datos (carga, error o turno vacío) queda vacío. */}
      <p role="status" className="sr-only">
        {data?.length ? absencesLabel(visibleCount) : ""}
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
              {searchLabel}
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
              placeholder={`${searchLabel}…`}
              className={cn(
                typography.bodySm,
                // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
                "min-h-11 w-full rounded-sm border border-muted-foreground/70 bg-card py-1.5 pr-3 pl-9 text-foreground shadow-xs transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-9"
              )}
            />
          </div>

          {/* Sin región viva: el status de resultados ya anuncia «0 ausencias». */}
          {visibleCount === 0 && query ? (
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
            {COLUMNS.map((column) =>
              isDemo ? (
                <TrackingColumn
                  key={column.status}
                  title={column.title}
                  dotClassName={column.dotClassName}
                  absences={visibleDemo.filter(
                    (absence) => absence.status === column.status
                  )}
                  renderCard={(absence) => (
                    <AbsenceTrackingCard absence={absence} />
                  )}
                />
              ) : (
                <TrackingColumn
                  key={column.status}
                  title={column.title}
                  dotClassName={column.dotClassName}
                  absences={visibleReal.filter(
                    (absence) => REAL_COLUMN[absence.status] === column.status
                  )}
                  renderCard={(absence) => (
                    <CrewAbsenceCard
                      absence={absence}
                      onShowDetail={() => {
                        setDetailId(absence.id)
                        setIsDetailOpen(true)
                      }}
                    />
                  )}
                />
              )
            )}
          </div>
        </>
      )}

      {/* Un solo popup para todas las tarjetas reales; su contenido (y la consulta del
          detalle) se monta al abrirlo y se desmonta al cerrarlo. Las cuentas demo no
          tienen detalle. Se cierra con la X, con Esc o al pulsar fuera. */}
      {isDemo ? null : (
        <Dialog
          open={isDetailOpen}
          onOpenChange={(open) => {
            if (!open) setIsDetailOpen(false)
          }}
        >
          {/* Sin la X genérica de shadcn: la pone AbsenceDetailHeader, en español. Ancho
              amplio para la vista previa de un PDF. */}
          <DialogContent
            showCloseButton={false}
            className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-4xl"
          >
            <AbsenceDetailHeader />
            {/* Cuerpo con su propio desplazamiento: el encabezado queda fijo. */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {detailId ? <AbsenceDetail key={detailId} id={detailId} /> : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default AbsenceTrackingBoard
