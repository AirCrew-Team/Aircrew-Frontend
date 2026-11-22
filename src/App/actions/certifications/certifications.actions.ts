import { isAxiosError } from "axios"

import apiClient from "@/service/api-client"
import type {
  CertificateFile,
  CertificationCatalog,
  CertificationDetail,
  CertificationHistoryEntry,
  CertificationState,
  CertificationsListParams,
  CertificationsListResponse,
  CertificationsStats,
  CrewArea,
  CrewCertification,
  SaveCertificationInput,
} from "@/modules/adminCertifications/types/adminCertifications.types"

// Certificaciones FAA de la tripulación, en el servicio crew (a través del gateway y con
// la cookie de sesión). Todas las rutas son solo del super_admin: otro rol recibe 403.
// El nombre y el correo los pide crew a admin; si admin no responde llegan en null.

const CERTIFICATIONS_PATH = "/api/crew/certifications"

const certificationPath = (userId: string) =>
  `${CERTIFICATIONS_PATH}/${encodeURIComponent(userId)}`

// La copia (hasta 5 MB, unos 6,7 MB en base64) pesa más que el resto de peticiones. El
// gateway corta a los 15 s: esperar más en el navegador no daría más margen.
const SAVE_TIMEOUT_MS = 15_000

// --- Traducción de valores: el backend usa inglés y snake_case. ---

type ApiStatus = "verified" | "pending_verification" | "uncertified"
type ApiArea = "flight_deck" | "cabin"
type ApiEvent = "registered" | "verified" | "updated"

const API_STATUS: Record<CertificationState, ApiStatus> = {
  verificado: "verified",
  por_verificar: "pending_verification",
  sin_certificado: "uncertified",
}
const STATUS_BY_API: Record<ApiStatus, CertificationState> = {
  verified: "verificado",
  pending_verification: "por_verificar",
  uncertified: "sin_certificado",
}
const AREA_BY_API: Record<ApiArea, CrewArea> = {
  flight_deck: "cabina_mando",
  cabin: "cabina",
}
const EVENT_BY_API: Record<ApiEvent, CertificationHistoryEntry["event"]> = {
  registered: "registrado",
  verified: "verificado",
  updated: "actualizado",
}

// Fila de la tabla y de «tripulantes sin certificado».
interface ApiCertificationItem {
  user_id: string
  employee_code: string | null
  name: string | null
  email: string | null
  position: string
  area: ApiArea | null
  base: string | null
  license_number: string | null
  certificates: string[]
  status: ApiStatus
  updated_at: string | null
}

// Ficha: la fila, los datos de la copia (sin bytes) y el historial.
interface ApiCertificationDetail extends ApiCertificationItem {
  file: { file_name: string; mime_type: string; size_bytes: number } | null
  history: {
    event: ApiEvent
    by_user_id: string
    by: string | null
    note: string | null
    created_at: string
  }[]
}

interface ApiOptions {
  certificates: { code: string; name: string; short: string }[]
  by_position: Record<string, { area: ApiArea; certificates: string[] }>
  pilot_licenses: string[]
  cabin_license: string
}

// Primera palabra en firstName y el resto en lastName, igual que en Usuarios.
const splitName = (name: string | null) => {
  const [firstName = "", ...rest] = (name ?? "").trim().split(/\s+/)
  return { firstName, lastName: rest.join(" ") }
}

const fromApi = (item: ApiCertificationItem): CrewCertification => ({
  id: item.user_id,
  code: item.employee_code,
  ...splitName(item.name),
  email: item.email,
  roleTitle: item.position,
  area: item.area ? (AREA_BY_API[item.area] ?? null) : null,
  base: item.base,
  licenseNumber: item.license_number,
  certificates: [...item.certificates],
  status: STATUS_BY_API[item.status],
})

const fileFromApi = (
  file: ApiCertificationDetail["file"]
): CertificateFile | null =>
  file
    ? {
        name: file.file_name,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
      }
    : null

const detailFromApi = (data: ApiCertificationDetail): CertificationDetail => ({
  ...fromApi(data),
  file: fileFromApi(data.file),
  history: data.history.map((entry) => ({
    event: EVENT_BY_API[entry.event],
    by: entry.by,
    date: entry.created_at,
    note: entry.note,
  })),
})

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

// --- Errores que la pantalla muestra con el texto del backend. ---

// 400, 404 o 409 con mensaje del backend, 413 (petición demasiado grande) o 403 (sin
// permisos). `status` permite refrescar la lista con un 404.
export class CertificationRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "CertificationRequestError"
    this.status = status
  }
}

const toCertificationError = (error: unknown) => {
  if (!isAxiosError(error) || !error.response) return error
  const { status } = error.response
  const message: unknown = error.response.data?.error
  const text = typeof message === "string" ? message.trim() : ""

  if (status === 413) {
    return new CertificationRequestError(413, "El archivo es muy grande.")
  }
  if (status === 403) {
    return new CertificationRequestError(
      403,
      "No tienes permisos para gestionar certificaciones."
    )
  }
  if ((status === 400 || status === 404 || status === 409) && text) {
    return new CertificationRequestError(status, text)
  }
  return error
}

const withErrors = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request()
  } catch (error) {
    throw toCertificationError(error)
  }
}

// --- Llamadas. ---

export const getCertificationOptions =
  async (): Promise<CertificationCatalog> => {
    const { data } = await apiClient.get<ApiOptions>(
      `${CERTIFICATIONS_PATH}/options`
    )
    return {
      certificates: data.certificates.map((certificate) => ({
        ...certificate,
      })),
      byPosition: Object.fromEntries(
        Object.entries(data.by_position).map(([position, info]) => [
          position,
          {
            area: AREA_BY_API[info.area],
            certificates: [...info.certificates],
          },
        ])
      ),
      pilotLicenses: [...data.pilot_licenses],
      cabinLicense: data.cabin_license,
    }
  }

export const getCertificationsStats =
  async (): Promise<CertificationsStats> => {
    const { data } = await apiClient.get<{
      total: number
      by_status: Record<ApiStatus, number>
    }>(`${CERTIFICATIONS_PATH}/stats`)
    return {
      total: data.total,
      byStatus: {
        verificado: data.by_status.verified ?? 0,
        por_verificar: data.by_status.pending_verification ?? 0,
        sin_certificado: data.by_status.uncertified ?? 0,
      },
    }
  }

// La búsqueda la hace el backend: nombre, ID (AC-…) o número de licencia.
export const getCertifications = async (
  params: CertificationsListParams
): Promise<CertificationsListResponse> => {
  const { data } = await apiClient.get<{
    items: ApiCertificationItem[]
    page: number
    page_size: number
    total: number
  }>(CERTIFICATIONS_PATH, {
    params: {
      page: params.page,
      page_size: params.pageSize,
      // Vacío no se envía: el backend lo toma como «sin búsqueda».
      search: params.search.trim() || undefined,
      status: params.status ? API_STATUS[params.status] : undefined,
    },
  })
  return {
    items: data.items.map(fromApi),
    page: data.page,
    pageSize: data.page_size,
    total: data.total,
  }
}

// Opciones de «Tripulante» al registrar desde la barra: los que no tienen certificado.
export const getUncertifiedCrew = async (): Promise<CrewCertification[]> => {
  const { data } = await apiClient.get<ApiCertificationItem[]>(
    `${CERTIFICATIONS_PATH}/uncertified`
  )
  return data.map(fromApi)
}

export const getCertificationDetail = (
  userId: string
): Promise<CertificationDetail> =>
  withErrors(async () => {
    const { data } = await apiClient.get<ApiCertificationDetail>(
      certificationPath(userId)
    )
    return detailFromApi(data)
  })

// El binario de la copia, para abrirla en otra pestaña.
export const downloadCertificateFile = (userId: string): Promise<Blob> =>
  withErrors(async () => {
    const { data } = await apiClient.get<Blob>(
      `${certificationPath(userId)}/file`,
      { responseType: "blob" }
    )
    return data
  })

// Registra o edita (PUT: repetirlo deja lo mismo). verified decide «Verificado» o «Por
// verificar». La copia: sin `file` se deja la que había; null la quita; un archivo la
// reemplaza. Responde con la ficha completa.
export const saveCertification = async (
  userId: string,
  input: SaveCertificationInput
): Promise<CertificationDetail> => {
  const body: Record<string, unknown> = {
    license_number: input.licenseNumber.trim(),
    certificates: input.certificates,
    verified: input.verified,
  }
  if (input.file === null) body.file = null
  if (input.file) {
    body.file = {
      file_name: input.file.name,
      mime_type: input.file.type,
      data_base64: await toBase64(input.file),
    }
  }
  return withErrors(async () => {
    const { data } = await apiClient.put<ApiCertificationDetail>(
      certificationPath(userId),
      body,
      { timeout: SAVE_TIMEOUT_MS }
    )
    return detailFromApi(data)
  })
}

// El tripulante queda «Sin certificado», sin copia ni historial (204).
export const deleteCertification = (userId: string): Promise<void> =>
  withErrors(async () => {
    await apiClient.delete(certificationPath(userId))
  })
