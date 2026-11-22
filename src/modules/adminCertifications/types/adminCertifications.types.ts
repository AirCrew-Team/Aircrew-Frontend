// Tipos de la pantalla Certificaciones del super admin (licencias FAA de la tripulación).

// Estado de la certificación: es el valor del filtro en la URL (?status=verificado).
export type CertificationState =
  "verificado" | "por_verificar" | "sin_certificado"

// Tipo de cargo: cabina de mando (pilotos) o cabina de pasajeros. Decide el ícono, los
// certificados posibles y contra qué se verifica.
export type CrewArea = "cabina_mando" | "cabina"

export interface CrewCertification {
  // Id del tripulante (UUID del usuario); con él se piden su ficha y su copia.
  id: string
  // Código que se muestra en la columna ID, ej. "AC-1108". null si no tiene.
  code: string | null
  // Primera palabra del nombre y el resto. Vacíos si el backend no trae el nombre
  // (el servicio admin no respondió): la pantalla muestra «—».
  firstName: string
  lastName: string
  email: string | null
  // Cargo de tripulación, ej. "Comandante" o "Sobrecargo Principal".
  roleTitle: string
  // null: el cargo no está en el catálogo de certificaciones.
  area: CrewArea | null
  // Código IATA de la base (hub de Delta), ej. "ATL". null si no tiene.
  base: string | null
  // Número de certificado FAA; null si todavía no tiene certificación registrada.
  licenseNumber: string | null
  // Códigos de los certificados, ej. ["ATP", "IR", "ME"] o ["CDP"].
  certificates: string[]
  status: CertificationState
}

// Copia del certificado (PDF o imagen). El archivo se descarga aparte, con
// downloadCertificateFile.
export interface CertificateFile {
  name: string
  mimeType: string
  sizeBytes: number
}

// Evento del historial de una certificación.
export interface CertificationHistoryEntry {
  event: "registrado" | "verificado" | "actualizado"
  // Quién lo hizo (nombre del super_admin); null si ya no existe.
  by: string | null
  // Fecha en ISO: con hora si viene del backend, ej. "2026-08-20T15:04:00.000Z".
  date: string
  // Detalle opcional, ej. "cotejado con Airmen Inquiry (registro público FAA)".
  note?: string | null
}

// Ficha de la certificación (ventana del ojo): los datos de la fila, la copia del
// certificado y el historial, del más reciente al más antiguo.
export interface CertificationDetail extends CrewCertification {
  file: CertificateFile | null
  history: CertificationHistoryEntry[]
}

// Datos que se envían al registrar o editar una certificación.
export interface SaveCertificationInput {
  licenseNumber: string
  certificates: string[]
  // true: el administrador cotejó los datos con la FAA → «Verificado».
  // false: se guarda «Por verificar» (también quita la verificación).
  verified: boolean
  // Copia del certificado: un archivo nuevo, null para quitarla o undefined para dejar
  // la que había.
  file?: File | null
}

// Parámetros que se envían al backend para pedir una página de la lista.
export interface CertificationsListParams {
  page: number
  pageSize: number
  search: string
  status?: CertificationState
}

// Respuesta paginada: solo los registros de la página pedida y el total.
export interface CertificationsListResponse {
  items: CrewCertification[]
  page: number
  pageSize: number
  total: number
}

// Indicadores del encabezado; también son los conteos de los filtros.
export interface CertificationsStats {
  total: number
  byStatus: Record<CertificationState, number>
}

// Catálogo de certificados (GET /certifications/options).
export interface CertificateInfo {
  code: string
  // Nombre completo, ej. "Airline Transport Pilot (ATP)".
  name: string
  // Texto corto para las etiquetas de la tabla, ej. "ATP".
  short: string
}

export interface CertificationCatalog {
  certificates: CertificateInfo[]
  // Área y certificados que se pueden registrar para cada cargo.
  byPosition: Record<string, { area: CrewArea; certificates: string[] }>
  // Licencias de piloto, de mayor a menor: IR y ME van sobre una de ellas.
  pilotLicenses: string[]
  // Certificado obligatorio de la tripulación de cabina (CDP).
  cabinLicense: string
}
