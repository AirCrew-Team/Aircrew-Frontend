import { create } from "zustand"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"

// Sesión simulada mientras no exista la integración con el backend.
const MOCK_USERS: Record<Role, AuthUser> = {
  [ROLES.TRIPULANTE]: {
    id: "mock-tripulante",
    fullName: "Juan Pablo",
    position: "Primer Oficial #2287",
    role: ROLES.TRIPULANTE,
  },
  [ROLES.SUPER_VISOR]: {
    id: "mock-supervisor",
    fullName: "Camila Restrepo",
    position: "Supervisora OCC",
    role: ROLES.SUPER_VISOR,
  },
  [ROLES.SUPER_ADMIN]: {
    id: "mock-admin",
    fullName: "Admin AirCrew",
    position: "Super Administrador",
    role: ROLES.SUPER_ADMIN,
  },
}

interface AuthState {
  user: AuthUser | null
  // Solo para desarrollo: cambia el usuario simulado al del rol indicado.
  setMockRole: (role: Role) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: MOCK_USERS[ROLES.TRIPULANTE],
  setMockRole: (role) => set({ user: MOCK_USERS[role] }),
  logout: () => set({ user: null }),
}))
