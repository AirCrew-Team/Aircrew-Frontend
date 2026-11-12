// Tipos de los datos de la pantalla Usuarios del super admin.

// Rol del usuario: es el valor del filtro en la URL (?role=tripulacion).
export type UserRoleGroup = "tripulacion" | "supervisor" | "administrador"

export type UserStatus = "disponible" | "guardia" | "vuelo" | "permiso_medico"

export interface CrewUser {
  // Código del tripulante, ej. "AC-1108".
  id: string
  firstName: string
  lastName: string
  email: string
  roleGroup: UserRoleGroup
  // Cargo que se muestra en la tabla, ej. "Comandante". Para Supervisor y
  roleTitle: string
  // Código IATA de la base (hub de Delta), ej. "ATL".
  base: string
  status: UserStatus
}

// Parámetros que se enviarán al backend para pedir una página de la lista.
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

// Ficha técnica de un usuario (ventana «Detalle del Usuario»). Incluye los datos de la
// fila de la tabla y los que solo se piden al abrir el detalle.
export interface UserDetail extends CrewUser {
  // Base con su ciudad, ej. "Base ATL / Atlanta".
  baseLabel: string
  // Turno en curso, ej. "Bloque EST (UTC-5)".
  shift: string
  // Horas de vuelo y descanso: solo Tripulación (Supervisor y Administrador no vuelan).
  flight?: {
    hours: {
      total: number
      // Porcentaje usado del límite anual de horas de vuelo.
      annualLimitPercent: number
    }
    // Descanso acumulado y mínimo exigido, en minutos.
    rest: { minutes: number; requiredMinutes: number }
  }
  availability: { label: string; note: string }
  // Licencia FAA y certificados: solo Tripulación.
  license?: UserLicense
  phone: { number: string; note: string }
  // Habilitación en tipos de aeronave (ej. Type Rating A350): solo Tripulación.
  rating?: { title: string; description: string; tags: string[] }
}

// Licencia de un tripulante: número y certificados, ej. ["Airline Transport Pilot (ATP)"].
export interface UserLicense {
  number: string
  certificates: string[]
}

// Datos que se envían al crear un usuario. El ID, las horas, el descanso y la
// disponibilidad los asigna o calcula el backend.
export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  // Formato internacional E.164, ej. "+14045550142".
  phone: string
  roleGroup: UserRoleGroup
  // Solo Tripulación elige cargo; Supervisor y Administrador envían el nombre del rol.
  roleTitle: string
  base: string
  // Solo Tripulación: Supervisor y Administrador no tienen licencia.
  license?: UserLicense
}

// Opciones de las listas del formulario de creación (catálogos del backend).
export interface UserCatalogs {
  // Código IATA y nombre, ej. { code: "ATL", label: "Base ATL / Atlanta" }.
  bases: { code: string; label: string }[]
  // Cargos de Tripulación (Supervisor y Administrador no tienen cargo).
  crewTitles: string[]
  // Certificados que puede tener cada cargo, ej. "Comandante": ["Private Pilot (PPL)", …].
  certificatesByTitle: Record<string, string[]>
}

// Indicadores del encabezado y conteos de los filtros.
export interface UsersStats {
  total: number
  inFlight: number
  onDuty: number
  // Porcentaje de tripulantes con certificado médico vigente.
  medicalFitnessPercent: number
  byRole: Record<UserRoleGroup, number>
}
