import { http, HttpResponse } from "msw"

import { ROLES, type AuthUser } from "@/App/types/auth.types"

import { API_URL, AUTH_URLS, errorBody } from "./authApi"

// Contrato del backend que simulan los tests de Configuración con sesión real
// (spec configuracion-real):
// - GET y PATCH /api/admin/users/me → la cuenta con contacto, seguridad y notificaciones;
// - POST /api/admin/auth/change-password → { password_changed_at };
// - PUT, DELETE y GET /api/admin/users/me/photo → la foto de perfil;
// - GET /api/crew/crew-members/me → el CrewMember del tripulante (también lo usan los
//   tests de src/tests/realAbsences).
// Ampliación A de la spec:
// - GET /api/admin/users/me trae `employment` (datos laborales del supervisor; null en
//   crew y super_admin);
// - GET /api/admin/catalogs/us-cities → string[] con las ciudades «Ciudad, ST»;
// - PATCH /api/admin/users/me responde 400 si `residence` no está en el catálogo.
// Ampliación B de la spec (CF-B9): el super_admin no tiene notificaciones. Su GET trae
// `notifications: null` y su PATCH con `notifications` responde 400.
// Los ids NO son ids demo (mock-tripulante, mock-supervisor, mock-admin).

export const PROFILE_URLS = {
  me: `${API_URL}/api/admin/users/me`,
  photo: `${API_URL}/api/admin/users/me/photo`,
  changePassword: `${API_URL}/api/admin/auth/change-password`,
  usCities: `${API_URL}/api/admin/catalogs/us-cities`,
} as const

// Catálogo de ciudades de EE. UU. (A2). Una muestra ordenada del catálogo real, con
// ciudades de los hubs de Delta. Las residencias de los perfiles de prueba salen de aquí.
export const US_CITIES = [
  "Atlanta, GA",
  "Boston, MA",
  "Denver, CO",
  "Detroit, MI",
  "Los Angeles, CA",
  "Miami, FL",
  "Minneapolis, MN",
  "New York, NY",
  "Salt Lake City, UT",
  "Seattle, WA",
] as const

// Mensaje del backend (400) para una residencia fuera del catálogo. Es distinto del
// mensaje de la pantalla («Elige una ciudad de la lista.»), para saber de dónde sale.
export const CITY_SERVER_ERROR =
  "Elige una ciudad de Estados Unidos de la lista."

// Mensaje del backend (400) si un super_admin envía `notifications` (Ampliación B).
export const ADMIN_NOTIFICATIONS_SERVER_ERROR =
  "Hay una preferencia de notificaciones que no corresponde a tu rol."

export const REAL_ACCOUNTS = {
  crew: {
    id: "u-real-crew-1",
    name: "Laura Méndez Ríos",
    email: "laura.mendez@aircrew.test",
    role: "crew",
    is_active: true,
    created_at: "2026-11-18T12:00:00.000Z",
  },
  supervisor: {
    id: "u-real-sup-1",
    name: "Mateo Salazar Cruz",
    email: "mateo.salazar@aircrew.test",
    role: "supervisor",
    is_active: true,
    created_at: "2026-11-18T12:00:00.000Z",
  },
  admin: {
    id: "u-real-admin-1",
    name: "Andrés Pardo Gil",
    email: "andres.pardo@aircrew.test",
    role: "super_admin",
    is_active: true,
    created_at: "2026-11-18T12:00:00.000Z",
  },
} as const

export type RealAccountKey = keyof typeof REAL_ACCOUNTS

export const REAL_CREW_MEMBER = {
  id: "cm-9",
  user_id: REAL_ACCOUNTS.crew.id,
  employee_code: "EMP-100",
  position: "Auxiliar de vuelo",
  current_location: "MDE",
  status: "on_duty",
  is_active: true,
  created_at: "2026-11-18T12:00:00.000Z",
} as const

// Sesiones del store tal como las deja el login real.
export const REAL_USERS = {
  crew: {
    id: REAL_ACCOUNTS.crew.id,
    displayName: "Laura",
    fullName: REAL_ACCOUNTS.crew.name,
    position: "Auxiliar de vuelo",
    role: ROLES.TRIPULANTE,
  },
  supervisor: {
    id: REAL_ACCOUNTS.supervisor.id,
    displayName: "Mateo",
    fullName: REAL_ACCOUNTS.supervisor.name,
    position: "Supervisor",
    role: ROLES.SUPER_VISOR,
  },
  admin: {
    id: REAL_ACCOUNTS.admin.id,
    displayName: "Andrés",
    fullName: REAL_ACCOUNTS.admin.name,
    position: "Super Administrador",
    role: ROLES.SUPER_ADMIN,
  },
} satisfies Record<RealAccountKey, AuthUser>

export const crewMemberHandler = (crewMember: object = REAL_CREW_MEMBER) =>
  http.get(AUTH_URLS.crewProfile, () => HttpResponse.json(crewMember))

export const crewMemberErrorHandler = () =>
  http.get(AUTH_URLS.crewProfile, () =>
    HttpResponse.json(errorBody("Error interno"), { status: 500 })
  )

// --- GET /api/admin/users/me ---

// Datos laborales del supervisor (A1). Los asigna el admin: pueden faltar (null), salvo
// el estado operativo, que por defecto es `available` (el backend manda null si falta).
export interface EmploymentBody {
  employee_code: string | null
  base: string | null
  shift: "morning" | "afternoon" | "night" | null
  operational_status: "available" | "on_duty" | "off_duty" | "leave" | null
}

export const SUPERVISOR_EMPLOYMENT: EmploymentBody = {
  employee_code: "SUP-001",
  base: "ATL",
  shift: "morning",
  operational_status: "on_duty",
}

export interface MyProfileBody {
  id: string
  name: string
  email: string
  role: "crew" | "supervisor" | "super_admin"
  is_active: boolean
  created_at: string
  phone: string | null
  residence: string | null
  password_changed_at: string | null
  photo_updated_at: string | null
  // null en super_admin (Ampliación B).
  notifications: Record<string, boolean> | null
  // Solo el supervisor tiene datos laborales en la cuenta; crew y super_admin, null.
  employment: EmploymentBody | null
}

const DAY_MS = 24 * 60 * 60 * 1000

// Fecha ISO de hace `days` días exactos (múltiplos de 24 h desde ahora).
export const daysAgoIso = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString()

// Alta de la cuenta (users.created_at): marzo de 2026 en cualquier zona horaria.
// Distinta del alta en crew (noviembre) para ver de dónde sale cada fecha.
export const ACCOUNT_CREATED_AT = "2026-03-15T15:00:00.000Z"

// Días desde el último cambio de contraseña en el perfil inicial (evita el singular).
export const LAST_CHANGE_DAYS = 10

// Residencias iniciales (del catálogo). Ninguna es Atlanta: «Atlanta» no debe aparecer
// en la pantalla salvo en la base del supervisor (CF-01).
export const INITIAL_RESIDENCE: Record<RealAccountKey, string> = {
  crew: "Miami, FL",
  supervisor: "Denver, CO",
  admin: "Denver, CO",
}

// Perfil inicial de cada cuenta real. Las notificaciones de cada rol tienen valores
// distintos para ver que el formulario parte de lo que manda el servidor; el admin no
// tiene (null, Ampliación B).
export const realProfile = (
  key: RealAccountKey,
  overrides: Partial<MyProfileBody> = {}
): MyProfileBody => {
  const account = REAL_ACCOUNTS[key]
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    is_active: true,
    created_at: ACCOUNT_CREATED_AT,
    phone: key === "crew" ? "+573001234567" : "+573209876543",
    residence: INITIAL_RESIDENCE[key],
    password_changed_at: daysAgoIso(LAST_CHANGE_DAYS),
    photo_updated_at: null,
    notifications:
      key === "crew"
        ? { replacement_assigned: false }
        : key === "supervisor"
          ? { absence_reported: true, absence_covered: false }
          : null,
    employment: key === "supervisor" ? { ...SUPERVISOR_EMPLOYMENT } : null,
    ...overrides,
  }
}

// --- Backend falso con estado ---

type Respond = () => Response | Promise<Response>

export interface FakeProfileOptions {
  // Sustituye la respuesta de una ruta (errores o una compuerta). El body se registra
  // igual, pero el estado no cambia.
  respond?: Partial<
    Record<"patch" | "changePassword" | "photoPut" | "photoDelete", Respond>
  >
}

// PNG válido de 1×1 px (lo que devuelve GET /users/me/photo).
export const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

const bytesOf = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))

// Simula el servicio admin de una cuenta: el GET siguiente refleja cada cambio (PATCH,
// cambio de contraseña, subir y quitar la foto), como el backend real. Registra los bodies
// para afirmar qué envió la pantalla. Incluye el catálogo de ciudades (A2).
export const fakeProfileBackend = (
  initial: MyProfileBody,
  options: FakeProfileOptions = {}
) => {
  const state = { profile: structuredClone(initial) }
  const bodies = {
    patch: [] as unknown[],
    changePassword: [] as unknown[],
    photoPut: [] as unknown[],
    photoDelete: 0,
  }
  // Veces que se pidió cada GET (el catálogo se pide una vez y queda en caché).
  const calls = { me: 0, usCities: 0 }
  const { respond = {} } = options

  const handlers = [
    http.get(PROFILE_URLS.me, () => {
      calls.me += 1
      return HttpResponse.json(state.profile)
    }),
    http.get(PROFILE_URLS.usCities, () => {
      calls.usCities += 1
      return HttpResponse.json([...US_CITIES])
    }),
    http.patch(PROFILE_URLS.me, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.patch.push(body)
      if (respond.patch) return respond.patch()
      // Como el backend (CF-B9): el super_admin no puede enviar notificaciones.
      if (state.profile.role === "super_admin" && "notifications" in body) {
        return HttpResponse.json(
          { error: ADMIN_NOTIFICATIONS_SERVER_ERROR },
          { status: 400 }
        )
      }
      const phone = typeof body.phone === "string" ? body.phone : null
      const residence =
        typeof body.residence === "string" ? body.residence : null
      // Como el backend (CF-B8, findUsCity): se compara sin distinguir mayúsculas y se
      // guarda con la forma del catálogo; una residencia que no está en él es un 400.
      const city = residence?.trim()
        ? US_CITIES.find(
            (item) => item.toLowerCase() === residence.trim().toLowerCase()
          )
        : null
      if (city === undefined) {
        return HttpResponse.json({ error: CITY_SERVER_ERROR }, { status: 400 })
      }
      state.profile = {
        ...state.profile,
        phone: phone ? phone.replace(/\s/g, "") : null,
        residence: city,
        // El admin conserva null; los demás mezclan las claves enviadas.
        notifications: state.profile.notifications && {
          ...state.profile.notifications,
          ...(body.notifications as Record<string, boolean> | undefined),
        },
      }
      return HttpResponse.json(state.profile)
    }),
    http.post(PROFILE_URLS.changePassword, async ({ request }) => {
      bodies.changePassword.push(await request.json())
      if (respond.changePassword) return respond.changePassword()
      state.profile = {
        ...state.profile,
        password_changed_at: new Date().toISOString(),
      }
      return HttpResponse.json({
        password_changed_at: state.profile.password_changed_at,
      })
    }),
    http.put(PROFILE_URLS.photo, async ({ request }) => {
      bodies.photoPut.push(await request.json())
      if (respond.photoPut) return respond.photoPut()
      state.profile = {
        ...state.profile,
        photo_updated_at: new Date().toISOString(),
      }
      return HttpResponse.json({
        photo_updated_at: state.profile.photo_updated_at,
      })
    }),
    http.delete(PROFILE_URLS.photo, () => {
      bodies.photoDelete += 1
      if (respond.photoDelete) return respond.photoDelete()
      state.profile = { ...state.profile, photo_updated_at: null }
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(PROFILE_URLS.photo, () =>
      state.profile.photo_updated_at
        ? new HttpResponse(bytesOf(PNG_1X1_BASE64), {
            headers: { "Content-Type": "image/png" },
          })
        : HttpResponse.json({ error: "Sin foto" }, { status: 404 })
    ),
  ]

  return { state, bodies, calls, handlers }
}
