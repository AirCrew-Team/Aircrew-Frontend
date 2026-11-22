// Tipos de los datos de la pantalla Usuarios del super admin. Son los de la interfaz:
// App/actions/users traduce desde y hacia los nombres en inglés del backend.

// Rol del usuario: es el valor del filtro en la URL (?role=tripulacion).
export type UserRoleGroup = "tripulacion" | "supervisor" | "administrador"

// Estado operativo. «fuera_turno» y «licencia» solo los tiene un supervisor.
export type UserStatus =
  | "disponible"
  | "guardia"
  | "vuelo"
  | "permiso_medico"
  | "fuera_turno"
  | "licencia"

// Turno del supervisor (backend: morning / afternoon / night).
export type UserShift = "turno_1" | "turno_2" | "turno_3"

export interface CrewUser {
  // UUID del backend: se usa para ver, editar y desactivar.
  id: string
  // Código del empleado (employee_code), ej. "AC-1108". El de un tripulante lo asigna
  // el backend; null si no tiene (administrador, o supervisor sin código).
  code: string | null
  // El backend guarda un solo nombre: la primera palabra va en firstName y el resto en
  // lastName. Al enviar se vuelven a unir.
  firstName: string
  lastName: string
  email: string
  roleGroup: UserRoleGroup
  // Cargo que se muestra en la tabla: el del tripulante, ej. "Comandante";
  // "Supervisor" o "Administrador" en los demás.
  roleTitle: string
  // Código IATA de la base (hub de Delta), ej. "ATL". null en administradores.
  base: string | null
  // null: administrador, o el servicio de tripulación no respondió.
  status: UserStatus | null
  // Solo supervisores.
  shift: UserShift | null
  // true hasta que la persona abre el correo de activación y crea su contraseña.
  pendingActivation: boolean
  // false: desactivado. No puede iniciar sesión, pero sigue en la lista.
  isActive: boolean
}

// Parámetros que se envían al backend para pedir una página de la lista.
export interface UsersListParams {
  page: number
  pageSize: number
  search: string
  role?: UserRoleGroup
}

// Respuesta paginada: el backend devuelve solo los registros de la página pedida
// y el total, con el que el frontend calcula cuántas páginas hay.
export interface UsersListResponse {
  items: CrewUser[]
  page: number
  pageSize: number
  total: number
}

// Ficha técnica de un usuario (ventana «Detalle del Usuario»). Horas de vuelo,
// descanso, licencia, habilitaciones y la nota de disponibilidad todavía no existen en
// el backend: solo los traen los datos de ejemplo, y la ventana los oculta si no vienen.
export interface UserDetail extends CrewUser {
  // Base con el texto del catálogo, ej. "Base ATL / Atlanta".
  baseLabel: string
  flight?: {
    hours: {
      total: number
      // Porcentaje usado del límite anual de horas de vuelo.
      annualLimitPercent: number
    }
    // Descanso acumulado y mínimo exigido, en minutos.
    rest: { minutes: number; requiredMinutes: number }
  }
  availability: { label: string; note?: string }
  license?: UserLicense
  // Celular en E.164 (null si no tiene) y, en los ejemplos, una nota.
  phone: { number: string | null; note?: string }
  rating?: { title: string; description: string; tags: string[] }
}

// Licencia de un tripulante: número y certificados, ej. ["Airline Transport Pilot (ATP)"].
export interface UserLicense {
  number: string
  certificates: string[]
}

// Datos del formulario al crear o editar. Ni contraseña (cada persona la crea desde su
// correo de activación), ni código del tripulante (lo asigna el backend), ni licencia y
// certificados (van en la pantalla de certificados).
export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  // Formato internacional E.164, ej. "+14045550142".
  phone: string
  roleGroup: UserRoleGroup
  // Cargo: solo Tripulación (se envía como position).
  roleTitle: string
  // Tripulación y Supervisor; "" en Administrador.
  base: string
  // Solo Supervisor; "" en los demás.
  shift: UserShift | ""
}

// Opción de una lista con código y texto.
export interface CatalogOption<Value extends string = string> {
  value: Value
  label: string
}

// Opciones de las listas del formulario (GET /catalogs/user-options).
export interface UserCatalogs {
  // Código IATA y texto, ej. { code: "ATL", label: "Base ATL / Atlanta" }.
  bases: { code: string; label: string }[]
  // Cargos de un tripulante, ej. "Comandante".
  crewPositions: string[]
  shifts: CatalogOption<UserShift>[]
  crewStatuses: CatalogOption<UserStatus>[]
  supervisorStatuses: CatalogOption<UserStatus>[]
}

// Indicadores del encabezado y conteos de los filtros.
export interface UsersStats {
  total: number
  inFlight: number
  onDuty: number
  // Porcentaje de tripulantes con certificado médico vigente. null: sin datos médicos.
  medicalFitnessPercent: number | null
  byRole: Record<UserRoleGroup, number>
}
