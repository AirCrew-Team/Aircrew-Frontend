import { isAxiosError } from "axios"
import { toast } from "sonner"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"
import apiClient from "@/service/api-client"
import { useAuthStore } from "@/stores/auth.store"

// Acciones de autenticación contra el servicio admin (a través del gateway). La sesión
// viaja en la cookie httpOnly que crea el backend: aquí nunca se lee ni se guarda el token.

const AUTH_PATHS = {
  login: "/api/admin/auth/login",
  me: "/api/admin/auth/me",
  logout: "/api/admin/auth/logout",
  activate: "/api/admin/auth/activate",
  forgotPassword: "/api/admin/auth/forgot-password",
  resetPassword: "/api/admin/auth/reset-password",
  checkResetToken: "/api/admin/auth/reset-password/check",
  checkActivationToken: "/api/admin/auth/activate/check",
} as const

const CREW_PROFILE_PATH = "/api/crew/crew-members/me"

interface ApiUser {
  id: string
  name: string
  role: string
}

interface CrewProfile {
  position: string
  employee_code: string
}

// El backend no usa los mismos nombres de rol que la interfaz (D1).
const ROLE_BY_API_ROLE = new Map<string, Role>([
  ["super_admin", ROLES.SUPER_ADMIN],
  ["supervisor", ROLES.SUPER_VISOR],
  ["crew", ROLES.TRIPULANTE],
])

// Rol que AirCrew no conoce: no se crea sesión.
export class UnknownRoleError extends Error {
  constructor(role: string) {
    super(`Rol desconocido: ${role}`)
    this.name = "UnknownRoleError"
  }
}

export const getMyCrewProfile = async (): Promise<CrewProfile> => {
  const { data } = await apiClient.get<CrewProfile>(CREW_PROFILE_PATH)
  return data
}

// Del usuario del backend al AuthUser de la interfaz (F3).
export const toAuthUser = async (apiUser: ApiUser): Promise<AuthUser> => {
  const role = ROLE_BY_API_ROLE.get(apiUser.role)
  if (!role) throw new UnknownRoleError(apiUser.role)

  const words = apiUser.name.trim().split(/\s+/)
  let position = "Super Administrador"
  if (role === ROLES.SUPER_VISOR) position = "Supervisor"
  if (role === ROLES.TRIPULANTE) {
    // Si el perfil de crew falla, el tripulante entra igual con el cargo genérico (LR-11).
    try {
      const profile = await getMyCrewProfile()
      position = `${profile.position} #${profile.employee_code}`
    } catch {
      position = "Tripulante"
    }
  }

  return {
    id: apiUser.id,
    displayName: words.slice(0, 2).join(" "),
    fullName: words.join(" "),
    position,
    role,
  }
}

// Un 401 relanza el AxiosError; un rol desconocido lanza UnknownRoleError.
export const login = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  const { data } = await apiClient.post<{ user: ApiUser }>(AUTH_PATHS.login, {
    email,
    password,
  })
  try {
    return await toAuthUser(data.user)
  } catch (error) {
    // El backend ya puso la cookie: se cierra para no dejar una sesión que la interfaz
    // no usa (LR-02). Si el logout falla se ignora; el error original es el que importa.
    if (error instanceof UnknownRoleError) await logout().catch(() => {})
    throw error
  }
}

// Activa la cuenta con el token de la invitación y crea la contraseña. No abre sesión:
// devuelve el correo de la cuenta para que el llamador haga el login. Un 400 (token
// inválido o vencido) relanza el AxiosError.
export const activateAccount = async (credentials: {
  token: string
  password: string
}): Promise<{ email: string }> => {
  const { data } = await apiClient.post<{ user: { email: string } }>(
    AUTH_PATHS.activate,
    credentials
  )
  return data.user
}

// Límite de la recuperación de contraseña (429). `message` es el texto del backend
// ({ error: "<mensaje>" }) o "" si no lo trae: cada pantalla pone su texto de respaldo.
export class TooManyRequestsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TooManyRequestsError"
  }
}

// Un 429 pasa a TooManyRequestsError; cualquier otro error sigue igual.
const toLimitError = (error: unknown): unknown => {
  if (isAxiosError(error) && error.response?.status === 429) {
    const message: unknown = error.response.data?.error
    return new TooManyRequestsError(
      typeof message === "string" && message.trim() ? message : ""
    )
  }
  return error
}

// Pide el enlace para restablecer la contraseña. El backend responde lo mismo exista
// o no la cuenta; un 429 lanza TooManyRequestsError.
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await apiClient.post(AUTH_PATHS.forgotPassword, {
      email: email.trim().toLowerCase(),
    })
  } catch (error) {
    throw toLimitError(error)
  }
}

// Cambia la contraseña con el token del enlace. Igual que activateAccount, no abre
// sesión y devuelve el correo de la cuenta. Un 400 relanza el AxiosError; un 429
// (límite de cambios) lanza TooManyRequestsError.
export const resetPassword = async (credentials: {
  token: string
  password: string
}): Promise<{ email: string }> => {
  try {
    const { data } = await apiClient.post<{ user: { email: string } }>(
      AUTH_PATHS.resetPassword,
      credentials
    )
    return data.user
  } catch (error) {
    throw toLimitError(error)
  }
}

// Resultado de comprobar el enlace al abrir la pantalla. `message` es el texto del 429
// o "" si el backend no lo trae.
export type ResetTokenCheck =
  { status: "valid" | "invalid" } | { status: "limited"; message: string }

// Comprueba el token del enlace sin gastarlo. Un 400 es "invalid" y un 429 "limited";
// un error de red, un 5xx o cualquier otro estado se relanza.
export const checkResetToken = async (
  token: string
): Promise<ResetTokenCheck> => {
  try {
    await apiClient.post(AUTH_PATHS.checkResetToken, { token })
    return { status: "valid" }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 400) {
      return { status: "invalid" }
    }
    const limitError = toLimitError(error)
    if (limitError instanceof TooManyRequestsError) {
      return { status: "limited", message: limitError.message }
    }
    throw error
  }
}

// Comprueba el enlace de activación sin gastarlo. Un 400 es "invalid"; un error de
// red, un 5xx o cualquier otro estado se relanza.
export const checkActivationToken = async (
  token: string
): Promise<ResetTokenCheck> => {
  try {
    await apiClient.post(AUTH_PATHS.checkActivationToken, { token })
    return { status: "valid" }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 400) {
      return { status: "invalid" }
    }
    throw error
  }
}

export const getCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<ApiUser>(AUTH_PATHS.me)
  return toAuthUser(data)
}

export const logout = async (): Promise<void> => {
  await apiClient.post(AUTH_PATHS.logout)
}

// Sesión vencida durante el uso (F6): un 401 fuera de las rutas de sesión cierra la
// sesión y avisa. Solo si hay usuario, así una ráfaga de 401 da un único toast.
// El perfil de crew también queda fuera (LR-11): con un 401 el tripulante sigue dentro
// y el bloque que lo pidió (Inicio, Configuración) muestra su propio error.
const SESSION_PATHS: string[] = [
  ...Object.values(AUTH_PATHS),
  CREW_PROFILE_PATH,
]

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    !SESSION_PATHS.includes(error.config?.url ?? "") &&
    useAuthStore.getState().user !== null
  ) {
    useAuthStore.getState().logout()
    toast.error("Tu sesión venció. Inicia sesión de nuevo.")
  }
  return Promise.reject(error)
})
