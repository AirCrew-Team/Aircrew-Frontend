import type { UserShift, UserStatus } from "@/modules/users/types/users.types"

// Texto de cada estado en la tabla y en la etiqueta de estado.
export const STATUS_LABEL: Record<UserStatus, string> = {
  disponible: "Disponible",
  guardia: "En guardia",
  vuelo: "En vuelo",
  permiso_medico: "Permiso médico",
  fuera_turno: "Fuera de turno",
  licencia: "De licencia",
}

// Turno del supervisor (backend: morning / afternoon / night).
export const SHIFT_LABEL: Record<UserShift, string> = {
  turno_1: "Turno 1",
  turno_2: "Turno 2",
  turno_3: "Turno 3",
}

// Opciones del campo «Turno» del formulario, en orden.
export const SHIFT_OPTIONS = (
  Object.entries(SHIFT_LABEL) as [UserShift, string][]
).map(([value, label]) => ({ value, label }))
