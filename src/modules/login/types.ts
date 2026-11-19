import type { AuthUser } from "@/App/types/auth.types"

// Roles posibles de un usuario
export type Role = "admin" | "supervisor" | "crew"

// Nombre de cada rol para mostrar en pantalla
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  crew: "Tripulante",
}

// Datos de la sesión iniciada: el usuario ya traducido al formato de la app y su JWT.
export type Session = {
  email: string
  role: Role
  token: string
  user: AuthUser
}

// Medio por el que se envía el código de recuperación
export type RecoveryChannel = "email" | "sms"

/** Datos de contacto ya enmascarados; nunca se exponen completos al cliente. */
export type MaskedContacts = {
  email: string
  phone: string
}

// Resultado del login: sesión si fue exitoso, motivo si falló.
// "unavailable": el servidor no respondió; no cuenta como intento fallido.
export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "invalid_credentials" | "unavailable" }
