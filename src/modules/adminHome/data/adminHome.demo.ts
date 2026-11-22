import type {
  AirportStatus,
  CertificationsOverview,
  OpsCenter,
  StandbySummary,
} from "@/modules/adminHome/types/adminHome.types"

// Datos de ejemplo del Inicio del admin (cuentas demo y selector «Rol (dev)»).

// Encabezado: dependencia, sede y condición operacional.
export const getOpsCenter = (): Promise<OpsCenter> =>
  Promise.resolve({
    unit: "Jefatura de Operaciones de Vuelo",
    hqCode: "BOG-HQ",
    baseName: "Base Eldorado",
    operationalCondition: "Nivel Óptimo",
  })

// Banner: estado del aeropuerto base.
export const getAirportStatus = (): Promise<AirportStatus> =>
  Promise.resolve({
    trafficLabel: "Tráfico Aéreo Continental",
    location: "SKBO • Terminal 1 & 2",
    headline: "Operaciones Normales • Base Central Bogotá Eldorado",
    summary:
      "Vuelos en secuencia programada sin restricciones meteorológicas ni alertas de cizalladura en aproximación norte.",
    activeRunway: "RWY 13R",
    localQnh: "1022 hPa",
  })

// Tarjeta de certificaciones: renovaciones y alertas de vencimiento.
export const getCertificationsRenewals = (): Promise<CertificationsOverview> =>
  Promise.resolve({
    kind: "renewals",
    toRenew: 4,
    expiringAlerts: 4,
    alertWindowDays: 30,
  })

// Resumen de guardias.
export const getStandbySummary = (): Promise<StandbySummary> =>
  Promise.resolve({
    shift: "Turno de la Tarde",
    standbyCrew: 3,
    block: "vespertino",
    staffingDelays: 0,
  })
