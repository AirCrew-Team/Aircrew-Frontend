import { getCertificationsStats } from "@/App/actions/certifications/certifications.actions"
import type {
  AirportStatus,
  CertificationsOverview,
  FleetSummary,
  OpsCenter,
  StandbySummary,
  UsersSummary,
} from "@/modules/adminHome/types/adminHome.types"
import { withDemo } from "@/modules/shared/session/demoSession"
import apiClient from "@/service/api-client"

import * as demo from "./adminHome.demo"

// Datos simulados ("quemados") con la forma de las acciones reales: se moverán a
// App/actions cuando exista la API, y los componentes no tendrán que cambiar.
// Una función por sección, porque cada una vendrá de un servicio distinto del gateway.
// Devuelven una promesa, igual que lo hará la petición HTTP real.

// Sesión real: el admin no tiene base (bases/me es de los supervisores), así que el
// encabezado y el banner hablan de la operación de Delta en general. El backend no da
// condición operacional, pista ni QNH: no se inventan («—» o no se muestran).
const getNetworkOpsCenter = (): Promise<OpsCenter> =>
  Promise.resolve({
    unit: "Jefatura de Operaciones de Vuelo",
    hqCode: "DL",
    baseName: "Delta Air Lines",
    operationalCondition: "—",
  })

const getNetworkStatus = (): Promise<AirportStatus> =>
  Promise.resolve({
    trafficLabel: "Red de operaciones",
    location: "Delta Air Lines • EE. UU.",
    headline: "Operaciones de la red Delta",
    summary:
      "Tripulaciones, flota y certificaciones de los hubs de Delta Air Lines en Estados Unidos.",
    activeRunway: null,
    localQnh: null,
  })

// Encabezado: dependencia, sede y condición operacional.
export const getOpsCenter = withDemo(getNetworkOpsCenter, demo.getOpsCenter)

// Banner: estado de la operación (con la cuenta demo, el del aeropuerto base).
export const getAirportStatus = withDemo(
  getNetworkStatus,
  demo.getAirportStatus
)

// Tarjeta de usuarios.
export const getUsersSummary = (): Promise<UsersSummary> =>
  Promise.resolve({ registeredCrew: 34, availabilityPercent: 92 })

// Tarjeta de flota.
export const getFleetSummary = (): Promise<FleetSummary> =>
  Promise.resolve({
    activeAircraft: 18,
    models: "A320 / B737",
    operational: 18,
    total: 18,
  })

// Tarjeta de certificaciones. Sesión real: estado de verificación de la tripulación
// (GET /certifications/stats), que no tiene vencimientos.
const getVerificationOverview = async (): Promise<CertificationsOverview> => {
  const { total, byStatus } = await getCertificationsStats()
  return {
    kind: "verification",
    total,
    verified: byStatus.verificado,
    pendingVerification: byStatus.por_verificar,
    uncertified: byStatus.sin_certificado,
  }
}

export const getCertificationsRenewals = withDemo(
  getVerificationOverview,
  demo.getCertificationsRenewals
)

interface ApiCurrentShift {
  shift: "morning" | "afternoon" | "night"
  flights_today: number
  standby_total: number
  standby_ready: number
  staffing_delays: number
}

// Nombre del turno y del bloque horario que cubre la guardia.
const SHIFT_TEXT: Record<
  ApiCurrentShift["shift"],
  Pick<StandbySummary, "shift" | "block">
> = {
  morning: { shift: "Turno de la Mañana", block: "matutino" },
  afternoon: { shift: "Turno de la Tarde", block: "vespertino" },
  night: { shift: "Turno de la Noche", block: "nocturno" },
}

// Resumen de guardias. Sesión real: GET /shifts/current SIN base (el admin no tiene
// base; el backend junta todas las bases con la hora de Nueva York).
const getNetworkStandby = async (): Promise<StandbySummary> => {
  const { data } = await apiClient.get<ApiCurrentShift>(
    "/api/crew/shifts/current"
  )
  return {
    ...SHIFT_TEXT[data.shift],
    standbyCrew: data.standby_total,
    staffingDelays: data.staffing_delays,
  }
}

export const getStandbySummary = withDemo(
  getNetworkStandby,
  demo.getStandbySummary
)
