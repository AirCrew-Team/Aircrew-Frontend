// Roles disponibles en la aplicación. Los valores son los mismos del módulo de Login
// (src/modules/login/types.ts): LoginPage asigna session.role a Role sin traducir.
export const ROLES = {
  TRIPULANTE: "crew",
  SUPER_ADMIN: "admin",
  SUPER_VISOR: "supervisor",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Usuario autenticado tal como lo consume la interfaz.
export interface AuthUser {
  id: string
  // Nombre corto del navbar y el saludo, ej. "Juan Pablo".
  displayName: string
  // Nombre completo del perfil, ej. "Juan Pablo Navarro".
  fullName: string
  // Cargo y código que se muestran bajo el nombre, ej. "Primer Oficial #2287".
  position: string
  role: Role
  avatarUrl?: string
}
