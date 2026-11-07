// Tipos de los datos de la pantalla de Inicio del super admin.
// Cada interfaz corresponde a una sección y a una función de adminHome.data.ts.

// Encabezado de bienvenida (AdminWelcomeHeader).
export interface OpsCenter {
  // Dependencia que se muestra en la etiqueta, ej. "Jefatura de Operaciones de Vuelo".
  unit: string
  // Código de la sede y nombre de la base, ej. "BOG-HQ" y "Base Eldorado".
  hqCode: string
  baseName: string
  // Estado que se muestra bajo el reloj, ej. "Nivel Óptimo".
  operationalCondition: string
}

// Banner con la foto (AirportStatusHero).
export interface AirportStatus {
  // Etiqueta del recuadro oscuro, ej. "Tráfico Aéreo Continental".
  trafficLabel: string
  // Aeropuerto y terminales, ej. "SKBO • Terminal 1 & 2".
  location: string
  // Título del banner (h2).
  headline: string
  // Texto corto bajo el título.
  summary: string
  // Pista en uso, ej. "RWY 13R".
  activeRunway: string
  // Presión de referencia del aeropuerto, ej. "1022 hPa".
  localQnh: string
}

// Tarjeta «Gestión de Usuarios» (UsersCard).
export interface UsersSummary {
  registeredCrew: number
  // Porcentaje de tripulantes aptos en el turno actual.
  availabilityPercent: number
}

// Tarjeta «Flota de Aeronaves» (FleetCard).
export interface FleetSummary {
  activeAircraft: number
  // Tipos de aeronave en línea, ej. "A320 / B737".
  models: string
  // Aeronaves operativas sobre el total, ej. 18 de 18.
  operational: number
  total: number
}

// Tarjeta «Certificaciones y Licencias» (CertificationsOverviewCard).
export interface CertificationsRenewals {
  // Licencias que deben renovarse.
  toRenew: number
  // Alertas de vencimiento dentro de los próximos `alertWindowDays` días.
  expiringAlerts: number
  alertWindowDays: number
}

// Resumen de guardias (StandbySummary).
export interface StandbySummary {
  // Turno actual, ej. "Turno de la Tarde".
  shift: string
  // Tripulantes disponibles para cubrir un reemplazo.
  standbyCrew: number
  // Bloque horario cubierto por la guardia, ej. "vespertino".
  block: string
  // Demoras causadas por falta de tripulación.
  staffingDelays: number
}
