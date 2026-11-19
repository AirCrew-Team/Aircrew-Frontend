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

// --- Contrato del backend (servicio admin) ---

// Roles tal como llegan del backend. super_admin es el "admin" de la app.
export type ApiRole = "crew" | "supervisor" | "super_admin"

// Usuario de POST /admin/auth/login y GET /admin/auth/me.
export interface ApiUser {
  id: string
  name: string
  email: string
  role: ApiRole
}

export interface ApiAuthResult {
  user: ApiUser
  token: string
}

export const toRole = (role: ApiRole): Role =>
  role === "super_admin" ? ROLES.SUPER_ADMIN : role

// El backend no envía cargo ni código del usuario: bajo el nombre se muestra el rol.
const POSITION_BY_ROLE: Record<Role, string> = {
  [ROLES.TRIPULANTE]: "Tripulante",
  [ROLES.SUPER_VISOR]: "Supervisor",
  [ROLES.SUPER_ADMIN]: "Super Administrador",
}

// «Juan Pablo Navarro» → «Juan Pablo»; con dos palabras o menos, el nombre entero.
const shortName = (name: string) => {
  const words = name.trim().split(/\s+/)
  return words.length > 2 ? words.slice(0, 2).join(" ") : name.trim()
}

export const toAuthUser = (user: ApiUser): AuthUser => {
  const role = toRole(user.role)
  return {
    id: user.id,
    displayName: shortName(user.name),
    fullName: user.name,
    position: POSITION_BY_ROLE[role],
    role,
  }
}
