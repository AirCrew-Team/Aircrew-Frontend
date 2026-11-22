import { create } from "zustand"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"
import { queryClient } from "@/lib/query-client"

// Usuarios simulados de las cuentas demo y del selector «Rol (dev)» (D4).
const MOCK_USERS: Record<Role, AuthUser> = {
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

const DEMO_USER_IDS = new Set(Object.values(MOCK_USERS).map((user) => user.id))

// true si la sesión es de una cuenta demo o del selector «Rol (dev)»: esas pantallas
// usan datos de ejemplo en lugar del backend.
export const isDemoUser = (user: AuthUser | null): boolean =>
  user !== null && DEMO_USER_IDS.has(user.id)

interface AuthState {
  user: AuthUser | null
  // "checking" mientras SessionGate pregunta al backend si la cookie sigue viva.
  status: "checking" | "ready"
  // Usuario real que devuelve el backend (login o /auth/me).
  setUser: (user: AuthUser) => void
  // Pone el usuario simulado del rol indicado. Lo usan el Login (cuentas demo) y el
  // selector «Rol (dev)».
  setMockRole: (role: Role) => void
  logout: () => void
}

// Arranca comprobando la sesión: SessionGate pide /auth/me y deja el estado en "ready".
// La caché de TanStack Query se vacía al cerrar sesión y al pasar a otro usuario, para
// que nadie vea datos del anterior (spec cierre-tareas-johan, D3). Restaurar la misma
// sesión (mismo id) la conserva.
export const useAuthStore = create<AuthState>()((set, get) => {
  const setSessionUser = (user: AuthUser) => {
    if (get().user?.id !== user.id) queryClient.clear()
    set({ user, status: "ready" })
  }

  return {
    user: null,
    status: "checking",
    setUser: setSessionUser,
    setMockRole: (role) => setSessionUser(MOCK_USERS[role]),
    logout: () => {
      queryClient.clear()
      set({ user: null, status: "ready" })
    },
  }
})
