// Tipos de Aeronaves (super admin): flota, indicadores y formulario de registro/edición.

// Estado de la aeronave (solo del avión, no de sus vuelos):
// - operativa: en servicio.
// - mantenimiento: fuera de servicio, en hangar.
export type AircraftStatus = "operativa" | "mantenimiento"

// Filtro de la lista (?status=): uno de los estados.
export type AircraftFilter = AircraftStatus

export type AircraftCategory = "narrow_body" | "wide_body" | "regional"

// Motivo del mantenimiento, en palabras claras (ej. «Problemas con el motor»).
export type MaintenanceType =
  | "motor"
  | "ala"
  | "tren_aterrizaje"
  | "fuselaje"
  | "electrico"
  | "hidraulico"
  | "revision_programada"

// Tripulación mínima para operar el modelo.
export interface MinimumCrew {
  pilots: number
  cabin: number
}

// Modelo de la flota (catálogo). Capacidad y tripulación mínima dependen del modelo.
export interface AircraftModel {
  id: string
  name: string
  category: AircraftCategory
  capacity: number
  minimumCrew: MinimumCrew
  // Motores del modelo, ej. "2 × Pratt & Whitney PW1100G".
  engines: string
}

// Base de operación, ej. { code: "ATL", name: "Atlanta (ATL)" }.
export interface AircraftBase {
  code: string
  name: string
}

// Aeronave como la devuelve el backend: con los datos de su modelo y su base.
export interface Aircraft {
  id: string
  // Matrícula FAA, ej. "N391DN".
  registration: string
  // Número de serie del fabricante (MSN), ej. "10342".
  msn: string
  modelId: string
  modelName: string
  category: AircraftCategory
  capacity: number
  minimumCrew: MinimumCrew
  engines: string
  baseCode: string
  baseName: string
  // Año de fabricación, ej. 2021.
  manufactureYear: number
  // Fecha de llegada a la flota (AAAA-MM-DD).
  inFleetSince: string
  // Uso acumulado en toda su vida: horas de vuelo y ciclos (despegue + aterrizaje).
  flightHours: number
  cycles: number
  status: AircraftStatus
  // Solo en mantenimiento: motivo y descripción del problema.
  maintenanceType: MaintenanceType | null
  maintenanceNote: string | null
  // Foto de la aeronave; null: se muestra la imagen genérica de la flota.
  photoUrl: string | null
}

// Parámetros de la lista paginada (los que irán al backend).
export interface AircraftListParams {
  page: number
  pageSize: number
  search: string
  status?: AircraftFilter
}

// Respuesta paginada: solo las aeronaves de la página pedida y el total.
export interface AircraftListResponse {
  items: Aircraft[]
  page: number
  pageSize: number
  total: number
}

// Indicadores de la flota; también son los conteos de los filtros.
export interface AircraftStats {
  total: number
  operational: number
  maintenance: number
  // Asientos de toda la flota (suma de la capacidad de cada aeronave).
  totalSeats: number
}

// Catálogos del formulario.
export interface AircraftOptions {
  models: AircraftModel[]
  bases: AircraftBase[]
}

// Datos que se envían al registrar o editar (con la API, POST o PUT de la aeronave).
export interface SaveAircraftInput {
  registration: string
  msn: string
  modelId: string
  baseCode: string
  manufactureYear: number
  inFleetSince: string
  condition: AircraftStatus
  maintenanceType: MaintenanceType | null
  maintenanceNote: string | null
  // Foto nueva, null para quitarla o undefined para dejar la que había.
  photo?: File | null
}

// Tarea del mantenimiento.
export interface MaintenanceTask {
  name: string
  done: boolean
}

// Mantenimiento en curso de una aeronave (orden de taller).
export interface MaintenanceRecord {
  orderNumber: string
  type: MaintenanceType
  // Qué se encontró, ej. «Vibración anormal en el motor derecho». null: sin descripción.
  description: string | null
  hangar: string
  // Fecha de entrada a hangar (AAAA-MM-DD).
  openedOn: string
  tasks: MaintenanceTask[]
}

// Reparación ya terminada (historial de mantenimientos).
export interface MaintenanceHistoryEntry {
  orderNumber: string
  type: MaintenanceType
  description: string | null
  hangar: string
  openedOn: string
  // Fecha en que volvió a servicio (AAAA-MM-DD).
  closedOn: string
}

// Informe de una aeronave («Ver informe»): todos sus datos, su mantenimiento en curso
// (si está en hangar) y sus reparaciones anteriores.
export interface AircraftReport {
  aircraft: Aircraft
  maintenance: MaintenanceRecord | null
  history: MaintenanceHistoryEntry[]
}
