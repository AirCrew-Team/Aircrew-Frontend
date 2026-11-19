import { create } from "zustand"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"
import { queryClient } from "@/lib/query-client"
import { useAlertsStore } from "@/stores/alerts.store"

// Usuarios simulados: los usan los tests (setMockRole) y el login demo de los tests.
export const MOCK_USERS: Record<Role, AuthUser> = {
  [ROLES.TRIPULANTE]: {
    id: "mock-tripulante",
    displayName: "Juan Pablo",
    fullName: "Juan Pablo Navarro",
    position: "Primer Oficial #2287",
    role: ROLES.TRIPULANTE,
  },
  [ROLES.SUPER_VISOR]: {
    id: "mock-supervisor",
    displayName: "Camila Restrepo",
    fullName: "Camila Restrepo",
    position: "Supervisora OCC",
    role: ROLES.SUPER_VISOR,
  },
  [ROLES.SUPER_ADMIN]: {
    id: "mock-admin",
    displayName: "Admin AirCrew",
    fullName: "Admin AirCrew",
    position: "Super Administrador",
    role: ROLES.SUPER_ADMIN,
  },
}

// Solo el token se guarda en el navegador; el usuario se pide a /auth/me al recargar.
const TOKEN_KEY = "aircrew.token"

export const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const writeStoredToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura hasta recargar.
  }
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  // Sesión real: usuario del backend y su JWT.
  setSession: (user: AuthUser, token: string) => void
  // Usuario simulado del rol, sin token. Solo para tests.
  setMockRole: (role: Role) => void
  // Cierra la sesión y vacía los datos del servidor en caché.
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  setSession: (user, token) => {
    writeStoredToken(token)
    set({ user, token })
  },
  setMockRole: (role) => set({ user: MOCK_USERS[role] }),
  logout: () => {
    writeStoredToken(null)
    queryClient.clear()
    useAlertsStore.getState().clear()
    set({ user: null, token: null })
  },
}))
