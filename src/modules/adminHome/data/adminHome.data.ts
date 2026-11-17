import type {
  AirportStatus,
  CertificationsRenewals,
  FleetSummary,
  OpsCenter,
  StandbySummary,
  UsersSummary,
} from "@/modules/adminHome/types/adminHome.types"

// Datos simulados ("quemados") con la forma de las acciones reales: se moverán a
// App/actions cuando exista la API, y los componentes no tendrán que cambiar.
// Una función por sección, porque cada una vendrá de un servicio distinto del gateway.
// Devuelven una promesa, igual que lo hará la petición HTTP real.

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
