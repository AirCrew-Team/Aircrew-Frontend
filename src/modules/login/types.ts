import type { AuthUser } from "@/App/types/auth.types"

// Roles posibles de un usuario
export type Role = "admin" | "supervisor" | "crew"

// Nombre de cada rol para mostrar en pantalla
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  crew: "Tripulante",
}

// Datos de la sesión iniciada. `user` solo llega con una cuenta real del backend;
// las cuentas demo usan el usuario simulado del rol.
export type Session = {
  email: string
  role: Role
  user?: AuthUser
}

// Resultado del login: sesión si fue exitoso, motivo si falló
export type LoginResult =
  | { ok: true; session: Session }
  | {
      ok: false
      reason: "invalid_credentials" | "network_error" | "unknown_role"
    }
