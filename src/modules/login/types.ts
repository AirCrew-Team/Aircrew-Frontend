// Roles posibles de un usuario
export type Role = "admin" | "supervisor" | "crew"

// Nombre de cada rol para mostrar en pantalla
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  crew: "Tripulante",
}

// Datos de la sesión iniciada
export type Session = {
  email: string
  role: Role
}

/** Datos de contacto ya enmascarados; nunca se exponen completos al cliente. */
export type MaskedContacts = {
  email: string
  phone: string
}

// Resultado del login: sesión si fue exitoso, motivo si falló
export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "invalid_credentials" }