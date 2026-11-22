import { isAxiosError } from "axios"

import type {
  Absence,
  AbsenceFlight,
  AbsenceReason,
  AbsenceStatus,
  ReportAbsenceInput,
} from "@/App/types/absences.types"
import apiClient from "@/service/api-client"

// Ausencias del servicio crew (a través del gateway), con la cookie de sesión.

const ABSENCES_PATH = "/api/crew/absences"

// El base64 del comprobante (hasta 10 MB) pesa más que el resto de peticiones: más margen
// que los 10 s del cliente.
const REPORT_TIMEOUT_MS = 60_000

// Tabla de motivos de la spec (Decisiones, punto 6): el backend usa nombres en inglés.
const API_REASON: Record<AbsenceReason, string> = {
  incapacidad: "illness",
  fatiga: "fatigue",
  calamidad: "emergency",
  traslado: "transfer",
}

const REASON_BY_API = Object.fromEntries(
  Object.entries(API_REASON).map(([reason, api]) => [api, reason])
) as Record<string, AbsenceReason>

// parent_absence_id: la ausencia por fechas de la que salió una ausencia por vuelo.
type ApiAbsence = Omit<Absence, "reason" | "status" | "flights"> & {
  reason: string
  status: string
  parent_absence_id?: string | null
  flight_departure_at?: string | null
}

const KNOWN_STATUSES: readonly string[] = [
  "pending_ack",
  "covered",
  "cancelled",
] satisfies AbsenceStatus[]

// Estado desconocido → «reported» (Por aprobar).
const statusOf = (status: string) =>
  (KNOWN_STATUSES.includes(status) ? status : "reported") as AbsenceStatus

// Motivo desconocido → null. Sin vuelos: solo la lista los añade.
const fromApi = (absence: ApiAbsence): Absence => ({
  ...absence,
  reason: REASON_BY_API[absence.reason] ?? null,
  status: statusOf(absence.status),
  flights: [],
})

// Estado de una ausencia por fechas con vuelos: alguno sin reemplazo → «reported»; si no,
// alguno esperando el «Enterado» → «pending_ack»; todos cubiertos → «covered».
const statusOfFlights = (flights: AbsenceFlight[]): AbsenceStatus =>
  flights.some((flight) => flight.status === "reported")
    ? "reported"
    : flights.some((flight) => flight.status === "pending_ack")
      ? "pending_ack"
      : "covered"

// Si el navegador deja File.type vacío, se deduce de la extensión (ya validada).
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
}

const mimeTypeOf = (file: File) =>
  file.type ||
  MIME_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] ||
  ""

// 400 o 409 del backend: `message` es su texto ({ error: "…" }), que se muestra tal cual.
export class AbsenceRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AbsenceRequestError"
  }
}

// Base64 puro, sin el prefijo «data:…;base64,» de readAsDataURL.
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      resolve(dataUrl.slice(dataUrl.indexOf(",") + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// Un 400 o un 409 lanzan AbsenceRequestError; lo demás (5xx, red) relanza el error original.
export const reportAbsence = async (
  input: ReportAbsenceInput
): Promise<Absence> => {
  const body = {
    start_date: input.startDate,
    end_date: input.endDate,
    reason: API_REASON[input.reason],
    notes: input.notes.trim() ? input.notes : null,
    attachment: input.attachment
      ? {
          file_name: input.attachment.name,
          mime_type: mimeTypeOf(input.attachment),
          data_base64: await toBase64(input.attachment),
        }
      : null,
  }
  try {
    const { data } = await apiClient.post<ApiAbsence>(ABSENCES_PATH, body, {
      timeout: REPORT_TIMEOUT_MS,
    })
    return fromApi(data)
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined
    const message: unknown = isAxiosError(error)
      ? error.response?.data?.error
      : undefined
    if ((status === 400 || status === 409) && typeof message === "string") {
      throw new AbsenceRequestError(message)
    }
    throw error
  }
}

// Tablero de Ausencias, en una sola petición sin kind: las ausencias por fechas, sus hijas
// por vuelo (parent_absence_id) y los vuelos reportados sueltos. En el backend solo las
// hijas cambian de estado (aprobar un reemplazo → pending_ack; su «Enterado» → covered) y
// nada llega al padre, que se queda en «reported»: cada padre lleva en `flights` sus
// hijas no canceladas y su estado sale de ellas (sin hijas, el suyo). Las hijas no son
// tarjetas propias. Las canceladas no se muestran (tampoco las hijas de un padre cancelado).
export const getAbsences = async (): Promise<Absence[]> => {
  const { data } = await apiClient.get<ApiAbsence[]>(ABSENCES_PATH)
  const flightsByParent = new Map<string, AbsenceFlight[]>()
  const children = data
    .filter((row) => row.parent_absence_id && row.status !== "cancelled")
    .toSorted((a, b) =>
      (a.flight_departure_at ?? "").localeCompare(b.flight_departure_at ?? "")
    )
  for (const row of children) {
    const parentId = row.parent_absence_id ?? ""
    const flights = flightsByParent.get(parentId) ?? []
    flights.push({
      id: row.id,
      flight_number: row.flight_number,
      status: statusOf(row.status) as AbsenceFlight["status"],
      replacement_name: row.replacement_name,
    })
    flightsByParent.set(parentId, flights)
  }
  return data
    .filter((row) => !row.parent_absence_id && row.status !== "cancelled")
    .map((row) => {
      const absence = fromApi(row)
      const flights = flightsByParent.get(row.id)
      return flights
        ? { ...absence, flights, status: statusOfFlights(flights) }
        : absence
    })
}

// Solo la fila (sin sus vuelos): puede llegar «cancelled» si se canceló después de cargar
// la lista.
export const getAbsenceById = async (id: string): Promise<Absence> => {
  const { data } = await apiClient.get<ApiAbsence>(`${ABSENCES_PATH}/${id}`)
  return fromApi(data)
}

// El binario del comprobante: para la vista previa del detalle y para «Descargar» cuando
// no hay vista previa (tipo no previsualizable).
export const downloadAbsenceAttachment = async (id: string): Promise<Blob> => {
  const { data } = await apiClient.get<Blob>(
    `${ABSENCES_PATH}/${id}/attachment`,
    { responseType: "blob" }
  )
  return data
}

// URL absoluta del comprobante en el gateway: el href del enlace «Descargar» cuando no hay
// blob de la vista previa, para que siga siendo un enlace real. La descarga no la hace el
// navegador: el clic se cancela y el archivo se pide con downloadAbsenceAttachment, así
// un 401 cierra la sesión con su toast en vez de mostrar el JSON del gateway.
export const absenceAttachmentUrl = (id: string): string =>
  apiClient.getUri({ url: `${ABSENCES_PATH}/${id}/attachment` })
