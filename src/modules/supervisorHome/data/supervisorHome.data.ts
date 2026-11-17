import type {
  AbsencesSummary,
  CrewSummary,
  ReplacementRequestsSummary,
  ShiftStatus,
  SupervisionCenter,
} from "@/modules/supervisorHome/types/supervisorHome.types"

// Datos simulados ("quemados") con la forma de las acciones reales: se moverán a
// App/actions cuando exista la API, y los componentes no tendrán que cambiar.
// Una función por sección, porque cada una vendrá de un servicio distinto del gateway.
// Devuelven una promesa, igual que lo hará la petición HTTP real.

// Encabezado: dependencia, sede y condición operacional.
export const getSupervisionCenter = (): Promise<SupervisionCenter> =>
  Promise.resolve({
    unit: "Supervisión de Guardia",
    hqCode: "BOG-HQ",
    baseName: "Base Eldorado",
    operationalCondition: "Nivel Óptimo",
  })

// Banner: estado del turno en la base.
export const getShiftStatus = (): Promise<ShiftStatus> =>
  Promise.resolve({
    tag: "Control Operacional y Contingencias",
    location: "SKBO • Hub Central Eldorado",
    headline: "Disponibilidad y Relevos en Tiempo Real",
    summary:
      "Monitoreo permanente de turnos, guardias activas y contingencias inmediatas para garantizar la puntualidad de vuelo.",
    flightsToday: 42,
    standbyReadiness: 100,
  })

// Tarjeta de solicitudes de reemplazo.
export const getReplacementRequestsSummary =
  (): Promise<ReplacementRequestsSummary> =>
    Promise.resolve({ pendingApproval: 5, resolutionRate: 85.7 })

// Tarjeta de ausencias.
export const getAbsencesSummary = (): Promise<AbsencesSummary> =>
  Promise.resolve({ open: 3, criticalDepartures: 1 })

// Tarjeta de tripulación.
export const getCrewSummary = (): Promise<CrewSummary> =>
  Promise.resolve({ onDuty: 34, availabilityPercent: 92 })
