import type {
  CrewProfile,
  NotificationPreferences,
  UserProfile,
} from "@/modules/profile/types/profile.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.
// Reciben el id del usuario de la sesión simulada.

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
      securityKey: "YubiKey 5C NFC",
      hardwareSynced: true,
    },
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
      securityKey: "YubiKey 5C NFC",
      hardwareSynced: true,
    },
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
      securityKey: "YubiKey 5 NFC",
      hardwareSynced: true,
    },
  },
}

const CREW_PROFILES: Record<string, CrewProfile> = {
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
      hireDate: "12 de Febrero de 2021 (3+ años)",
      totalHours: "3,420 hrs (Bitácora certificada)",
      fdpLimit: "45h / 90h máx legal (50% en margen seguro)",
    },
    fdp: { usedHours: 45, maxHours: 90 },
    medicalCertificate: {
      medicalClass: "Clase 1",
      nextRenewal: "15 de Noviembre 2025",
      center: "CEMAE Bogotá",
    },
  },
}

const NOTIFICATION_PREFERENCES: Record<string, NotificationPreferences> = {
  "mock-tripulante": {
    urgentReplacement: true,
    gateChanges: true,
    certificationExpiry: true,
  },
}

const findOrFail = <T>(records: Record<string, T>, userId: string) =>
  userId in records
    ? Promise.resolve(records[userId])
    : Promise.reject(new Error(`Sin datos para ${userId}`))

export const getUserProfile = (userId: string): Promise<UserProfile> =>
  findOrFail(USER_PROFILES, userId)

export const getCrewProfile = (userId: string): Promise<CrewProfile> =>
  findOrFail(CREW_PROFILES, userId)

export const getNotificationPreferences = (
  userId: string
): Promise<NotificationPreferences> =>
  findOrFail(NOTIFICATION_PREFERENCES, userId)
