import { isAxiosError } from "axios"

import apiClient from "@/service/api-client"
import type {
  CreateUserInput,
  CrewUser,
  UserCatalogs,
  UserDetail,
  UserRoleGroup,
  UserShift,
  UserStatus,
  UsersListParams,
  UsersListResponse,
  UsersStats,
} from "@/modules/users/types/users.types"

// Usuarios de la pantalla del super_admin, en el servicio admin (a través del gateway y
// con la cookie de sesión). Admin crea las cuentas de los tres roles: cada persona recibe
// un correo y crea su contraseña al activarla. Del tripulante, admin pide a crew su
// perfil (código, cargo, base y estado); el código lo asigna crew (AC-0001…).

const USERS_PATH = "/api/admin/users"
const CATALOGS_PATH = "/api/admin/catalogs/user-options"

const userPath = (id: string) => `${USERS_PATH}/${encodeURIComponent(id)}`

// --- Traducción de valores: el backend usa inglés y snake_case. ---

type ApiRole = "crew" | "supervisor" | "super_admin"
type ApiShift = "morning" | "afternoon" | "night"

const API_ROLE: Record<UserRoleGroup, ApiRole> = {
  tripulacion: "crew",
  supervisor: "supervisor",
  administrador: "super_admin",
}
const ROLE_BY_API: Record<ApiRole, UserRoleGroup> = {
  crew: "tripulacion",
  supervisor: "supervisor",
  super_admin: "administrador",
}

// Tripulante: available / on_duty / in_flight / medical_leave / vacation.
// Supervisor: available / on_duty / off_duty / leave.
const STATUS_BY_API: Record<string, UserStatus> = {
  available: "disponible",
  on_duty: "guardia",
  in_flight: "vuelo",
  medical_leave: "permiso_medico",
  vacation: "vacaciones",
  off_duty: "fuera_turno",
  leave: "licencia",
}
// Al revés, para el operational_status del supervisor.
const API_STATUS = Object.fromEntries(
  Object.entries(STATUS_BY_API).map(([code, status]) => [status, code])
) as Record<UserStatus, string>

const API_SHIFT: Record<UserShift, ApiShift> = {
  turno_1: "morning",
  turno_2: "afternoon",
  turno_3: "night",
}
const SHIFT_BY_API: Record<ApiShift, UserShift> = {
  morning: "turno_1",
  afternoon: "turno_2",
  night: "turno_3",
}

// Cargo que se muestra para los roles sin cargo propio (y para un tripulante cuyo
// perfil de crew no llegó).
const ROLE_TITLE: Record<UserRoleGroup, string> = {
  tripulacion: "Tripulación",
  supervisor: "Supervisor",
  administrador: "Administrador",
}

// Fila de la lista, la ficha y la respuesta de crear, editar y desactivar: misma forma.
interface ApiUserItem {
  id: string
  name: string
  email: string
  role: ApiRole
  is_active: boolean
  pending_activation: boolean
  created_at: string
  phone: string | null
  employee_code: string | null
  position: string | null
  base: string | null
  status: string | null
  shift: ApiShift | null
}

interface ApiCatalogs {
  bases: { code: string; label: string }[]
  crew_positions: string[]
  shifts: { code: ApiShift; label: string }[]
  crew_statuses: { code: string; label: string }[]
  supervisor_statuses: { code: string; label: string }[]
}

// Primera palabra en firstName y el resto en lastName («Juan Pablo Navarro» → «Juan» +
// «Pablo Navarro»). Al enviar se vuelven a unir con un espacio, así el nombre no cambia.
const splitName = (name: string) => {
  const [firstName = "", ...rest] = name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(" ") }
}

const joinName = (input: Pick<CreateUserInput, "firstName" | "lastName">) =>
  [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(" ")

const fromApi = (item: ApiUserItem): CrewUser => {
  const roleGroup = ROLE_BY_API[item.role]
  return {
    id: item.id,
    code: item.employee_code,
    ...splitName(item.name),
    email: item.email,
    roleGroup,
    roleTitle:
      roleGroup === "tripulacion" && item.position
        ? item.position
        : ROLE_TITLE[roleGroup],
    base: item.base,
    status: item.status ? (STATUS_BY_API[item.status] ?? null) : null,
    shift: item.shift ? SHIFT_BY_API[item.shift] : null,
    pendingActivation: item.pending_activation,
    isActive: item.is_active,
  }
}

const catalogOptions = (
  options: { code: string; label: string }[]
): { value: UserStatus; label: string }[] =>
  options.flatMap(({ code, label }) =>
    STATUS_BY_API[code] ? [{ value: STATUS_BY_API[code], label }] : []
  )

// Cuerpo completo de un usuario según su rol. Cada rol solo envía sus campos: el backend
// responde 400 si llega uno que no le aplica (p. ej. base a un administrador). Nunca va
// la contraseña, ni el código del tripulante (lo asigna el backend).
const toApiBody = (input: CreateUserInput): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    name: joinName(input),
    email: input.email.trim(),
    role: API_ROLE[input.roleGroup],
    phone: input.phone || null,
  }
  if (input.roleGroup === "tripulacion") {
    body.position = input.roleTitle
    body.base = input.base
  }
  if (input.roleGroup === "supervisor") {
    body.base = input.base
    body.shift = input.shift ? API_SHIFT[input.shift] : null
    if (input.status) body.operational_status = API_STATUS[input.status]
  }
  return body
}

// --- Errores que la pantalla muestra de forma distinta. ---

// 409 «Ya existe un usuario con ese email.»: el formulario lo muestra debajo del correo.
export class UserFieldError extends Error {
  readonly field: "email"

  constructor(field: "email", message: string) {
    super(message)
    this.name = "UserFieldError"
    this.field = field
  }
}

// Otro 400 o 409 con texto del backend: la pantalla lo muestra tal cual.
export class UserRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UserRequestError"
  }
}

// 502 o 503 al crear: no salió el correo de activación (o crew no respondió). El backend
// deshace el alta, así que no se creó nada.
export class UserCreationUnavailableError extends Error {
  constructor() {
    super(
      "No se pudo enviar el correo; no se creó el usuario. Intenta de nuevo."
    )
    this.name = "UserCreationUnavailableError"
  }
}

const backendMessage = (error: unknown): string => {
  const message: unknown = isAxiosError(error)
    ? error.response?.data?.error
    : undefined
  return typeof message === "string" ? message.trim() : ""
}

const toUserError = (error: unknown, { isCreate }: { isCreate: boolean }) => {
  const status = isAxiosError(error) ? error.response?.status : undefined
  const message = backendMessage(error)

  if (status === 409 && /email/i.test(message)) {
    return new UserFieldError("email", message)
  }
  if ((status === 400 || status === 409) && message) {
    return new UserRequestError(message)
  }
  if (isCreate && (status === 502 || status === 503)) {
    return new UserCreationUnavailableError()
  }
  return error
}

// --- Llamadas. ---

export const getUserCatalogs = async (): Promise<UserCatalogs> => {
  const { data } = await apiClient.get<ApiCatalogs>(CATALOGS_PATH)
  return {
    bases: data.bases.map((base) => ({ ...base })),
    crewPositions: [...data.crew_positions],
    shifts: data.shifts.map(({ code, label }) => ({
      value: SHIFT_BY_API[code],
      label,
    })),
    crewStatuses: catalogOptions(data.crew_statuses),
    supervisorStatuses: catalogOptions(data.supervisor_statuses),
  }
}

export const getUsers = async (
  params: UsersListParams
): Promise<UsersListResponse> => {
  const { data } = await apiClient.get<{
    items: ApiUserItem[]
    page: number
    page_size: number
    total: number
  }>(USERS_PATH, {
    params: {
      page: params.page,
      page_size: params.pageSize,
      // Vacío no se envía: el backend lo toma como «sin búsqueda».
      search: params.search.trim() || undefined,
      role: params.role ? API_ROLE[params.role] : undefined,
    },
  })
  return {
    items: data.items.map(fromApi),
    page: data.page,
    pageSize: data.page_size,
    total: data.total,
  }
}

export const getUsersStats = async (): Promise<UsersStats> => {
  const { data } = await apiClient.get<{
    total: number
    by_role: Record<ApiRole, number>
    in_flight: number
    on_duty: number
    medical_fitness_percent: number | null
  }>(`${USERS_PATH}/stats`)
  return {
    total: data.total,
    inFlight: data.in_flight,
    onDuty: data.on_duty,
    medicalFitnessPercent: data.medical_fitness_percent,
    byRole: {
      tripulacion: data.by_role.crew ?? 0,
      supervisor: data.by_role.supervisor ?? 0,
      administrador: data.by_role.super_admin ?? 0,
    },
  }
}

// Tarjeta «Gestión de Usuarios» del inicio: tripulantes registrados y disponibles.
export const getUsersSummary = async (): Promise<{
  registeredCrew: number
  availableCrew: number
}> => {
  const { data } = await apiClient.get<{
    by_role: Record<ApiRole, number>
    crew_available: number
  }>(`${USERS_PATH}/stats`)
  return {
    registeredCrew: data.by_role.crew ?? 0,
    availableCrew: data.crew_available ?? 0,
  }
}

// La ficha trae los mismos campos de la fila (sin horas, licencia ni habilitaciones).
// La base se muestra con el texto del catálogo.
export const getUserDetail = async (id: string): Promise<UserDetail> => {
  const [{ data }, catalogs] = await Promise.all([
    apiClient.get<ApiUserItem>(userPath(id)),
    getUserCatalogs().catch(() => null),
  ])
  const user = fromApi(data)
  const statusOptions =
    user.roleGroup === "supervisor"
      ? catalogs?.supervisorStatuses
      : catalogs?.crewStatuses
  return {
    ...user,
    baseLabel: user.base
      ? (catalogs?.bases.find((base) => base.code === user.base)?.label ??
        `Base ${user.base}`)
      : "Sin base",
    availability: {
      label: user.status
        ? (statusOptions?.find((option) => option.value === user.status)
            ?.label ?? "—")
        : "—",
    },
    phone: { number: data.phone },
  }
}

// Sin Idempotency-Key (el backend no la usa): el formulario deshabilita el botón
// mientras envía. Un 409 por correo lanza UserFieldError; un 502/503,
// UserCreationUnavailableError; otro 400/409, UserRequestError.
export const createUser = async (input: CreateUserInput): Promise<CrewUser> => {
  try {
    const { data } = await apiClient.post<ApiUserItem>(
      USERS_PATH,
      toApiBody(input)
    )
    return fromApi(data)
  } catch (error) {
    throw toUserError(error, { isCreate: true })
  }
}

// PATCH con solo los campos que cambiaron respecto a `previous` (los datos con los que
// se abrió el formulario). El rol de un tripulante no se envía: no se puede cambiar.
// Sin cambios no se llama al backend (respondería 400): se devuelve el usuario actual.
export const updateUser = async (
  id: string,
  input: CreateUserInput,
  previous: CreateUserInput
): Promise<CrewUser> => {
  const next = toApiBody(input)
  const before = toApiBody(previous)
  const changes = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => before[key] !== value)
  )
  if (previous.roleGroup === "tripulacion") delete changes.role

  try {
    if (Object.keys(changes).length === 0) {
      const { data } = await apiClient.get<ApiUserItem>(userPath(id))
      return fromApi(data)
    }
    const { data } = await apiClient.patch<ApiUserItem>(userPath(id), changes)
    return fromApi(data)
  } catch (error) {
    throw toUserError(error, { isCreate: false })
  }
}

// No borra: desactiva (is_active: false). El usuario sigue en la lista y ya no puede
// iniciar sesión.
export const deleteUser = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(userPath(id))
  } catch (error) {
    throw toUserError(error, { isCreate: false })
  }
}

// Borra la cuenta y todo lo suyo en los servicios; el correo queda libre. Si era
// tripulante, sus puestos en vuelos futuros quedan vacantes (el backend avisa a los
// supervisores). La respuesta trae esos vuelos (vacated_flights), pero en un reintento
// llega vacía: la pantalla no la usa.
// Un 409 (eliminarse a sí mismo, último super_admin) lanza UserRequestError con el texto
// del backend. Lo demás (404, 502 user_delete_incomplete, otro 5xx, red) se relanza y la
// pantalla muestra su aviso genérico.
export const deleteUserPermanently = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`${userPath(id)}/permanent`)
  } catch (error) {
    const message = backendMessage(error)
    if (isAxiosError(error) && error.response?.status === 409 && message) {
      throw new UserRequestError(message)
    }
    throw error
  }
}
