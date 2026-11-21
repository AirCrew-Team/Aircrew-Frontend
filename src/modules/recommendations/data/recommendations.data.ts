import { utcClock } from "@/modules/shared/base/myBase"
import {
  ABSENCE_REASON_LABEL,
  RANK_LABEL,
  positionLabel,
  timeUntil,
  type ApiAbsenceReason,
  type ApiRank,
} from "@/modules/shared/crew/crewLabels"
import type {
  Candidate,
  ReplacementRequest,
} from "@/modules/recommendations/types/recommendations.types"
import apiClient from "@/service/api-client"

// Recomendaciones de reemplazo desde el gateway. Claude corre en el backend
// (servicio recommendation); aquí solo se piden y se muestran sus resultados.

type ApiSuggestionsState = "searching" | "ready" | "none" | "error"

// Ausencia de GET /crew/absences?status=reported.
interface ApiReportedAbsence {
  id: string
  flight_number: string
  flight_departure_at: string
  flight_origin: string | null
  flight_destination: string | null
  origin_name: string | null
  destination_name: string | null
  gate: string | null
  aircraft_family: string | null
  slot_role: string | null
  reason: ApiAbsenceReason
  notes: string | null
  suggestions_state: ApiSuggestionsState | null
}

const NO_DATA = "—"

const AI_STATE: Partial<Record<ApiSuggestionsState, ReplacementRequest["aiState"]>> = {
  searching: "buscando",
  error: "error",
}

const toRequest = (absence: ApiReportedAbsence): ReplacementRequest => ({
  id: absence.id,
  flightNumber: absence.flight_number,
  origin: {
    code: absence.flight_origin ?? NO_DATA,
    name: absence.origin_name ?? absence.flight_origin ?? NO_DATA,
  },
  destination: {
    code: absence.flight_destination ?? NO_DATA,
    name: absence.destination_name ?? absence.flight_destination ?? NO_DATA,
  },
  position: positionLabel(absence.slot_role, absence.aircraft_family),
  departureUtc: utcClock(absence.flight_departure_at),
  timeToDeparture: timeUntil(absence.flight_departure_at),
  gate: absence.gate ?? NO_DATA,
  // Etiqueta del motivo y, si las dejó, las notas del tripulante.
  reason: absence.notes
    ? `${ABSENCE_REASON_LABEL[absence.reason]}: ${absence.notes}`
    : ABSENCE_REASON_LABEL[absence.reason],
  aiState: absence.suggestions_state
    ? AI_STATE[absence.suggestions_state]
    : undefined,
})

// Cola: ausencias que necesitan reemplazo, de la salida más próxima a la más lejana.
export const getPendingReplacementRequests = async (): Promise<
  ReplacementRequest[]
> => {
  const { data } = await apiClient.get<ApiReportedAbsence[]>("/crew/absences", {
    params: { status: "reported" },
  })
  return [...data]
    .sort(
      (a, b) =>
        new Date(a.flight_departure_at).getTime() -
        new Date(b.flight_departure_at).getTime()
    )
    .map(toRequest)
}

interface ApiCandidate {
  user_id: string
  full_name: string | null
  employee_code: string
  rank: ApiRank
  base: string
  rank_position: number
  affinity: number
  affinity_label: "optimal" | "high" | "acceptable"
  checks: string[]
  rationale: string | null
  status: "proposed" | "offered" | "missed" | "accepted" | "discarded"
  location: string | null
  minutes_to_ramp: number | null
  phone: string | null
  radio_channel: string | null
}

interface ApiCandidatesResult {
  suggestions_state: ApiSuggestionsState
  reason: string | null
  candidates: ApiCandidate[]
}

const AFFINITY_LABEL: Record<ApiCandidate["affinity_label"], string> = {
  optimal: "Óptimo",
  high: "Alto",
  acceptable: "Aceptable",
}

const toCandidate = (candidate: ApiCandidate): Candidate => ({
  id: candidate.user_id,
  fullName: candidate.full_name ?? candidate.employee_code,
  rank: RANK_LABEL[candidate.rank] ?? candidate.rank,
  base: candidate.base,
  affinity: candidate.affinity,
  affinityLabel: AFFINITY_LABEL[candidate.affinity_label],
  checks: candidate.checks,
  location: candidate.location ?? NO_DATA,
  minutesToRamp: candidate.minutes_to_ramp,
  phone: candidate.phone ?? NO_DATA,
  radioChannel: candidate.radio_channel ?? NO_DATA,
  rationale: candidate.rationale,
})

// Solo los que siguen en juego: quien dejó vencer su plazo o fue descartado no se ofrece.
const toCandidates = (result: ApiCandidatesResult) =>
  [...result.candidates]
    .filter((candidate) => candidate.status === "proposed")
    .sort((a, b) => a.rank_position - b.rank_position)
    .map(toCandidate)

// Candidatos que propuso la IA para una solicitud, en orden.
export const getRecommendedCandidates = async (
  requestId: string
): Promise<Candidate[]> => {
  const { data } = await apiClient.get<ApiCandidatesResult>(
    `/recommendation/absences/${requestId}/candidates`
  )
  return toCandidates(data)
}

// La IA puede tardar ~20 s (hasta 40 s con Claude Code): más margen que el timeout general.
const AI_TIMEOUT_MS = 90_000

// Otra ronda de la IA. El motivo (opcional, máx. 300) orienta la búsqueda; vacío, se omite.
export const regenerateCandidates = async (
  requestId: string,
  reason: string
): Promise<Candidate[]> => {
  const trimmed = reason.trim()
  const { data } = await apiClient.post<ApiCandidatesResult>(
    `/recommendation/absences/${requestId}/regenerate`,
    trimmed ? { reason: trimmed } : {},
    { timeout: AI_TIMEOUT_MS }
  )
  return toCandidates(data)
}

// Confirma un candidato: el backend revalida las reglas y le avisa al tripulante.
export const confirmCandidate = async (
  requestId: string,
  candidateUserId: string
): Promise<{ deadlineAt: string }> => {
  const { data } = await apiClient.post<{ deadline_at: string }>(
    `/recommendation/absences/${requestId}/confirm`,
    { candidate_user_id: candidateUserId },
    { timeout: AI_TIMEOUT_MS }
  )
  return { deadlineAt: data.deadline_at }
}
