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

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando
// exista la API. Las funciones ya reciben los parámetros que se enviarán al backend.
// Contexto: Delta Air Lines, con datos de EE. UU. (hubs de Delta, teléfonos +1, FAA).
// Los teléfonos usan el rango 555-01xx, reservado para ejemplos en EE. UU.

// Registros por página: lo enviará el frontend y lo confirmará el backend en la respuesta.
export const USERS_PAGE_SIZE = 5

// Hubs de Delta Air Lines: son las bases de la tripulación.
const BASES: UserCatalogs["bases"] = [
  { code: "ATL", label: "Base ATL / Atlanta" },
  { code: "BOS", label: "Base BOS / Boston" },
  { code: "DTW", label: "Base DTW / Detroit" },
  { code: "LAX", label: "Base LAX / Los Ángeles" },
  { code: "MSP", label: "Base MSP / Minneapolis–St. Paul" },
  { code: "JFK", label: "Base JFK / Nueva York" },
  { code: "LGA", label: "Base LGA / Nueva York LaGuardia" },
  { code: "SLC", label: "Base SLC / Salt Lake City" },
  { code: "SEA", label: "Base SEA / Seattle" },
]

const baseLabel = (code: string) =>
  BASES.find((base) => base.code === code)?.label ?? `Base ${code}`

// Nombre que se guarda como cargo cuando el rol no tiene cargo propio.
const ROLE_LABEL: Record<UserRoleGroup, string> = {
  tripulacion: "Tripulación",
  supervisor: "Supervisor",
  administrador: "Administrador",
}

const USERS: CrewUser[] = [
  {
    id: "AC-1108",
    firstName: "Diego",
    lastName: "Salcedo",
    email: "d.salcedo@aircrew-ops.com",
    roleGroup: "tripulacion",
    roleTitle: "Comandante",
    base: "ATL",
    status: "disponible",
  },
  {
    id: "AC-9042",
    firstName: "Camila",
    lastName: "Restrepo",
    email: "c.restrepo@aircrew-ops.com",
    roleGroup: "supervisor",
    roleTitle: ROLE_LABEL.supervisor,
    base: "JFK",
    status: "guardia",
  },
  {
    id: "AC-3419",
    firstName: "Mateo",
    lastName: "Morales",
    email: "m.morales@aircrew-ops.com",
    roleGroup: "administrador",
    roleTitle: ROLE_LABEL.administrador,
    base: "ATL",
    status: "disponible",
  },
  {
    id: "AC-5520",
    firstName: "Valeria",
    lastName: "Ortiz",
    email: "v.ortiz@aircrew-ops.com",
    roleGroup: "tripulacion",
    roleTitle: "Auxiliar de Vuelo",
    base: "SEA",
    status: "permiso_medico",
  },
  {
    id: "AC-2287",
    firstName: "Juan Pablo",
    lastName: "Navarro",
    email: "jp.navarro@aircrew-ops.com",
    roleGroup: "tripulacion",
    roleTitle: "Copiloto",
    base: "MSP",
    status: "vuelo",
  },
]

// Cambios hechos en esta sesión (altas, ediciones y bajas). Solo viven en memoria: se
// pierden al recargar. Con la API los guardará el backend.
const CREATED_USERS: CrewUser[] = []
const DELETED_IDS = new Set<string>()

// Los recién creados primero, como los devolvería el backend ordenados por fecha de alta.
// Los eliminados ya no aparecen.
const allUsers = () =>
  [...CREATED_USERS, ...USERS].filter((user) => !DELETED_IDS.has(user.id))

// Total de cada rol en la nómina (los conteos de los filtros) y cuánto cambió en esta
// sesión: +1 al crear, −1 al eliminar y, al editar el rol, pasa uno de un rol a otro.
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

// Campos en los que busca el texto: nombre completo, correo, ID, base y cargo.
const matchesSearch = (user: CrewUser, search: string) =>
  [
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.id,
    user.base,
    user.roleTitle,
  ].some((value) => normalize(value).includes(search))

// El backend filtrará por búsqueda y rol y devolverá solo la página pedida.
// Mientras tanto, filtra los 5 usuarios simulados por rol y por texto. El total imita al
// del backend: el del rol (o de la nómina) sin búsqueda, y los encontrados con búsqueda.
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
    items,
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

// Certificados FAA de cada cargo de Tripulación.
const PILOT_CERTIFICATES = [
  "Private Pilot (PPL)",
  "Commercial Pilot (CPL)",
  "Airline Transport Pilot (ATP)",
  "Instrument Rating (IR)",
  "Multi-Engine (ME)",
]
const CDP = "Certificate of Demonstrated Proficiency (CDP)"
// Los sobrecargos tienen el CDP y, además, certificados de liderazgo de cabina.
const PURSER_CERTIFICATES = [
  CDP,
  "Liderazgo",
  "Manejo de conflictos",
  "Aduanas / Inmigración",
]
const CERTIFICATES_BY_TITLE: Record<string, string[]> = {
  Comandante: PILOT_CERTIFICATES,
  Copiloto: PILOT_CERTIFICATES,
  "Auxiliar de Vuelo": [CDP],
  "Sobrecargo Principal": PURSER_CERTIFICATES,
  Sobrecargo: PURSER_CERTIFICATES,
}

// Datos que solo trae el detalle, por ID. El resto sale de la fila de la lista (USERS).
// Supervisor y Administrador no tienen horas de vuelo, licencia ni habilitaciones.
const USER_DETAILS: Record<string, Omit<UserDetail, keyof CrewUser>> = {
  "AC-1108": {
    baseLabel: baseLabel("ATL"),
    shift: "Bloque EST (UTC-5)",
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
    baseLabel: baseLabel("JFK"),
    shift: "Bloque EST (UTC-5)",
    availability: {
      label: "En guardia",
      note: "Cobertura de reemplazos hasta las 18:00 EST",
    },
    phone: { number: "+1 212 555 0177", note: "Línea de guardia OCC" },
  },
  "AC-3419": {
    baseLabel: baseLabel("ATL"),
    shift: "Oficina EST (UTC-5)",
    availability: {
      label: "En oficina",
      note: "Centro de Operaciones de Atlanta (OCC)",
    },
    phone: { number: "+1 404 555 0119", note: "Extensión de administración" },
  },
  "AC-5520": {
    baseLabel: baseLabel("SEA"),
    shift: "Fuera de turno",
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
    baseLabel: baseLabel("MSP"),
    shift: "Bloque CST (UTC-6)",
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

// Ficha técnica de un usuario. Con la API será GET del usuario por su ID; si no existe,
// la promesa falla igual que fallaría la petición (404) y la ventana muestra el error.
export const getUserDetail = (id: string): Promise<UserDetail> => {
  const user = allUsers().find((candidate) => candidate.id === id)
  const detail = USER_DETAILS[id]
  return user && detail
    ? Promise.resolve({ ...user, ...detail })
    : Promise.reject(new Error(`Usuario ${id} no encontrado`))
}

// Opciones de las listas del formulario. Con la API vendrán de los catálogos del backend.
export const getUserCatalogs = (): Promise<UserCatalogs> =>
  Promise.resolve({
    bases: BASES,
    crewTitles: Object.keys(CERTIFICATES_BY_TITLE),
    certificatesByTitle: CERTIFICATES_BY_TITLE,
  })

// Error de un campo concreto (ej. correo ya registrado): el formulario lo muestra
// debajo de ese campo. Con la API corresponderá a un 409 del backend.
export class UserFieldError extends Error {
  field: keyof CreateUserInput

  constructor(field: keyof CreateUserInput, message: string) {
    super(message)
    this.field = field
  }
}

// ¿Otro usuario ya usa este correo? Al editar, el propio usuario no cuenta.
const emailTaken = (email: string, exceptId?: string) =>
  allUsers().some(
    (user) => user.id !== exceptId && user.email.toLowerCase() === email
  )

// Alta de usuario. Con la API será un POST con el encabezado Idempotency-Key (ADR 003):
// si la misma petición llega dos veces (doble clic, red lenta), el backend crea uno solo.
// Aquí la clave evita lo mismo: una clave ya usada devuelve el usuario que ya creó.
const CREATED_BY_KEY = new Map<string, CrewUser>()

export const createUser = (
  input: CreateUserInput,
  idempotencyKey: string
): Promise<CrewUser> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const repeated = CREATED_BY_KEY.get(idempotencyKey)
      if (repeated) return resolve(repeated)

      const email = input.email.trim().toLowerCase()
      if (emailTaken(email)) {
        return reject(
          new UserFieldError("email", "Ya existe un usuario con ese correo.")
        )
      }

      // El ID lo asignará el backend; aquí, el siguiente número libre.
      const id = `AC-${String(6000 + CREATED_USERS.length + 1)}`
      const user: CrewUser = {
        id,
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        roleGroup: input.roleGroup,
        roleTitle: input.roleTitle,
        base: input.base,
        status: "disponible",
      }
      CREATED_USERS.unshift(user)
      ROLE_CHANGES[user.roleGroup] += 1
      CREATED_BY_KEY.set(idempotencyKey, user)

      // Ficha inicial. La Tripulación empieza sin horas de vuelo y con la licencia del
      // alta; Supervisor y Administrador no tienen horas ni licencia.
      USER_DETAILS[id] = {
        baseLabel: baseLabel(input.base),
        shift: "Sin asignar",
        flight: input.license
          ? {
              hours: { total: 0, annualLimitPercent: 0 },
              rest: { minutes: 600, requiredMinutes: 600 },
            }
          : undefined,
        availability: {
          label: "Pendiente de activación",
          note: "Usuario recién creado",
        },
        license: input.license,
        phone: { number: input.phone, note: "Registrado en el alta" },
      }
      resolve(user)
    }, 400)
  })

// Edición de un usuario. Con la API será un PUT del usuario por su ID; repetirlo deja el
// mismo resultado, así que no necesita clave de idempotencia. Falla si el usuario ya no
// existe (404) o si el correo es de otro usuario (409).
export const updateUser = (
  id: string,
  input: CreateUserInput
): Promise<CrewUser> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const user = allUsers().find((candidate) => candidate.id === id)
      const detail = USER_DETAILS[id]
      if (!user || !detail) {
        return reject(new Error(`Usuario ${id} no encontrado`))
      }

      const email = input.email.trim().toLowerCase()
      if (emailTaken(email, id)) {
        return reject(
          new UserFieldError("email", "Ya existe un usuario con ese correo.")
        )
      }

      // Cambio de rol: el usuario pasa de un conteo a otro.
      if (user.roleGroup !== input.roleGroup) {
        ROLE_CHANGES[user.roleGroup] -= 1
        ROLE_CHANGES[input.roleGroup] += 1
      }

      Object.assign(user, {
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        roleGroup: input.roleGroup,
        roleTitle: input.roleTitle,
        base: input.base,
      })
      // Solo la Tripulación tiene horas de vuelo, licencia y habilitaciones.
      USER_DETAILS[id] = {
        ...detail,
        baseLabel: baseLabel(input.base),
        phone: { ...detail.phone, number: input.phone },
        license: input.license,
        flight: input.license
          ? (detail.flight ?? {
              hours: { total: 0, annualLimitPercent: 0 },
              rest: { minutes: 600, requiredMinutes: 600 },
            })
          : undefined,
        rating: input.license ? detail.rating : undefined,
      }
      resolve({ ...user })
    }, 400)
  })

// Baja de un usuario. Con la API será un DELETE del usuario por su ID.
export const deleteUser = (id: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const user = allUsers().find((candidate) => candidate.id === id)
      if (!user) return reject(new Error(`Usuario ${id} no encontrado`))
      DELETED_IDS.add(id)
      ROLE_CHANGES[user.roleGroup] -= 1
      resolve()
    }, 400)
  })
