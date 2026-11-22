import type {
  AirportStatus,
  CertificationsRenewals,
  FleetSummary,
  OpsCenter,
  StandbySummary,
  UsersSummary,
} from "@/modules/adminHome/types/adminHome.types"
import { withDemo } from "@/modules/shared/session/demoSession"

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

// Tarjeta de certificaciones.
export const getCertificationsRenewals = (): Promise<CertificationsRenewals> =>
  Promise.resolve({ toRenew: 4, expiringAlerts: 4, alertWindowDays: 30 })

// Resumen de guardias.
export const getStandbySummary = (): Promise<StandbySummary> =>
  Promise.resolve({
    shift: "Turno de la Tarde",
    standbyCrew: 3,
    block: "vespertino",
    staffingDelays: 0,
  })
