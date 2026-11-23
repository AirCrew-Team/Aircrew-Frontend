import { isAxiosError } from "axios"

import type {
  Aircraft,
  AircraftCategory,
  AircraftFilter,
  AircraftListParams,
  AircraftListResponse,
  AircraftOptions,
  AircraftReport,
  AircraftStats,
  AircraftStatus,
  MaintenanceRecord,
  MaintenanceType,
  SaveAircraftInput,
} from "@/App/types/aircraft.types"
import apiClient from "@/service/api-client"

// Flota del super_admin en el servicio flights (a través del gateway y con la cookie de
// sesión). Todas las rutas son solo del super_admin: otro rol recibe 403.

const AIRCRAFT_PATH = "/api/flights/aircraft"

const aircraftPath = (id: string) =>
  `${AIRCRAFT_PATH}/${encodeURIComponent(id)}`
const photoPath = (id: string) => `${aircraftPath(id)}/photo`

// La foto (hasta 2 MB, unos 2,7 MB en base64) pesa más que el resto de peticiones.
const PHOTO_TIMEOUT_MS = 60_000

// --- Traducción de valores: el backend usa inglés y snake_case. ---

type ApiStatus = "operating" | "maintenance"

const API_STATUS: Record<AircraftFilter, ApiStatus> = {
  operativa: "operating",
  mantenimiento: "maintenance",
}

// Cualquier estado que no sea «operating» (p. ej. «inactive» de filas antiguas) queda
// fuera de servicio.
const statusFromApi = (status: string): AircraftStatus =>
  status === "operating" ? "operativa" : "mantenimiento"

interface ApiMinimumCrew {
  pilots: number
  cabin: number
}

interface ApiAircraft {
  id: string
  registration: string
  msn: string
  model_id: string
  model_name: string
  category: AircraftCategory | null
  capacity: number
  minimum_crew: ApiMinimumCrew | null
  engines: string | null
  base: string
  base_name: string | null
  manufacture_year: number
  in_fleet_since: string
  flight_hours: number
  cycles: number
  status: string
  maintenance_type: MaintenanceType | null
  maintenance_note: string | null
  photo_updated_at: string | null
}

interface ApiMaintenanceRecord {
  order_number: string
  type: MaintenanceType
  description: string | null
  hangar: string
  opened_on: string
  tasks: { name: string; done: boolean }[]
}

interface ApiHistoryEntry {
  order_number: string
  type: MaintenanceType
  description: string | null
  hangar: string
  opened_on: string
  closed_on: string
}

// URL absoluta de la foto en el gateway para el <img>, que la pide con la cookie de
// sesión. `v` cambia con cada foto nueva, así el navegador no reutiliza la anterior.
export const aircraftPhotoUrl = (id: string, photoUpdatedAt: string) =>
  apiClient.getUri({ url: photoPath(id), params: { v: photoUpdatedAt } })

const fromApi = (item: ApiAircraft): Aircraft => ({
  id: item.id,
  registration: item.registration,
  msn: item.msn,
  modelId: item.model_id,
  modelName: item.model_name,
  category: item.category,
  capacity: item.capacity,
  minimumCrew: item.minimum_crew ? { ...item.minimum_crew } : null,
  engines: item.engines,
  baseCode: item.base,
  baseName: item.base_name ?? item.base,
  manufactureYear: item.manufacture_year,
  inFleetSince: item.in_fleet_since,
  flightHours: item.flight_hours,
  cycles: item.cycles,
  status: statusFromApi(item.status),
  maintenanceType: item.maintenance_type,
  maintenanceNote: item.maintenance_note,
  // Sin foto (null): la pantalla muestra la imagen genérica de la flota.
  photoUrl: item.photo_updated_at
    ? aircraftPhotoUrl(item.id, item.photo_updated_at)
    : null,
})

const maintenanceFromApi = (
  record: ApiMaintenanceRecord
): MaintenanceRecord => ({
  orderNumber: record.order_number,
  type: record.type,
  description: record.description,
  hangar: record.hangar,
  openedOn: record.opened_on,
  tasks: record.tasks.map((task) => ({ ...task })),
})

// El campo «condition» del formulario se envía como status. La capacidad, la
// tripulación, las horas y los ciclos no se envían: salen del modelo o del backend.
const toApiBody = (input: SaveAircraftInput) => ({
  registration: input.registration,
  msn: input.msn,
  model_id: input.modelId,
  base: input.baseCode,
  // Número, no texto.
  manufacture_year: input.manufactureYear,
  in_fleet_since: input.inFleetSince,
  status: API_STATUS[input.condition],
  maintenance_type:
    input.condition === "mantenimiento" ? input.maintenanceType : null,
  maintenance_note:
    input.condition === "mantenimiento" ? input.maintenanceNote : null,
})

// --- Errores que la pantalla muestra de forma distinta. ---

// 409 por matrícula repetida: el formulario lo muestra debajo del campo.
export class AircraftFieldError extends Error {
  readonly field: "registration"

  constructor(field: "registration", message: string) {
    super(message)
    this.name = "AircraftFieldError"
    this.field = field
  }
}

// Otro 400 o 409 con texto del backend (p. ej. «La aeronave tiene vuelos registrados:
// no se puede eliminar.»): la pantalla lo muestra tal cual.
export class AircraftRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AircraftRequestError"
  }
}

const toAircraftError = (error: unknown) => {
  if (!isAxiosError(error)) return error
  const status = error.response?.status
  const message: unknown = error.response?.data?.error
  if (typeof message !== "string" || !message.trim()) return error
  if (status === 409 && /matr[ií]cula/i.test(message)) {
    return new AircraftFieldError("registration", message)
  }
  if (status === 400 || status === 409) return new AircraftRequestError(message)
  return error
}

// Ejecuta la petición y traduce sus errores.
const withErrors = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    throw toAircraftError(error)
  }
}

// --- Llamadas. ---

export const getAircraft = async (
  params: AircraftListParams
): Promise<AircraftListResponse> => {
  const { data } = await apiClient.get<{
    items: ApiAircraft[]
    page: number
    page_size: number
    total: number
  }>(AIRCRAFT_PATH, {
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

export const getAircraftStats = async (): Promise<AircraftStats> => {
  const { data } = await apiClient.get<{
    total: number
    operational: number
    maintenance: number
    total_seats: number
    models_in_service: string[]
  }>(`${AIRCRAFT_PATH}/stats`)
  return {
    total: data.total,
    operational: data.operational,
    maintenance: data.maintenance,
    totalSeats: data.total_seats,
    modelsInService: data.models_in_service,
  }
}

// Catálogos del formulario: son la única fuente de modelos, bases y motivos.
export const getAircraftOptions = async (): Promise<AircraftOptions> => {
  const { data } = await apiClient.get<{
    models: {
      id: string
      name: string
      category: AircraftCategory
      capacity: number
      minimum_crew: ApiMinimumCrew
      engines: string
    }[]
    bases: { code: string; name: string }[]
    maintenance_types: {
      code: MaintenanceType
      label: string
      tasks: string[]
    }[]
  }>(`${AIRCRAFT_PATH}/options`)
  return {
    models: data.models.map((model) => ({
      id: model.id,
      name: model.name,
      category: model.category,
      capacity: model.capacity,
      minimumCrew: { ...model.minimum_crew },
      engines: model.engines,
    })),
    bases: data.bases.map((base) => ({ ...base })),
    maintenanceTypes: data.maintenance_types.map((type) => ({
      code: type.code,
      label: type.label,
      tasks: [...type.tasks],
    })),
  }
}

// Un 409 por matrícula lanza AircraftFieldError; otro 400/409, AircraftRequestError.
export const createAircraft = (input: SaveAircraftInput): Promise<Aircraft> =>
  withErrors(async () => {
    const { data } = await apiClient.post<ApiAircraft>(
      AIRCRAFT_PATH,
      toApiBody(input)
    )
    return fromApi(data)
  })

// PUT con todos los datos. Pasar a «operativa» una aeronave en mantenimiento responde
// 409 (solo vuelve con «Liberar a servicio»): lanza AircraftRequestError.
export const updateAircraft = (
  id: string,
  input: SaveAircraftInput
): Promise<Aircraft> =>
  withErrors(async () => {
    const { data } = await apiClient.put<ApiAircraft>(
      aircraftPath(id),
      toApiBody(input)
    )
    return fromApi(data)
  })

// 409 si tiene vuelos registrados: AircraftRequestError con el texto del backend.
export const deleteAircraft = (id: string): Promise<void> =>
  withErrors(async () => {
    await apiClient.delete(aircraftPath(id))
  })

// Toda la flota, sin paginar, para el manifiesto.
export const getFleetManifest = async (): Promise<Aircraft[]> => {
  const { data } = await apiClient.get<ApiAircraft[]>(
    `${AIRCRAFT_PATH}/manifest`
  )
  return data.map(fromApi)
}

export const getAircraftReport = async (
  id: string
): Promise<AircraftReport> => {
  const { data } = await apiClient.get<{
    aircraft: ApiAircraft
    maintenance: ApiMaintenanceRecord | null
    history: ApiHistoryEntry[]
  }>(`${aircraftPath(id)}/report`)
  return {
    aircraft: fromApi(data.aircraft),
    maintenance: data.maintenance ? maintenanceFromApi(data.maintenance) : null,
    history: data.history.map((entry) => ({
      orderNumber: entry.order_number,
      type: entry.type,
      description: entry.description,
      hangar: entry.hangar,
      openedOn: entry.opened_on,
      closedOn: entry.closed_on,
    })),
  }
}

export const setMaintenanceTask = (
  id: string,
  taskIndex: number,
  done: boolean
): Promise<MaintenanceRecord> =>
  withErrors(async () => {
    const { data } = await apiClient.patch<ApiMaintenanceRecord>(
      `${aircraftPath(id)}/maintenance/tasks/${taskIndex}`,
      { done }
    )
    return maintenanceFromApi(data)
  })

// Solo con todas las tareas hechas (si no, 409). Queda operativa.
export const releaseToService = (id: string): Promise<Aircraft> =>
  withErrors(async () => {
    const { data } = await apiClient.post<ApiAircraft>(
      `${aircraftPath(id)}/release`
    )
    return fromApi(data)
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

// Se envía después de guardar la aeronave. El formato y el tamaño ya los validó la
// pantalla (PNG, JPG o WEBP de hasta 2 MB).
export const uploadAircraftPhoto = (id: string, file: File): Promise<void> =>
  withErrors(async () => {
    await apiClient.put(
      photoPath(id),
      { mime_type: file.type, data_base64: await toBase64(file) },
      { timeout: PHOTO_TIMEOUT_MS }
    )
  })

export const deleteAircraftPhoto = (id: string): Promise<void> =>
  withErrors(async () => {
    await apiClient.delete(photoPath(id))
  })
