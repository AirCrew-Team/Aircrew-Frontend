import { create } from "zustand"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"

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
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "checking",
  setUser: (user) => set({ user, status: "ready" }),
  setMockRole: (role) => set({ user: MOCK_USERS[role], status: "ready" }),
  logout: () => set({ user: null, status: "ready" }),
}))
