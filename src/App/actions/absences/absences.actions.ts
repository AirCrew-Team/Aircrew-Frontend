import { isAxiosError } from "axios"

import type {
  Absence,
  AbsenceReason,
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

type ApiAbsence = Omit<Absence, "reason" | "status"> & {
  reason: string
  status: string
}

// Motivo desconocido → null; estado desconocido → «reported» (Por aprobar). pending_ack
// (esperando el «Enterado» del reemplazo) conserva su estado.
const fromApi = (absence: ApiAbsence): Absence => ({
  ...absence,
  reason: REASON_BY_API[absence.reason] ?? null,
  status:
    absence.status === "pending_ack" || absence.status === "covered"
      ? absence.status
      : "reported",
})

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

// Tablero de Ausencias: solo las ausencias por fechas (kind=dates). Sin kind vendrían
// también sus hijas por vuelo y la misma ausencia se vería varias veces. Las canceladas
// no se muestran.
export const getAbsences = async (): Promise<Absence[]> => {
  const { data } = await apiClient.get<ApiAbsence[]>(ABSENCES_PATH, {
    params: { kind: "dates" },
  })
  return data.filter((absence) => absence.status !== "cancelled").map(fromApi)
}

export const getAbsenceById = async (id: string): Promise<Absence> => {
  const { data } = await apiClient.get<ApiAbsence>(`${ABSENCES_PATH}/${id}`)
  return fromApi(data)
}

// El binario del comprobante, para la vista previa del detalle.
export const downloadAbsenceAttachment = async (id: string): Promise<Blob> => {
  const { data } = await apiClient.get<Blob>(
    `${ABSENCES_PATH}/${id}/attachment`,
    { responseType: "blob" }
  )
  return data
}

// URL absoluta del comprobante en el gateway, para el enlace nativo «Descargar»: el
// navegador lo descarga con el Content-Disposition del backend y la cookie de sesión.
export const absenceAttachmentUrl = (id: string): string =>
  apiClient.getUri({ url: `${ABSENCES_PATH}/${id}/attachment` })
