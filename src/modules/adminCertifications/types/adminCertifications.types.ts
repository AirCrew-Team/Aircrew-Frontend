// Tipos de la pantalla Certificaciones del super admin (licencias FAA de la tripulación).

// Estado de la certificación: es el valor del filtro en la URL (?status=verificado).
export type CertificationState =
  "verificado" | "por_verificar" | "sin_certificado"

// Tipo de cargo: cabina de mando (pilotos) o cabina de pasajeros. Decide el ícono, los
// certificados posibles y contra qué se verifica.
export type CrewArea = "cabina_mando" | "cabina"

export interface CrewCertification {
  // Código del tripulante, ej. "AC-1108".
  id: string
  firstName: string
  lastName: string
  email: string
  // Cargo de tripulación, ej. "Comandante" o "Sobrecargo Principal".
  roleTitle: string
  area: CrewArea
  // Código IATA de la base (hub de Delta), ej. "ATL".
  base: string
  // Número de certificado FAA; null si todavía no tiene certificación registrada.
  licenseNumber: string | null
  // Códigos de los certificados, ej. ["ATP", "IR", "ME"] o ["CDP"].
  certificates: string[]
  status: CertificationState
}

// Copia del certificado (PDF o imagen). url null: la copia existe en el backend pero
// todavía no hay dónde abrirla (datos simulados).
export interface CertificateFile {
  name: string
  url: string | null
}

// Evento del historial de una certificación.
export interface CertificationHistoryEntry {
  event: "registrado" | "verificado" | "actualizado"
  // Quién lo hizo, ej. "Admin AirCrew".
  by: string
  // Fecha en ISO, ej. "2026-08-20".
  date: string
  // Detalle opcional, ej. "cotejado con Airmen Inquiry (registro público FAA)".
  note?: string
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
  // false: se guarda «Por verificar».
  verified: boolean
  // Copia del certificado: un archivo nuevo, null para quitarla o undefined para dejar
  // la que había. Con la API irá en la misma petición (multipart).
  file?: File | null
}

// Parámetros que se enviarán al backend para pedir una página de la lista.
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
