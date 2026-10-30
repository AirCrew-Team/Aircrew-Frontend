import { create } from "zustand"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"

// Sesión simulada mientras no exista la integración con el backend.
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
  // Pone el usuario simulado del rol indicado. Lo usan el Login (cuentas demo) y el
  // selector «Rol (dev)»; se reemplaza al conectar la API real.
  setMockRole: (role: Role) => void
  logout: () => void
}

// Arranca sin sesión: al abrir la app se ve el Login. La sesión no se guarda al recargar.
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  setMockRole: (role) => set({ user: MOCK_USERS[role] }),
  logout: () => set({ user: null }),
}))
