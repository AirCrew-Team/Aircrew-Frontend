import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import CandidateCard from "@/modules/recommendations/components/CandidateCard"
import RequestSuggestionsDialog from "@/modules/recommendations/components/RequestSuggestionsDialog"
import { getRecommendedCandidates } from "@/modules/recommendations/data/recommendations.data"
import type {
  Candidate,
  ReplacementRequest,
} from "@/modules/recommendations/types/recommendations.types"

interface CandidateListProps {
  request: ReplacementRequest
  onAssign: (candidate: Candidate) => void
  onRequestSuggestions: () => void
}

// Candidatos de una solicitud. Se monta con key={request.id}: al cambiar de solicitud
// se reinicia y el elegido vuelve a ser el primero, sin efectos.
// Solo se monta con una solicitud seleccionable, así que la consulta no necesita `enabled`.
const CandidateList = ({
  request,
  onAssign,
  onRequestSuggestions,
}: CandidateListProps) => {
  const titleId = useId()
  const [chosenId, setChosenId] = useState<string | null>(null)
  const {
    data: candidates,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["replacements", "candidates", request.id],
    queryFn: () => getRecommendedCandidates(request.id),
  })

  const chosen =
    candidates?.find((candidate) => candidate.id === chosenId) ??
    candidates?.at(0)
  const isEmpty = candidates?.length === 0

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={titleId}
          className={cn(typography.headlineMd, "text-brand-primary")}
        >
          Candidatos sugeridos por la IA
        </h2>
        {isEmpty ? null : (
          <p
            className={cn(
              typography.labelSm,
              "rounded-full bg-brand-neutral px-2.5 py-1 text-muted-foreground"
            )}
          >
            Ordenados por afinidad
          </p>
        )}
      </div>

      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando candidatos…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudieron cargar los candidatos.
        </p>
      ) : (
        <>
          {/* Estado persistente, sin región viva: no es carga ni error. */}
          {isEmpty ? (
            <p className={cn(typography.bodyMd, "text-muted-foreground")}>
              La IA no encontró candidatos para esta solicitud.
            </p>
          ) : null}
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              request={request}
              chosen={candidate.id === chosen?.id}
              onChoose={() => setChosenId(candidate.id)}
              onAssign={() => onAssign(candidate)}
            />
          ))}
          <div className="flex justify-end">
            <RequestSuggestionsDialog
              flightNumber={request.flightNumber}
              onConfirm={onRequestSuggestions}
            />
          </div>
        </>
      )}
    </section>
  )
}

export default CandidateList
