import {
  getMyAccount,
  getMyCrewMember,
  type CrewMemberStatus,
} from "@/App/actions/profile/profile.actions"
import type {
  CrewProfile,
  NotificationPreferences,
  SupervisorNotificationPreferences,
  SupervisorProfile,
  UserProfile,
} from "@/modules/profile/types/profile.types"
import { daysFromToday } from "@/modules/shared/certifications/data/certifications.data"
import { CurrentPasswordError } from "@/modules/shared/password/CurrentPasswordError"
import { PasswordChangeUnavailableError } from "@/modules/shared/password/PasswordChangeUnavailableError"
import type { ChangePasswordInput } from "@/modules/shared/password/types/password.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.
// Reciben el id del usuario de la sesión simulada.

// Contraseña actual de prueba, la misma del admin. Con la API la valida el backend;
// aquí solo sirve para simular el error «contraseña actual incorrecta».
const MOCK_CURRENT_PASSWORD = "AirCrew2026!"

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

// «2026-12-19» → «19 de diciembre de 2026». El ISO de solo día se parte a mano:
// new Date(iso) lo leería en UTC y en Bogotá daría el día anterior.
const formatLongDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number)
  return `${day} de ${MONTHS[month - 1]} de ${year}`
}

const USER_PROFILES: Record<string, UserProfile> = {
  "mock-tripulante": {
    employeeCode: "AC-2287",
    status: "Activo",
    contact: {
      phone: "+57 310 445 8899",
      email: "jp.navarro@aircrew-ops.com",
      residenceZone: "Zona Fontibón - Salitre, Bogotá",
    },
    security: {
      lastPasswordChangeDays: 42,
    },
    photoUrl: null,
  },
  "mock-supervisor": {
    employeeCode: "AC-0412",
    status: "Activo",
    contact: {
      phone: "+57 315 220 1478",
      email: "c.restrepo@aircrew-ops.com",
      residenceZone: "Zona Modelia, Bogotá",
    },
    security: {
      lastPasswordChangeDays: 18,
    },
    photoUrl: null,
  },
  "mock-admin": {
    employeeCode: "AC-0001",
    status: "Activo",
    contact: {
      phone: "+57 300 118 9032",
      email: "admin@aircrew-ops.com",
      residenceZone: "Zona Chicó, Bogotá",
    },
    security: {
      lastPasswordChangeDays: 7,
    },
    photoUrl: null,
  },
}

// Función y no constante: la renovación médica se calcula al llamar (hoy + 35 días, la
// misma fecha que «Evaluación Médica Clase 1» en Certificaciones).
const crewProfiles = (): Record<string, CrewProfile> => ({
  "mock-tripulante": {
    category: "CAT III Dual",
    quickStats: {
      base: "El Dorado, Bogotá (BOG)",
      fleet: "Airbus A320 / A321",
      totalHours: "3,420 hrs",
      commute: "25 min (Fontibón)",
    },
    hubEstimate: "25 minutos",
    employment: {
      base: "Bogotá - El Dorado (BOG)",
      officialPosition:
        "Primer Oficial / Copiloto de Línea Aérea (F/O Nivel 3)",
      authorizedFleet: "Airbus A320 / A321 Family",
      hireDate: "12 de Febrero de 2021 (5+ años)",
      totalHours: "3,420 hrs (Bitácora certificada)",
      fdpLimit: "45h / 90h máx legal (50% en margen seguro)",
    },
    fdp: { usedHours: 45, maxHours: 90 },
    medicalCertificate: {
      medicalClass: "Clase 1",
      nextRenewal: formatLongDate(daysFromToday(35)),
      center: "CEMAE Bogotá",
    },
  },
})

const NOTIFICATION_PREFERENCES: Record<string, NotificationPreferences> = {
  "mock-tripulante": {
    urgentReplacement: true,
    gateChanges: true,
    certificationExpiry: true,
  },
}

const SUPERVISOR_PROFILES: Record<string, SupervisorProfile> = {
  "mock-supervisor": {
    quickStats: {
      base: "El Dorado, Bogotá (BOG)",
      shift: "Tarde · 14:00–22:00 UTC",
      area: "Control de Tripulaciones (OCC)",
      occChannel: "Canal 1",
    },
    employment: {
      base: "Bogotá - El Dorado (BOG)",
      officialPosition: "Supervisora de Tripulaciones OCC",
      area: "Centro de Control Operacional (OCC)",
      shift: "Tarde · 14:00 a 22:00 UTC",
      hireDate: "3 de Marzo de 2016 (10+ años)",
      radioChannel: "Canal 1 · Coordinación OCC",
    },
  },
}

const SUPERVISOR_NOTIFICATION_PREFERENCES: Record<
  string,
  SupervisorNotificationPreferences
> = {
  "mock-supervisor": {
    newAbsences: true,
    aiProposalsReady: true,
    noCandidates: true,
    confirmationExpired: true,
  },
}

// Copia limpia de los ejemplos tal como se cargan: las cuentas demo modifican sus
// registros (foto, contraseña), y una cuenta real no debe heredar esos cambios.
const PRISTINE_USER_PROFILES = structuredClone(USER_PROFILES)
const PRISTINE_NOTIFICATION_PREFERENCES = structuredClone(
  NOTIFICATION_PREFERENCES
)
const PRISTINE_SUPERVISOR_PROFILES = structuredClone(SUPERVISOR_PROFILES)
const PRISTINE_SUPERVISOR_NOTIFICATION_PREFERENCES = structuredClone(
  SUPERVISOR_NOTIFICATION_PREFERENCES
)

// Ids de las cuentas demo: los de los registros de ejemplo tal como se cargan.
const DEMO_IDS = new Set(Object.keys(USER_PROFILES))

export const isDemoUserId = (userId: string) => DEMO_IDS.has(userId)

// Plantilla de ejemplo según el rol que devuelve el backend.
const TEMPLATE_BY_ROLE: Record<string, string> = {
  crew: "mock-tripulante",
  supervisor: "mock-supervisor",
  super_admin: "mock-admin",
}

const STATUS_LABELS: Record<CrewMemberStatus, string> = {
  available: "Disponible",
  on_duty: "En servicio",
  in_flight: "En vuelo",
  medical_leave: "Incapacidad médica",
}

// Perfiles de tripulante de ids reales (crewProfiles() se recalcula en cada llamada).
const realCrewProfiles: Record<string, CrewProfile> = {}

// Copia profunda de la plantilla limpia al id real, si hay plantilla para ese rol.
const copyTemplate = <T>(
  pristine: Record<string, T>,
  records: Record<string, T>,
  template: string,
  userId: string
) => {
  if (template in pristine)
    records[userId] = structuredClone(pristine[template])
}

// Crea los registros de un id real: plantilla de su rol con los datos reales encima.
// Siempre consulta la cuenta (si el servidor falla, se ve el error); si los registros ya
// existen no los reemplaza, para no perder lo que el usuario cambió en esta sesión.
// Escribe al final, así un fallo no deja registros a medias.
const createRealRecords = async (userId: string) => {
  const account = await getMyAccount()
  // La cookie puede ser de otra cuenta (p. ej. otra pestaña cambió de usuario): sus
  // datos nunca se guardan bajo este id.
  if (account.id !== userId) {
    throw new Error("La cuenta del servidor no es la de la sesión.")
  }
  if (userId in USER_PROFILES) return
  const template = TEMPLATE_BY_ROLE[account.role]
  if (!template) throw new Error(`Rol desconocido: ${account.role}`)
  // Si el perfil de crew falla, el tripulante ve la plantilla con su correo real.
  const crewMember =
    account.role === "crew" ? await getMyCrewMember().catch(() => null) : null

  const profile = structuredClone(PRISTINE_USER_PROFILES[template])
  profile.contact.email = account.email
  profile.status = account.is_active ? "Activo" : "Inactivo"

  // Solo el tripulante tiene plantilla aquí (undefined para supervisor y admin).
  const crewProfile: CrewProfile | undefined = crewProfiles()[template]
  if (crewMember && crewProfile) {
    profile.employeeCode = crewMember.employee_code
    profile.status = STATUS_LABELS[crewMember.status]
    crewProfile.employment.officialPosition = crewMember.position
    if (crewMember.current_location) {
      crewProfile.employment.base = crewMember.current_location
      crewProfile.quickStats.base = crewMember.current_location
    }
  }

  USER_PROFILES[userId] = profile
  if (crewProfile) realCrewProfiles[userId] = crewProfile
  copyTemplate(
    PRISTINE_NOTIFICATION_PREFERENCES,
    NOTIFICATION_PREFERENCES,
    template,
    userId
  )
  copyTemplate(
    PRISTINE_SUPERVISOR_PROFILES,
    SUPERVISOR_PROFILES,
    template,
    userId
  )
  copyTemplate(
    PRISTINE_SUPERVISOR_NOTIFICATION_PREFERENCES,
    SUPERVISOR_NOTIFICATION_PREFERENCES,
    template,
    userId
  )
}

// Las consultas simultáneas de un id comparten la misma petición. Al terminar, bien o mal,
// se olvida, así un fallo no se queda guardado y un reintento puede funcionar.
const creations = new Map<string, Promise<void>>()

const ensureRecords = (userId: string): Promise<void> => {
  if (isDemoUserId(userId)) return Promise.resolve()
  let creation = creations.get(userId)
  if (!creation) {
    creation = createRealRecords(userId)
    creations.set(userId, creation)
    const forget = () => creations.delete(userId)
    creation.then(forget, forget)
  }
  return creation
}

const findOrFail = <T>(records: Record<string, T>, userId: string) =>
  userId in records
    ? Promise.resolve(records[userId])
    : Promise.reject(new Error(`Sin datos para ${userId}`))

// Devuelve una copia, como el backend: si fuera el mismo objeto que luego cambia
// changePassword, TanStack Query vería la respuesta igual y no repintaría.
export const getUserProfile = (userId: string): Promise<UserProfile> =>
  ensureRecords(userId)
    .then(() => findOrFail(USER_PROFILES, userId))
    .then((profile) => structuredClone(profile))

export const getCrewProfile = (userId: string): Promise<CrewProfile> =>
  ensureRecords(userId)
    .then(() => findOrFail({ ...crewProfiles(), ...realCrewProfiles }, userId))
    .then((profile) => structuredClone(profile))

export const getNotificationPreferences = (
  userId: string
): Promise<NotificationPreferences> =>
  ensureRecords(userId).then(() => findOrFail(NOTIFICATION_PREFERENCES, userId))

export const getSupervisorProfile = (
  userId: string
): Promise<SupervisorProfile> =>
  ensureRecords(userId).then(() => findOrFail(SUPERVISOR_PROFILES, userId))

export const getSupervisorNotificationPreferences = (
  userId: string
): Promise<SupervisorNotificationPreferences> =>
  ensureRecords(userId).then(() =>
    findOrFail(SUPERVISOR_NOTIFICATION_PREFERENCES, userId)
  )

// Cambia la contraseña (con la API, un POST aparte). Falla si la actual no coincide.
export const changePassword = (
  userId: string,
  input: ChangePasswordInput
): Promise<void> => {
  // Con una sesión real el backend aún no tiene este endpoint.
  if (!isDemoUserId(userId)) {
    return Promise.reject(
      new PasswordChangeUnavailableError(
        "El cambio de contraseña todavía no está conectado al servidor."
      )
    )
  }
  return new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const profile = USER_PROFILES[userId]
      if (!profile) return reject(new Error(`Sin datos para ${userId}`))
      if (input.currentPassword !== MOCK_CURRENT_PASSWORD) {
        return reject(
          new CurrentPasswordError("La contraseña actual no es correcta.")
        )
      }
      profile.security.lastPasswordChangeDays = 0
      resolve()
    }, 400)
  })
}

// Guarda la foto del perfil (con la API, un PUT). null la quita; un File es la nueva (en el
// navegador se muestra desde la memoria; con la API, el backend devolverá su dirección).
export const updateProfilePhoto = (
  userId: string,
  photo: File | null
): Promise<UserProfile> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const profile = USER_PROFILES[userId]
      if (!profile) return reject(new Error(`Sin datos para ${userId}`))
      if (photo === null) profile.photoUrl = null
      else if (typeof URL.createObjectURL === "function") {
        profile.photoUrl = URL.createObjectURL(photo)
      }
      resolve(structuredClone(profile))
    }, 400)
  })
