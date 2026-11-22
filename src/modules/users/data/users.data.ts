import { UserFieldError } from "@/App/actions/users/users.actions"
import type {
  CreateUserInput,
  CrewUser,
  UserCatalogs,
  UserDetail,
  UserRoleGroup,
  UsersListParams,
  UsersListResponse,
  UsersStats,
} from "@/modules/users/types/users.types"

// Datos de ejemplo de las cuentas demo y del selector «Rol (dev)»: no llaman al backend.
// Tienen la misma forma y el mismo comportamiento que App/actions/users (desactivar en
// lugar de borrar, correo repetido → error del campo, alta pendiente de activación con
// código asignado). La sesión real usa las acciones; el módulo elige con useUsersApi.
// Contexto: Delta Air Lines, con datos de EE. UU. (hubs de Delta, teléfonos +1, FAA).
// Los teléfonos usan el rango 555-01xx, reservado para ejemplos en EE. UU.

export { UserFieldError }

// Registros por página: lo envía el frontend y lo confirma el backend en la respuesta.
export const USERS_PAGE_SIZE = 5

// Mismas opciones que GET /catalogs/user-options del backend.
const CATALOGS: UserCatalogs = {
  bases: [
    { code: "ATL", label: "Base ATL / Atlanta" },
    { code: "BOS", label: "Base BOS / Boston" },
    { code: "DTW", label: "Base DTW / Detroit" },
    { code: "LAX", label: "Base LAX / Los Ángeles" },
    { code: "MSP", label: "Base MSP / Minneapolis–St. Paul" },
    { code: "JFK", label: "Base JFK / Nueva York" },
    { code: "LGA", label: "Base LGA / Nueva York LaGuardia" },
    { code: "SLC", label: "Base SLC / Salt Lake City" },
    { code: "SEA", label: "Base SEA / Seattle" },
  ],
  crewPositions: [
    "Comandante",
    "Copiloto",
    "Auxiliar de Vuelo",
    "Sobrecargo Principal",
    "Sobrecargo",
  ],
  shifts: [
    { value: "turno_1", label: "Turno 1 (mañana)" },
    { value: "turno_2", label: "Turno 2 (tarde)" },
    { value: "turno_3", label: "Turno 3 (noche)" },
  ],
  crewStatuses: [
    { value: "disponible", label: "Disponible" },
    { value: "guardia", label: "En guardia" },
    { value: "vuelo", label: "En vuelo" },
    { value: "permiso_medico", label: "Permiso médico" },
  ],
  supervisorStatuses: [
    { value: "disponible", label: "Disponible" },
    { value: "guardia", label: "En turno" },
    { value: "fuera_turno", label: "Fuera de turno" },
    { value: "licencia", label: "De licencia" },
  ],
}

const baseLabel = (code: string | null) =>
  code === null
    ? "Sin base"
    : (CATALOGS.bases.find((base) => base.code === code)?.label ??
      `Base ${code}`)

// Nombre que se muestra como cargo cuando el rol no tiene cargo propio.
const ROLE_LABEL: Record<UserRoleGroup, string> = {
  tripulacion: "Tripulación",
  supervisor: "Supervisor",
  administrador: "Administrador",
}

// En los ejemplos el id es el mismo código del empleado (el backend usa UUID).
const USERS: CrewUser[] = [
  {
    id: "AC-1108",
    code: "AC-1108",
    firstName: "Diego",
    lastName: "Salcedo",
    email: "d.salcedo@aircrew-ops.com",
    roleGroup: "tripulacion",
    roleTitle: "Comandante",
    base: "ATL",
    status: "disponible",
    shift: null,
    pendingActivation: false,
    isActive: true,
  },
  {
    id: "AC-9042",
    code: "AC-9042",
    firstName: "Camila",
    lastName: "Restrepo",
    email: "c.restrepo@aircrew-ops.com",
    roleGroup: "supervisor",
    roleTitle: ROLE_LABEL.supervisor,
    base: "JFK",
    status: "guardia",
    shift: "turno_1",
    pendingActivation: false,
    isActive: true,
  },
  {
    id: "AC-3419",
    code: null,
    firstName: "Mateo",
    lastName: "Morales",
    email: "m.morales@aircrew-ops.com",
    roleGroup: "administrador",
    roleTitle: ROLE_LABEL.administrador,
    base: null,
    status: null,
    shift: null,
    pendingActivation: false,
    isActive: true,
  },
  {
    id: "AC-5520",
    code: "AC-5520",
    firstName: "Valeria",
    lastName: "Ortiz",
    email: "v.ortiz@aircrew-ops.com",
    roleGroup: "tripulacion",
    roleTitle: "Auxiliar de Vuelo",
    base: "SEA",
    status: "permiso_medico",
    shift: null,
    pendingActivation: false,
    isActive: true,
  },
  {
    id: "AC-2287",
    code: "AC-2287",
    firstName: "Juan",
    lastName: "Pablo Navarro",
    email: "jp.navarro@aircrew-ops.com",
    roleGroup: "tripulacion",
    roleTitle: "Copiloto",
    base: "MSP",
    status: "vuelo",
    shift: null,
    pendingActivation: false,
    isActive: true,
  },
]

// Altas hechas en esta sesión. Solo viven en memoria: se pierden al recargar.
const CREATED_USERS: CrewUser[] = []

// Los recién creados primero, como los devuelve el backend. Los desactivados siguen.
const allUsers = () => [...CREATED_USERS, ...USERS]

const findUser = (id: string) =>
  allUsers().find((candidate) => candidate.id === id)

// Total de cada rol en la nómina (los conteos de los filtros) y cuánto cambió en esta
// sesión: +1 al crear y, al editar el rol, pasa uno de un rol a otro.
const BASE_ROLE_TOTALS: Record<UserRoleGroup, number> = {
  tripulacion: 158,
  supervisor: 20,
  administrador: 6,
}
const ROLE_CHANGES: Record<UserRoleGroup, number> = {
  tripulacion: 0,
  supervisor: 0,
  administrador: 0,
}
const roleTotals = (): Record<UserRoleGroup, number> => ({
  tripulacion: BASE_ROLE_TOTALS.tripulacion + ROLE_CHANGES.tripulacion,
  supervisor: BASE_ROLE_TOTALS.supervisor + ROLE_CHANGES.supervisor,
  administrador: BASE_ROLE_TOTALS.administrador + ROLE_CHANGES.administrador,
})
const totalUsers = () =>
  Object.values(roleTotals()).reduce((sum, count) => sum + count, 0)

// Sin mayúsculas ni tildes: «valeria» encuentra «Valeria» y «medico» encuentra «Médico».
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

// Campos en los que busca el backend: nombre, correo, código, base y cargo.
const matchesSearch = (user: CrewUser, search: string) =>
  [
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.code ?? "",
    user.base ?? "",
    user.roleTitle,
  ].some((value) => normalize(value).includes(search))

// Filtra los usuarios de ejemplo por rol y por texto. El total imita una nómina grande:
// el del rol (o de toda la nómina) sin búsqueda, y los encontrados con búsqueda.
// La página todavía no cambia el resultado.
export const getUsers = (
  params: UsersListParams
): Promise<UsersListResponse> => {
  const search = normalize(params.search.trim())
  const items = allUsers().filter(
    (user) =>
      (!params.role || user.roleGroup === params.role) &&
      (!search || matchesSearch(user, search))
  )
  const total = search
    ? items.length
    : params.role
      ? roleTotals()[params.role]
      : totalUsers()

  return Promise.resolve({
    items: items.map((user) => ({ ...user })),
    page: params.page,
    pageSize: params.pageSize,
    total,
  })
}

export const getUsersStats = (): Promise<UsersStats> =>
  Promise.resolve({
    total: totalUsers(),
    inFlight: 38,
    onDuty: 24,
    medicalFitnessPercent: 96,
    byRole: roleTotals(),
  })

export const getUserCatalogs = (): Promise<UserCatalogs> =>
  Promise.resolve(structuredClone(CATALOGS))

const CDP = "Certificate of Demonstrated Proficiency (CDP)"

// Datos que solo tienen los ejemplos (el backend todavía no los tiene): horas de vuelo,
// descanso, nota de disponibilidad, licencia y habilitaciones.
const DEMO_EXTRAS: Record<
  string,
  Omit<UserDetail, keyof CrewUser | "baseLabel">
> = {
  "AC-1108": {
    flight: {
      hours: { total: 8450, annualLimitPercent: 84.5 },
      rest: { minutes: 1110, requiredMinutes: 600 },
    },
    availability: {
      label: "Inmediata",
      note: "Habilitado Narrowbody & Widebody",
    },
    license: {
      number: "FAA ATP #1108-US",
      certificates: [
        "Airline Transport Pilot (ATP)",
        "Instrument Rating (IR)",
        "Multi-Engine (ME)",
      ],
    },
    phone: {
      number: "+1 404 555 0142",
      note: "Línea preferencial para despacho",
    },
    rating: {
      title: "Certificación Type Rating Habilitada",
      description: "Type Rating A350 & B767 · En pleno vigor FAA.",
      tags: ["A350-900", "B767-300ER", "CAT IIIb Autoland", "ETOPS 180"],
    },
  },
  "AC-9042": {
    availability: {
      label: "En guardia",
      note: "Cobertura de reemplazos hasta las 18:00 EST",
    },
    phone: { number: "+1 212 555 0177", note: "Línea de guardia OCC" },
  },
  "AC-3419": {
    availability: {
      label: "En oficina",
      note: "Centro de Operaciones de Atlanta (OCC)",
    },
    phone: { number: "+1 404 555 0119", note: "Extensión de administración" },
  },
  "AC-5520": {
    flight: {
      hours: { total: 1980, annualLimitPercent: 33 },
      rest: { minutes: 2880, requiredMinutes: 600 },
    },
    availability: {
      label: "No disponible",
      note: "Permiso médico hasta el 18 de noviembre",
    },
    license: { number: "FAA CDP #5520-US", certificates: [CDP] },
    phone: { number: "+1 206 555 0163", note: "Contactar solo por correo" },
    rating: {
      title: "Habilitación de Cabina Vigente",
      description: "Procedimientos de cabina B737 & A321 · Vigente FAA.",
      tags: ["B737-900ER", "A321neo", "Evacuación"],
    },
  },
  "AC-2287": {
    flight: {
      hours: { total: 4980, annualLimitPercent: 61 },
      rest: { minutes: 980, requiredMinutes: 600 },
    },
    availability: {
      label: "En vuelo",
      note: "Aterriza en MSP a las 19:40 CST",
    },
    license: {
      number: "FAA ATP #2287-US",
      certificates: [
        "Airline Transport Pilot (ATP)",
        "Instrument Rating (IR)",
        "Multi-Engine (ME)",
      ],
    },
    phone: {
      number: "+1 612 555 0185",
      note: "Línea preferencial para despacho",
    },
    rating: {
      title: "Certificación Type Rating Habilitada",
      description: "Type Rating A321 · En pleno vigor FAA.",
      tags: ["A321neo", "CAT II", "ETOPS 120"],
    },
  },
}

// Celular de las altas y ediciones de esta sesión.
const PHONES = new Map<string, string>()

// Si no existe, la promesa falla igual que la petición (404) y la ventana muestra el error.
export const getUserDetail = (id: string): Promise<UserDetail> => {
  const user = findUser(id)
  if (!user) return Promise.reject(new Error(`Usuario ${id} no encontrado`))
  const extras = DEMO_EXTRAS[id] ?? {
    availability: { label: "Pendiente de activación" },
    phone: { number: null },
  }
  const phone = PHONES.get(id)
  return Promise.resolve({
    ...user,
    baseLabel: baseLabel(user.base),
    ...extras,
    phone: phone ? { ...extras.phone, number: phone } : extras.phone,
  })
}

// ¿Otro usuario ya usa este correo? Al editar, el propio no cuenta.
const emailTaken = (email: string, exceptId?: string) =>
  allUsers().some(
    (user) => user.id !== exceptId && user.email.toLowerCase() === email
  )

// Campos que cambian con el formulario, con las mismas reglas del backend: cada rol
// solo guarda los suyos.
const fieldsFromInput = (input: CreateUserInput) => ({
  firstName: input.firstName.trim(),
  lastName: input.lastName.trim(),
  email: input.email.trim().toLowerCase(),
  roleGroup: input.roleGroup,
  roleTitle:
    input.roleGroup === "tripulacion"
      ? input.roleTitle
      : ROLE_LABEL[input.roleGroup],
  base: input.roleGroup === "administrador" ? null : input.base || null,
  shift: input.roleGroup === "supervisor" ? input.shift || null : null,
})

// Simula la latencia de la red.
const later = <T>(run: () => T) =>
  new Promise<T>((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(run())
      } catch (error) {
        reject(error)
      }
    }, 400)
  )

let nextCode = 6001

// La cuenta nace pendiente de activación y, si es tripulante, con el siguiente código.
export const createUser = (input: CreateUserInput): Promise<CrewUser> =>
  later(() => {
    const fields = fieldsFromInput(input)
    if (emailTaken(fields.email)) {
      throw new UserFieldError("email", "Ya existe un usuario con ese email.")
    }
    const code = fields.roleGroup === "tripulacion" ? `AC-${nextCode++}` : null
    const user: CrewUser = {
      id: code ?? `demo-${CREATED_USERS.length + 1}`,
      code,
      ...fields,
      status: fields.roleGroup === "administrador" ? null : "disponible",
      pendingActivation: true,
      isActive: true,
    }
    CREATED_USERS.unshift(user)
    ROLE_CHANGES[user.roleGroup] += 1
    PHONES.set(user.id, input.phone)
    return { ...user }
  })

// El tercer parámetro (los datos con los que se abrió el formulario) solo lo usa el
// backend para enviar lo que cambió; aquí se guarda todo.
export const updateUser = (
  id: string,
  input: CreateUserInput,
  previous?: CreateUserInput
): Promise<CrewUser> =>
  later(() => {
    void previous
    const user = findUser(id)
    if (!user) throw new Error(`Usuario ${id} no encontrado`)
    const fields = fieldsFromInput(input)
    if (emailTaken(fields.email, id)) {
      throw new UserFieldError("email", "Ya existe un usuario con ese email.")
    }
    // Cambio de rol: el usuario pasa de un conteo a otro.
    if (user.roleGroup !== fields.roleGroup) {
      ROLE_CHANGES[user.roleGroup] -= 1
      ROLE_CHANGES[fields.roleGroup] += 1
    }
    Object.assign(user, fields, {
      // Un supervisor que pasa a administrador pierde su código, base y estado.
      code: fields.roleGroup === "administrador" ? null : user.code,
      status:
        fields.roleGroup === "administrador"
          ? null
          : (user.status ?? "disponible"),
    })
    PHONES.set(id, input.phone)
    return { ...user }
  })

// No borra: desactiva. El usuario sigue en la lista, marcado como inactivo.
export const deleteUser = (id: string): Promise<void> =>
  later(() => {
    const user = findUser(id)
    if (!user) throw new Error(`Usuario ${id} no encontrado`)
    user.isActive = false
  })
