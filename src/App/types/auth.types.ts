// Roles disponibles en la aplicación.
export const ROLES = {
  TRIPULANTE: "tripulante",
  SUPER_ADMIN: "superAdmin",
  SUPER_VISOR: "superVisor",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Usuario autenticado tal como lo consume la interfaz.
export interface AuthUser {
  id: string
  fullName: string
  // Cargo y código que se muestran bajo el nombre, ej. "Primer Oficial #2287".
  position: string
  role: Role
  avatarUrl?: string
}
