import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { RecalculatingIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import CandidateList from "@/modules/recommendations/components/CandidateList"
import RequestHeader from "@/modules/recommendations/components/RequestHeader"
import RequestQueue from "@/modules/recommendations/components/RequestQueue"
import { getPendingReplacementRequests } from "@/modules/recommendations/data/recommendations.data"
import type { Candidate } from "@/modules/recommendations/types/recommendations.types"

// Encabezado, cola y candidatos de la solicitud seleccionada. Guarda el estado de la
// pantalla (sin persistir hasta que exista la API): selección, asignadas y en recálculo.
const RecommendationsBoard = () => {
  // null: aún no se eligió ninguna, así que vale la primera seleccionable.
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const selectable = queue.filter(
    (request) => !recalculatingIds.includes(request.id)
  )
  // Si todas las que quedan están en recálculo, queda la primera con su aviso (nunca en blanco).
  const selected =
    queue.find((request) => request.id === selectedId) ??
    selectable.at(0) ??
    queue.at(0)
  const recalculating = selected
    ? recalculatingIds.includes(selected.id)
    : false

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

  const assign = (candidate: Candidate) => {
    if (!selected) return
    setConfirmedIds((ids) => [...ids, selected.id])
    selectMostUrgentExcept(selected.id)
    toast.success(
      `${candidate.fullName} asignado al vuelo ${selected.flightNumber}`,
      { description: "Se notificó al tripulante." }
    )
  }

  const requestSuggestions = () => {
    if (!selected) return
    setRecalculatingIds((ids) => [...ids, selected.id])
    selectMostUrgentExcept(selected.id)
    toast.success(
      `Se pidieron nuevas sugerencias para el vuelo ${selected.flightNumber}`
    )
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
            recalculatingIds={recalculatingIds}
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
