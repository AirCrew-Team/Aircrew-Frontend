// Datos comunes del perfil. El nombre, el cargo y la foto salen del auth store, no de aquí.
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
    securityKey: string
    hardwareSynced: boolean
  }
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
