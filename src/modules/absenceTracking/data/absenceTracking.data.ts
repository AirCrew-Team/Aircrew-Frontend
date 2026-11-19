import type {
  SuggestionsState,
  TrackedAbsence,
} from "@/modules/absenceTracking/types/absenceTracking.types"
import { utcClock } from "@/modules/shared/base/myBase"
import {
  ABSENCE_REASON_LABEL,
  positionLabel,
  timeUntil,
  type ApiAbsenceReason,
} from "@/modules/shared/crew/crewLabels"
import apiClient from "@/service/api-client"

// Seguimiento de las ausencias del turno desde GET /crew/absences/tracking. El backend
// ya las devuelve ordenadas (por aprobar, esperando confirmación, cubiertas).

type ApiSuggestionsState = "searching" | "ready" | "none" | "error"

interface ApiTrackingItem {
  id: string
  flight_number: string
  origin: string
  destination: string
  departure_at: string
  slot_role: string | null
  reason: ApiAbsenceReason
  reported_by: string | null
  employee_code: string | null
  reported_at: string
  status: "reported" | "pending_ack" | "covered" | "cancelled"
  suggestions_state: ApiSuggestionsState | null
  candidate_count: number
  replacement: { user_id: string; full_name: string; option: number | null } | null
  approval: { by: string; at: string } | null
  deadline_at: string | null
  confirmed_at: string | null
  timeline: { at: string; type: string; text: string; missed?: boolean }[]
}

const NO_DATA = "—"

const SUGGESTIONS: Record<ApiSuggestionsState, SuggestionsState> = {
  searching: "buscando",
  ready: "listas",
  none: "sin_candidatos",
  error: "error",
}

const clockOrDash = (iso: string | null) => (iso ? utcClock(iso) : NO_DATA)

// null: estados que la pantalla no muestra (canceladas, o datos incompletos).
const toTrackedAbsence = (item: ApiTrackingItem): TrackedAbsence | null => {
  const base = {
    id: item.id,
    flightNumber: item.flight_number,
    origin: item.origin,
    destination: item.destination,
    departureUtc: utcClock(item.departure_at),
    timeToDeparture: timeUntil(item.departure_at),
    position: positionLabel(item.slot_role),
    reason: ABSENCE_REASON_LABEL[item.reason] ?? item.reason,
    reportedBy: item.reported_by ?? item.employee_code ?? NO_DATA,
    reportedAtUtc: utcClock(item.reported_at),
    timeline: item.timeline.map((event) => ({
      atUtc: utcClock(event.at),
      text: event.text,
      missed: event.missed || undefined,
    })),
  }
  const replacement = item.replacement
    ? { fullName: item.replacement.full_name, option: item.replacement.option ?? 1 }
    : null
  const approval = item.approval
    ? { by: item.approval.by, atUtc: utcClock(item.approval.at) }
    : null

  switch (item.status) {
    case "reported": {
      const suggestions = item.suggestions_state
        ? SUGGESTIONS[item.suggestions_state]
        : "buscando"
      return {
        ...base,
        status: "por_aprobar",
        suggestions,
        candidateCount: suggestions === "listas" ? item.candidate_count : 0,
      }
    }
    case "pending_ack":
      return replacement && approval
        ? {
            ...base,
            status: "esperando_confirmacion",
            replacement,
            approval,
            deadlineUtc: clockOrDash(item.deadline_at),
          }
        : null
    case "covered":
      return replacement && approval
        ? {
            ...base,
            status: "cubierta",
            replacement,
            approval,
            confirmedAtUtc: clockOrDash(item.confirmed_at),
          }
        : null
    case "cancelled":
      return null
  }
}

// Seguimiento de las ausencias de los vuelos que salen hoy (hora de Colombia).
export const getAbsenceTracking = async (): Promise<TrackedAbsence[]> => {
  const { data } = await apiClient.get<ApiTrackingItem[]>(
    "/crew/absences/tracking"
  )
  return data
    .map(toTrackedAbsence)
    .filter((absence): absence is TrackedAbsence => absence !== null)
}
