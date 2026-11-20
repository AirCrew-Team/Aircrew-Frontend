import { isAxiosError } from "axios"

import { TooManyRequestsError } from "@/App/actions/auth/auth.actions"
import type {
  ChangePasswordInput,
  MyProfile,
  UpdateMyProfileInput,
} from "@/App/types/profile.types"
import apiClient from "@/service/api-client"

// Cuenta propia (servicio admin) y perfil de crew del tripulante, a través del gateway y
// con la cookie de sesión (spec configuracion-real).

const ME_PATH = "/api/admin/users/me"
const PHOTO_PATH = "/api/admin/users/me/photo"
const CHANGE_PASSWORD_PATH = "/api/admin/auth/change-password"
const US_CITIES_PATH = "/api/admin/catalogs/us-cities"

// La foto (hasta 2 MB, unos 2,7 MB en base64) pesa más que el resto de peticiones.
const PHOTO_TIMEOUT_MS = 60_000

// Valores de `status` del tripulante en el backend.
export type CrewMemberStatus =
  "available" | "on_duty" | "in_flight" | "medical_leave"

export interface MyCrewMember {
  employee_code: string
  position: string
  current_location: string | null
  status: CrewMemberStatus
  // Alta en crew, ISO 8601.
  created_at: string
}

export const getMyCrewMember = async (): Promise<MyCrewMember> => {
  const { data } = await apiClient.get<MyCrewMember>(
    "/api/crew/crew-members/me"
  )
  return data
}

// Clave de GET /users/me, con el id del usuario. La comparten el navbar (MainLayout, por
// la foto) y Configuración, así que subir o quitar la foto actualiza los dos.
export const myProfileQueryKey = (userId: string) =>
  ["profile", "me", userId] as const

export const getMyProfile = async (): Promise<MyProfile> => {
  const { data } = await apiClient.get<MyProfile>(ME_PATH)
  return data
}

// Ciudades de EE. UU. «Ciudad, ST», ordenadas. Es la única lista válida de residencias.
export const getUsCities = async (): Promise<string[]> => {
  const { data } = await apiClient.get<string[]>(US_CITIES_PATH)
  return data
}

const WRONG_CURRENT_PASSWORD = "La contraseña actual no es correcta."

// 400 del cambio de contraseña: la actual no es correcta. La pantalla lo muestra en el
// campo de la contraseña actual.
export class CurrentPasswordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CurrentPasswordError"
  }
}

// Cualquier otro 400 (p. ej. la nueva igual a la actual). `message` es el texto del
// backend, o "" si no lo trae; la pantalla lo muestra en su aviso general.
export class PasswordChangeRejectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PasswordChangeRejectedError"
  }
}

const backendMessage = (error: unknown): string => {
  const message: unknown = isAxiosError(error)
    ? error.response?.data?.error
    : undefined
  return typeof message === "string" ? message.trim() : ""
}

const CITY_NOT_IN_CATALOG = "Elige una ciudad de Estados Unidos de la lista."

// 400 del PATCH por un campo concreto (hoy, una residencia fuera del catálogo de
// ciudades). La pantalla lo muestra en ese campo.
export class ProfileFieldError extends Error {
  readonly field: "residence"

  constructor(field: "residence", message: string) {
    super(message)
    this.name = "ProfileFieldError"
    this.field = field
  }
}

// Responde con la cuenta actualizada (el mismo objeto de getMyProfile), con la residencia
// en la forma del catálogo. Un 400 por la ciudad lanza ProfileFieldError; lo demás
// relanza el error original.
export const updateMyProfile = async (
  input: UpdateMyProfileInput
): Promise<MyProfile> => {
  try {
    const { data } = await apiClient.patch<MyProfile>(ME_PATH, input)
    return data
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined
    const message = backendMessage(error)
    if (status === 400 && message === CITY_NOT_IN_CATALOG) {
      throw new ProfileFieldError("residence", message)
    }
    throw error
  }
}

// Un 400 con «La contraseña actual no es correcta.» lanza CurrentPasswordError, otro
// 400 PasswordChangeRejectedError y un 429 (3 cambios en 24 h) TooManyRequestsError,
// con el mensaje del backend; lo demás (5xx, red) relanza el error original. La sesión
// sigue abierta.
export const changeMyPassword = async (
  input: ChangePasswordInput
): Promise<{ password_changed_at: string }> => {
  try {
    const { data } = await apiClient.post<{ password_changed_at: string }>(
      CHANGE_PASSWORD_PATH,
      {
        current_password: input.currentPassword,
        new_password: input.newPassword,
      }
    )
    return data
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined
    if (status === 400) {
      const message = backendMessage(error)
      if (message === WRONG_CURRENT_PASSWORD) {
        throw new CurrentPasswordError(message)
      }
      throw new PasswordChangeRejectedError(message)
    }
    if (status === 429) throw new TooManyRequestsError(backendMessage(error))
    throw error
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

// El formato y el tamaño ya los validó la pantalla (PNG, JPG o WEBP de hasta 2 MB).
export const uploadMyPhoto = async (
  file: File
): Promise<{ photo_updated_at: string }> => {
  const { data } = await apiClient.put<{ photo_updated_at: string }>(
    PHOTO_PATH,
    { mime_type: file.type, data_base64: await toBase64(file) },
    { timeout: PHOTO_TIMEOUT_MS }
  )
  return data
}

export const deleteMyPhoto = async (): Promise<void> => {
  await apiClient.delete(PHOTO_PATH)
}

// URL absoluta de la foto en el gateway para el <img>, que la pide con la cookie de
// sesión. `v` cambia con cada foto nueva, así el navegador no reutiliza la anterior.
export const myPhotoUrl = (photoUpdatedAt: string): string =>
  apiClient.getUri({ url: PHOTO_PATH, params: { v: photoUpdatedAt } })
