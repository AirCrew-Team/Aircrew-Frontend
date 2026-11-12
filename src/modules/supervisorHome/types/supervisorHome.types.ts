// Tipos de los datos de la pantalla de Inicio del supervisor.
// Cada interfaz corresponde a una sección y a una función de supervisorHome.data.ts.

// Encabezado de bienvenida (SupervisorWelcomeHeader).
export interface SupervisionCenter {
  // Dependencia que se muestra en la etiqueta, ej. "Supervisión de Guardia".
  unit: string
  // Código de la sede y nombre de la base, ej. "BOG-HQ" y "Base Eldorado".
  hqCode: string
  baseName: string
  // Estado que se muestra bajo el reloj, ej. "Nivel Óptimo".
  operationalCondition: string
}

// Banner con la foto (ShiftStatusHero).
export interface ShiftStatus {
  // Etiqueta del recuadro oscuro, ej. "Control Operacional y Contingencias".
  tag: string
  // Aeropuerto y zona, ej. "SKBO • Hub Central Eldorado".
  location: string
  // Título del banner (h2).
  headline: string
  // Texto corto bajo el título.
  summary: string
  // Vuelos programados en el día.
  flightsToday: number
  // Porcentaje de la guardia lista para salir.
  standbyReadiness: number
}

// Tarjeta «Solicitudes de Reemplazo» (ReplacementRequestsCard).
export interface ReplacementRequestsSummary {
  // Sugerencias de la IA pendientes de aprobación del supervisor.
  pendingApproval: number
  // Porcentaje de solicitudes resueltas, ej. 85.7.
  resolutionRate: number
}

// Tarjeta «Ausencias» (AbsencesCard).
export interface AbsencesSummary {
  // Ausencias sin resolver.
  open: number
  // Ausencias que afectan una salida en menos de 2 horas.
  criticalDepartures: number
}

// Tarjeta «Tripulación» (CrewCard).
export interface CrewSummary {
  // Tripulantes en servicio en el turno.
  onDuty: number
  // Porcentaje de tripulantes aptos en el turno actual.
  availabilityPercent: number
}
