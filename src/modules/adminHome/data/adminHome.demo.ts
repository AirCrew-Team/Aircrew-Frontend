import type {
  AirportStatus,
  OpsCenter,
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
