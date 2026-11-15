// Datos comunes del perfil. El nombre y el cargo salen del auth store, no de aquí.
export interface UserProfile {
  employeeCode: string
  status: string
  contact: {
    phone: string
    email: string
    residenceZone: string
  }
  security: {
    lastPasswordChangeDays: number
  }
  // Foto guardada; null si no hay.
  photoUrl: string | null
}

// Datos propios del tripulante.
export interface CrewProfile {
  category: string
  quickStats: {
    base: string
    fleet: string
    totalHours: string
    commute: string
  }
  hubEstimate: string
  employment: {
    base: string
    officialPosition: string
    authorizedFleet: string
    hireDate: string
    totalHours: string
    fdpLimit: string
  }
  fdp: {
    usedHours: number
    maxHours: number
  }
  medicalCertificate: {
    medicalClass: string
    nextRenewal: string
    center: string
  }
}

export interface NotificationPreferences {
  urgentReplacement: boolean
  gateChanges: boolean
  certificationExpiry: boolean
}

// Datos propios del supervisor: su base y su turno.
export interface SupervisorProfile {
  quickStats: {
    base: string
    shift: string
    area: string
    occChannel: string
  }
  employment: {
    base: string
    officialPosition: string
    area: string
    shift: string
    hireDate: string
    radioChannel: string
  }
}

// Avisos del flujo de reemplazos que recibe el supervisor.
export interface SupervisorNotificationPreferences {
  newAbsences: boolean
  aiProposalsReady: boolean
  noCandidates: boolean
  confirmationExpired: boolean
}
