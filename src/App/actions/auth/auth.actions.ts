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

export const getCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<ApiUser>(AUTH_PATHS.me)
  return toAuthUser(data)
}

export const logout = async (): Promise<void> => {
  await apiClient.post(AUTH_PATHS.logout)
}

// Sesión vencida durante el uso (F6): un 401 fuera de las rutas de sesión cierra la
// sesión y avisa. Solo si hay usuario, así una ráfaga de 401 da un único toast.
const SESSION_PATHS: string[] = Object.values(AUTH_PATHS)

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
