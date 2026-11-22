import * as demo from "./supervisorHome.demo"
import { withDemo } from "@/modules/shared/session/demoSession"
import {
  getMyBase,
  type ApiMyBase,
} from "@/modules/shared/base/myBase"
import { getShiftCrew } from "@/modules/shiftCrew/data/shiftCrew.data"
import type {
  AbsencesSummary,
  CrewSummary,
  ReplacementRequestsSummary,
  ShiftStatus,
  SupervisionCenter,
} from "@/modules/supervisorHome/types/supervisorHome.types"
import apiClient from "@/service/api-client"

// Datos del Inicio del supervisor desde el gateway. Una función por tarjeta.

const CONDITION_LABEL: Record<ApiMyBase["operational_condition"], string> = {
  normal: "Nivel Óptimo",
  degraded: "Nivel Degradado",
  critical: "Nivel Crítico",
}

// Encabezado: dependencia, sede y condición operacional.
const getSupervisionCenterFromApi = async (): Promise<SupervisionCenter> => {
  const base = await getMyBase()
  return {
    unit: base.unit,
    hqCode: base.hq_code,
    baseName: base.base_name,
    operationalCondition: CONDITION_LABEL[base.operational_condition],
  }
}

interface ApiCurrentShift {
  shift: "morning" | "afternoon" | "night"
  base: string | null
  flights_today: number
  standby_total: number
  standby_ready: number
  staffing_delays: number
}

// Banner: estado del turno en la base. Los textos fijos son del diseño, no del backend.
const getShiftStatusFromApi = async (): Promise<ShiftStatus> => {
  const base = await getMyBase()
  const { data } = await apiClient.get<ApiCurrentShift>("/api/crew/shifts/current", {
    params: { base: base.iata },
  })
  return {
    tag: "Control Operacional y Contingencias",
    location: `${base.icao} • ${base.base_name}`,
    headline: "Disponibilidad y Relevos en Tiempo Real",
    summary:
      "Monitoreo permanente de turnos, guardias activas y contingencias inmediatas para garantizar la puntualidad de vuelo.",
    flightsToday: data.flights_today,
    standbyReadiness:
      data.standby_total === 0
        ? 0
        : Math.round((data.standby_ready / data.standby_total) * 100),
  }
}

interface ApiAbsenceStats {
  reported: number
  pending_ack: number
  covered_today: number
  resolution_rate: number | null
}

const getAbsenceStats = async () =>
  (await apiClient.get<ApiAbsenceStats>("/api/crew/absences/stats")).data

// Tarjeta de recomendaciones: por aprobar y tasa de resolución (30 días).
const getReplacementRequestsSummaryFromApi =
  async (): Promise<ReplacementRequestsSummary> => {
    const stats = await getAbsenceStats()
    return {
      pendingApproval: stats.reported,
      resolutionRate: stats.resolution_rate,
    }
  }

interface ApiOpenAbsence {
  status: "reported" | "pending_ack" | "covered" | "cancelled"
  flight_departure_at: string
}

const CRITICAL_WINDOW_MS = 2 * 60 * 60 * 1000

// Tarjeta de ausencias: sin resolver y las que afectan una salida en menos de 2 h.
const getAbsencesSummaryFromApi = async (): Promise<AbsencesSummary> => {
  const { data } = await apiClient.get<ApiOpenAbsence[]>("/api/crew/absences")
  const open = data.filter(
    (absence) => absence.status === "reported" || absence.status === "pending_ack"
  )
  const now = Date.now()
  return {
    open: open.length,
    criticalDepartures: open.filter((absence) => {
      const left = new Date(absence.flight_departure_at).getTime() - now
      return left > 0 && left < CRITICAL_WINDOW_MS
    }).length,
  }
}

// Tarjeta de tripulación, con las mismas fórmulas que «Tu base» de Tripulación: en
// servicio = total − ausentes − sin asignación; aptos = total − ausentes.
const getCrewSummaryFromApi = async (): Promise<CrewSummary> => {
  const { members } = await getShiftCrew()
  const total = members.length
  const fit =
    total - members.filter((member) => member.status === "ausente").length
  return {
    onDuty:
      fit - members.filter((member) => member.status === "sin_asignar").length,
    availabilityPercent: total === 0 ? 0 : Math.round((fit / total) * 100),
  }
}

// Cuenta demo → datos de ejemplo (D4); sesión real → backend.
export const getSupervisionCenter = withDemo(getSupervisionCenterFromApi, demo.getSupervisionCenter)
export const getShiftStatus = withDemo(getShiftStatusFromApi, demo.getShiftStatus)
export const getReplacementRequestsSummary = withDemo(getReplacementRequestsSummaryFromApi, demo.getReplacementRequestsSummary)
export const getAbsencesSummary = withDemo(getAbsencesSummaryFromApi, demo.getAbsencesSummary)
export const getCrewSummary = withDemo(getCrewSummaryFromApi, demo.getCrewSummary)
