import type {
  ChangePasswordInput,
  OperatorProfile,
  ResidenceOption,
  UpdateOperatorProfileInput,
} from "@/modules/operatorProfile/types/operatorProfile.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando
// exista la API. Contexto: Delta Air Lines, datos de EE. UU. (hubs de Delta, +1, FAA).
// Los teléfonos usan el rango 555-01xx, reservado para ejemplos en EE. UU.

// Contraseña actual de prueba. Con la API la valida el
// backend; aquí solo sirve para simular el error «contraseña actual incorrecta».
export const MOCK_CURRENT_PASSWORD = "AirCrew2026!"

// Perfil por ID de usuario (el mismo de la sesión simulada en auth.store).
const PROFILES: Record<string, OperatorProfile> = {
  "mock-admin": {
    employeeCode: "OPS-8842",
    fullName: "Admin AirCrew",
    email: "admin@aircrew-ops.com",
    phone: "+14045550119",
    residence: "ATL",
    photoUrl: null,
    roleBadge: "Jefe de Operaciones",
    roleLine: "Superadministrador • Nivel 4",
    base: "Atlanta (ATL)",
    accountStatus: "Activa y verificada",
    credential: {
      title: "Despacho y Aeronavegabilidad",
      license: "Licencia FAA Aircraft Dispatcher #OPS-8842",
    },
    readOnlyField: {
      label: "Cargo / Departamento",
      value: "Jefatura de Operaciones y Despacho Aéreo",
      note: "Para actualizar el cargo operativo institucional, contacta a Recursos Humanos y Seguridad Operacional.",
    },
    phoneLabel: "Teléfono Móvil / Celular",
    security: {
      lastPasswordChangeDays: 42,
    },
    notifications: [
      {
        id: "crewAbsences",
        icon: "absence",
        title: "Alertas de ausencias de tripulantes",
        description:
          "Notificar al móvil (SMS y Push) si un piloto o tripulante de cabina se declara no-show o baja médica.",
        enabled: true,
      },
      {
        id: "fleetReport",
        icon: "fleet",
        title: "Reporte diario de estado de flota",
        description:
          "Enviar al correo corporativo el consolidado de aeronaves en tierra (AOG) y mantenimientos programados cada medianoche UTC.",
        enabled: true,
      },
    ],
    header: {
      subtitle:
        "Actualiza tus datos de contacto, foto de perfil, credenciales de acceso y preferencias de despacho de manera simple y segura.",
      syncLabel: "Sincronización ICAO",
    },
  },
}

// Copia del perfil: las funciones devuelven datos nuevos en cada respuesta, como el
// backend. Si devolvieran el mismo objeto que luego se modifica, TanStack Query vería la
// respuesta igual a la anterior y no repintaría.
const copyProfile = (profile: OperatorProfile): OperatorProfile =>
  structuredClone(profile)

// Perfil del usuario con sesión (con la API, un GET del perfil).
export const getOperatorProfile = (
  userId: string
): Promise<OperatorProfile> => {
  const profile = PROFILES[userId]
  return profile
    ? Promise.resolve(copyProfile(profile))
    : Promise.reject(new Error(`Perfil ${userId} no encontrado`))
}

// Opciones de «País o Residencia Principal»: los hubs de Delta en EE. UU. Con la API
// vendrán de un catálogo del backend.
export const getResidenceOptions = (): Promise<ResidenceOption[]> =>
  Promise.resolve([
    { code: "ATL", label: "Estados Unidos · Atlanta, GA (Base ATL)" },
    { code: "BOS", label: "Estados Unidos · Boston, MA (Base BOS)" },
    { code: "DTW", label: "Estados Unidos · Detroit, MI (Base DTW)" },
    { code: "LAX", label: "Estados Unidos · Los Ángeles, CA (Base LAX)" },
    { code: "MSP", label: "Estados Unidos · Minneapolis, MN (Base MSP)" },
    { code: "JFK", label: "Estados Unidos · Nueva York, NY (Base JFK)" },
    { code: "SLC", label: "Estados Unidos · Salt Lake City, UT (Base SLC)" },
    { code: "SEA", label: "Estados Unidos · Seattle, WA (Base SEA)" },
  ])

// Error de un campo concreto (ej. contraseña actual incorrecta): el formulario lo
// muestra debajo de ese campo. Con la API corresponderá a un 4xx del backend.
export class ProfileFieldError extends Error {
  field: "currentPassword" | "email"

  constructor(field: ProfileFieldError["field"], message: string) {
    super(message)
    this.field = field
  }
}

// Guarda el perfil (con la API, un PUT del perfil; repetirlo da el mismo resultado).
export const updateOperatorProfile = (
  userId: string,
  input: UpdateOperatorProfileInput
): Promise<OperatorProfile> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const profile = PROFILES[userId]
      if (!profile) return reject(new Error(`Perfil ${userId} no encontrado`))
      Object.assign(profile, {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        residence: input.residence,
      })
      profile.notifications = profile.notifications.map((notification) => ({
        ...notification,
        enabled: input.notifications[notification.id] ?? notification.enabled,
      }))
      // undefined: se deja la foto; null: se quita; File: la nueva (en el navegador se
      // muestra desde la memoria; con la API, el backend devolverá su dirección).
      if (input.photo === null) profile.photoUrl = null
      else if (input.photo && typeof URL.createObjectURL === "function") {
        profile.photoUrl = URL.createObjectURL(input.photo)
      }
      resolve(copyProfile(profile))
    }, 400)
  })

// Cambia la contraseña (con la API, un POST aparte). Falla si la actual no coincide.
export const changePassword = (
  userId: string,
  input: ChangePasswordInput
): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const profile = PROFILES[userId]
      if (!profile) return reject(new Error(`Perfil ${userId} no encontrado`))
      if (input.currentPassword !== MOCK_CURRENT_PASSWORD) {
        return reject(
          new ProfileFieldError(
            "currentPassword",
            "La contraseña actual no es correcta."
          )
        )
      }
      profile.security.lastPasswordChangeDays = 0
      resolve()
    }, 400)
  })
