// Cuenta propia del servicio admin (spec configuracion-real): GET y PATCH /users/me.

// Interruptores de notificaciones. El tripulante solo tiene `replacement_assigned`; el
// supervisor, `absence_reported` y `absence_covered`. El admin no tiene (Ampliación B).
export type NotificationKey =
  "replacement_assigned" | "absence_reported" | "absence_covered"

export type NotificationPreferences = Partial<Record<NotificationKey, boolean>>

export type SupervisorShift = "morning" | "afternoon" | "night"

export type SupervisorOperationalStatus =
  "available" | "on_duty" | "off_duty" | "leave"

// Datos laborales del supervisor (Ampliación A1). Los asigna el admin, así que el
// código, la base (código IATA del hub), el turno y el estado pueden faltar.
export interface SupervisorEmployment {
  employee_code: string | null
  base: string | null
  shift: SupervisorShift | null
  operational_status: SupervisorOperationalStatus | null
}

// Tal como la devuelve el backend. Las fechas van en ISO 8601.
export interface MyProfile {
  id: string
  name: string
  email: string
  // Rol en el formato del backend: crew | supervisor | super_admin.
  role: string
  is_active: boolean
  created_at: string
  phone: string | null
  residence: string | null
  password_changed_at: string | null
  // null si no hay foto.
  photo_updated_at: string | null
  // null en super_admin, que no tiene notificaciones (Ampliación B).
  notifications: NotificationPreferences | null
  // Solo el supervisor; null en crew y super_admin.
  employment: SupervisorEmployment | null
}

// Body de PATCH /users/me: el celular ya sin espacios; vacío se guarda como null. El
// admin no envía `notifications` (el backend respondería 400).
export interface UpdateMyProfileInput {
  phone: string
  residence: string
  notifications?: NotificationPreferences
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
