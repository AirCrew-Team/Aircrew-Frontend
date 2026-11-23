import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocation, useSearchParams } from "react-router"
import { toast } from "sonner"

import { RecalculatingIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import CandidateList from "@/modules/recommendations/components/CandidateList"
import RequestHeader from "@/modules/recommendations/components/RequestHeader"
import RequestQueue from "@/modules/recommendations/components/RequestQueue"
import {
  confirmCandidate,
  getPendingReplacementRequests,
  regenerateCandidates,
} from "@/modules/recommendations/data/recommendations.data"
import type { Candidate } from "@/modules/recommendations/types/recommendations.types"
import { apiErrorMessage } from "@/service/api-error"

// Encabezado, cola y candidatos de la solicitud seleccionada. Guarda el estado de la
// pantalla mientras el backend responde: selección, asignadas y en recálculo.
const RecommendationsBoard = () => {
  const queryClient = useQueryClient()
  // null: aún no se eligió ninguna, así que vale la primera seleccionable.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // ?solicitud=<id> (aviso de la campana) la elige una vez por navegación. Si la cola aún
  // no llegó, `selected` la toma al llegar; si ya no está, vale la selección por defecto.
  // Luego se quita de la URL, así el mismo aviso vuelve a elegirla.
  const [searchParams, setSearchParams] = useSearchParams()
  const { key: locationKey } = useLocation()
  const [handledKey, setHandledKey] = useState<string | null>(null)
  const requestedId = searchParams.get("solicitud")
  if (requestedId && handledKey !== locationKey) {
    setHandledKey(locationKey)
    setSelectedId(requestedId)
  }
  useEffect(() => {
    if (requestedId) setSearchParams({}, { replace: true })
  }, [requestedId, setSearchParams])
  const [confirmedIds, setConfirmedIds] = useState<string[]>([])
  const [recalculatingIds, setRecalculatingIds] = useState<string[]>([])
  const selectedTabRef = useRef<HTMLButtonElement>(null)
  // Cuenta las acciones (asignar o pedir sugerencias): el foco solo se mueve tras una, nunca al
  // montar, y también cuando la selección no cambia (la única que queda pasa a recálculo).
  const [actionCount, setActionCount] = useState(0)
  const {
    data: requests,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["replacements", "pending"],
    queryFn: getPendingReplacementRequests,
  })

  const queue = (requests ?? []).filter(
    (request) => !confirmedIds.includes(request.id)
  )
  // En recálculo: las que pidió el supervisor y las que la IA todavía está buscando.
  const busyIds = [
    ...recalculatingIds,
    ...queue
      .filter((request) => request.aiState === "buscando")
      .map((request) => request.id),
  ]
  const selectable = queue.filter((request) => !busyIds.includes(request.id))
  // Si todas las que quedan están en recálculo, queda la primera con su aviso (nunca en blanco).
  const selected =
    queue.find((request) => request.id === selectedId) ??
    selectable.at(0) ??
    queue.at(0)
  const recalculating = selected ? busyIds.includes(selected.id) : false

  // El diálogo y su botón se desmontan con la lista, así que Base UI no puede devolver
  // el foco: va al tab que queda seleccionado o, si no queda ninguno, al contenido.
  useEffect(() => {
    if (actionCount === 0) return
    if (selectedTabRef.current) selectedTabRef.current.focus()
    else document.getElementById("contenido")?.focus()
  }, [actionCount])

  // Tras una acción queda seleccionada la siguiente más urgente que no esté en recálculo.
  const selectMostUrgentExcept = (requestId: string) => {
    setSelectedId(
      selectable.find((request) => request.id !== requestId)?.id ?? null
    )
    setActionCount((count) => count + 1)
  }

  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: ["replacements"] })
    void queryClient.invalidateQueries({ queryKey: ["absences"] })
  }

  // La solicitud sale de la cola de inmediato; si el backend rechaza (p. ej. el candidato
  // ya no cumple una regla), vuelve a la cola y se muestra el motivo.
  const assign = (candidate: Candidate) => {
    if (!selected) return
    const request = selected
    setConfirmedIds((ids) => [...ids, request.id])
    selectMostUrgentExcept(request.id)
    confirmCandidate(request.id, candidate.id)
      .then(() => {
        toast.success(
          `${candidate.fullName} asignado al vuelo ${request.flightNumber}`,
          { description: "Se notificó al tripulante." }
        )
        refreshLists()
      })
      .catch((error: unknown) => {
        setConfirmedIds((ids) => ids.filter((id) => id !== request.id))
        toast.error(`No se pudo asignar a ${candidate.fullName}`, {
          description: apiErrorMessage(error, "Inténtalo de nuevo."),
        })
        refreshLists()
      })
  }

  // La IA busca otra ronda (≈20 s) teniendo en cuenta el motivo, si lo hay.
  const requestSuggestions = (reason: string) => {
    if (!selected) return
    const request = selected
    setRecalculatingIds((ids) => [...ids, request.id])
    selectMostUrgentExcept(request.id)
    const stopRecalculating = () =>
      setRecalculatingIds((ids) => ids.filter((id) => id !== request.id))
    toast.success(
      `Se pidieron nuevas sugerencias para el vuelo ${request.flightNumber}`
    )

    regenerateCandidates(request.id, reason)
      .then((candidates) => {
        queryClient.setQueryData(
          ["replacements", "candidates", request.id],
          candidates
        )
        stopRecalculating()
        toast.success(
          `Nuevas sugerencias listas para el vuelo ${request.flightNumber}`
        )
        void queryClient.invalidateQueries({
          queryKey: ["replacements", "pending"],
        })
      })
      .catch((error: unknown) => {
        stopRecalculating()
        toast.error(
          `No se pudieron obtener sugerencias para el vuelo ${request.flightNumber}`,
          { description: apiErrorMessage(error, "Inténtalo de nuevo.") }
        )
      })
  }

  return (
    <div className="flex flex-col gap-6">
      <RequestHeader request={selected} />

      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodyMd, "text-muted-foreground")}
        >
          Cargando solicitudes…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodyMd, "text-destructive")}>
          No se pudieron cargar las solicitudes.
        </p>
      ) : queue.length === 0 ? (
        <p className={cn(typography.bodyMd, "text-muted-foreground")}>
          No hay solicitudes pendientes.
        </p>
      ) : (
        <Tabs
          orientation="vertical"
          value={selected?.id ?? null}
          onValueChange={(value) => {
            const next = queue.find((request) => request.id === value)
            if (next) setSelectedId(next.id)
          }}
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
        >
          <RequestQueue
            requests={queue}
            recalculatingIds={busyIds}
            selectedId={selected?.id}
            selectedTabRef={selectedTabRef}
          />
          {selected ? (
            <TabsContent
              value={selected.id}
              className="min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:col-span-2"
            >
              {recalculating ? (
                <p
                  className={cn(
                    typography.bodyMd,
                    "flex items-center gap-2 rounded-xl bg-card p-5 text-muted-foreground shadow-sm"
                  )}
                >
                  <RecalculatingIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-brand-secondary"
                  />
                  La IA está recalculando las sugerencias de esta solicitud.
                </p>
              ) : (
                <CandidateList
                  key={selected.id}
                  request={selected}
                  onAssign={assign}
                  onRequestSuggestions={requestSuggestions}
                />
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      )}
    </div>
  )
}

export default RecommendationsBoard
