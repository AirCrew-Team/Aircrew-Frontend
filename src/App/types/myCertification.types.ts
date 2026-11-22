// Certificación propia del tripulante (GET /crew/certifications/me, FE-4). El backend no
// guarda emisor, alcance ni vencimiento de las licencias: el único vencimiento es el del
// certificado médico del perfil (`medical_expires_on`).
export interface ApiMyCertification {
  employee_code: string | null
  position: string | null
  // Cabina de mando o de pasajeros; null si el cargo no es del catálogo.
  area: "flight_deck" | "cabin" | null
  // verified: cotejada por el super_admin · pending_verification: registrada sin cotejar ·
  // uncertified: aún sin certificación.
  status: "verified" | "pending_verification" | "uncertified"
  license_number: string | null
  certificate_details: {
    code: string
    name: string
    short: string
    // Licencia (ATP, CPL, PPL o CDP); el resto son habilitaciones o cursos.
    is_license: boolean
  }[]
  file: { file_name: string; mime_type: string; size_bytes: number } | null
  updated_at: string | null
  // «AAAA-MM-DD».
  medical_expires_on: string | null
  // Familias de aeronave habilitadas (A320, 787…).
  ratings: string[]
  // Nivel OACI de 1 a 6.
  english_level: number | null
}
