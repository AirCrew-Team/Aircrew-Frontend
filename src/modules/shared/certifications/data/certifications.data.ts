import { getMyCertification } from "@/App/actions/certifications/myCertification.actions"
import type {
  Certification,
  RecurrentTraining,
} from "@/modules/shared/certifications/types/certifications.types"
import { formatShortDate } from "@/modules/shared/certifications/utils/expiry"
import { withDemo } from "@/modules/shared/session/demoSession"

// Datos de ejemplo (cuenta demo).
// Las fechas son «hoy + N días» al llamar, en ISO local de solo día (nunca toISOString, que es UTC).
export const daysFromToday = (days: number) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

const demoCertifications = (): Promise<Certification[]> =>
  Promise.resolve([
    {
      id: "atp",
      kind: "license",
      name: "Licencia ATP (Airline Transport Pilot)",
      code: "LIC-ATP #2287-CO",
      issuer: "Aeronáutica Civil de Colombia",
      scope: "Mando Multimotor Línea Aérea",
      expiresAt: daysFromToday(749),
      observation: "Conforme RAC 61",
      appointment: null,
      details: [
        { label: "Emisor", value: "UAEAC (Aerocivil)" },
        {
          label: "Habilitación",
          value: "Operaciones IFR multimotor y comando internacional",
        },
        {
          label: "Bitácora",
          value: "Digital sincronizada · 4.820 horas de vuelo total",
        },
      ],
    },
    {
      id: "medical-class-1",
      kind: "medical",
      name: "Evaluación Médica Clase 1",
      code: "CEMAE-BOG #774-MED",
      issuer: "Medicina Aeroespacial CEMAE",
      scope: "Centro Médico Aeronáutico Bogotá",
      expiresAt: daysFromToday(35),
      observation: null,
      appointment: {
        date: daysFromToday(2),
        time: "08:30 COT",
        center: "CEMAE",
        location: "Aeropuerto El Dorado",
      },
      details: [
        { label: "Turno", value: "CEMAE-8891" },
        {
          label: "Lugar",
          value: "Centro Médico Aeronáutico El Dorado, Piso 3",
        },
        {
          label: "Requisitos",
          value:
            "Ayuno de 8 horas, lentes formulados de repuesto y cédula original",
        },
      ],
    },
    {
      id: "type-rating-a320",
      kind: "typeRating",
      name: "Type Rating A320 Family",
      code: "A319 / A320 / A321 Neo & Ceo",
      issuer: "Recurrente Nivel D (FFS)",
      scope: "CAE Aviation Training Center",
      expiresAt: daysFromToday(298),
      observation: "Conforme entrenamiento anual",
      appointment: null,
      details: [
        {
          label: "Último recurrente",
          value: "Simulador Nivel D, aprobado con nota sobresaliente",
        },
        {
          label: "Maniobras evaluadas",
          value:
            "Fallo de motor en V1, aproximaciones RNP AR y descompresión de cabina",
        },
      ],
    },
    {
      id: "icao-english",
      kind: "language",
      name: "ICAO English Level 6",
      code: "TEA Test #9921-EXP",
      issuer: "Nivel Experto Operacional",
      scope: "International Civil Aviation Org.",
      expiresAt: null,
      observation: "Certificación OACI verificada",
      appointment: null,
      details: [
        {
          label: "Acreditación",
          value: "Nivel 6 (Experto) según Doc 9835 OACI",
        },
        { label: "Reevaluación", value: "No requiere reevaluación periódica" },
        {
          label: "Alcance",
          value:
            "Radiocomunicación en cualquier espacio aéreo sin restricciones",
        },
      ],
    },
    {
      id: "cat-iiib",
      kind: "lowVisibility",
      name: "CAT IIIb Autoland & LVP",
      code: "Certificación DH < 50ft / RVR 75m",
      issuer: "Operaciones de Baja Visibilidad",
      scope: "Procedimientos Especiales RAC 121",
      expiresAt: daysFromToday(78),
      observation: "Simulador certificado",
      appointment: null,
      details: [
        {
          label: "Habilitación",
          value:
            "Aproximación por instrumentos de baja visibilidad en Airbus A320",
        },
        {
          label: "Requisito de vigencia",
          value:
            "Aproximaciones monitoreadas completadas en los últimos 6 meses",
        },
      ],
    },
  ])

export const getRecurrentTraining = (): Promise<RecurrentTraining> =>
  Promise.resolve({
    title: "Simulador A320 FFS Nivel D",
    startsOn: daysFromToday(240),
    endsOn: daysFromToday(243),
    location: "Simulador 3 • Instructor Cap. R. Morales",
  })

// --- Sesión real (FE-4): GET /crew/certifications/me. El backend no tiene emisor, alcance
// ni vencimiento de las licencias: los certificados llevan el estado del expediente, y el
// único vencimiento es el del certificado médico. Habilitaciones e inglés salen del perfil.

// Con qué coteja el super_admin al verificar (VERIFICATION_NOTES del backend).
const VERIFIED_BY_AREA: Record<string, string> = {
  flight_deck: "Cotejada con Airmen Inquiry (registro de la FAA)",
  cabin: "Cotejada con tu certificado físico",
}

// «2026-11-01T15:00:00.000Z» → «2026-11-01» con el día local.
const localIsoDate = (iso: string) => {
  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

const PROFILE_NOTE = "Registrado en tu perfil de tripulante"

const certificationsFromApi = async (): Promise<Certification[]> => {
  const record = await getMyCertification()
  if (!record) return []

  const verified = record.status === "verified"
  const recordLabel = verified ? "Verificado" : "Por verificar"
  const updatedOn = record.updated_at
    ? formatShortDate(localIsoDate(record.updated_at))
    : null
  const certificates = record.certificate_details.map(
    (detail): Certification => ({
      id: detail.code,
      kind: detail.is_license ? "license" : "course",
      name: detail.name,
      code:
        detail.is_license && record.license_number
          ? `Licencia N.º ${record.license_number}`
          : null,
      issuer: null,
      scope: null,
      expiresAt: null,
      undatedStatus: verified ? "verificado" : "por_verificar",
      observation: verified
        ? ((record.area && VERIFIED_BY_AREA[record.area]) ??
          "Cotejada por la administración")
        : "Pendiente de cotejo por la administración",
      appointment: null,
      details: [
        {
          label: "Número de licencia",
          value: record.license_number ?? "Sin registrar",
        },
        { label: "Estado del expediente", value: recordLabel },
        {
          label: "Copia del certificado",
          value: record.file ? record.file.file_name : "Sin copia cargada",
        },
        ...(updatedOn
          ? [{ label: "Última actualización", value: updatedOn }]
          : []),
      ],
    })
  )
  const medical: Certification[] = record.medical_expires_on
    ? [
        {
          id: "medical",
          kind: "medical",
          name: "Certificado médico",
          code: null,
          issuer: null,
          scope: null,
          expiresAt: record.medical_expires_on,
          observation: PROFILE_NOTE,
          appointment: null,
          details: [
            {
              label: "Vencimiento",
              value: formatShortDate(record.medical_expires_on),
            },
          ],
        },
      ]
    : []
  const ratings = record.ratings.map((rating): Certification => ({
    id: `rating-${rating}`,
    kind: "typeRating",
    name: `Habilitación de tipo ${rating}`,
    code: null,
    issuer: null,
    scope: null,
    expiresAt: null,
    undatedStatus: "registrado",
    observation: PROFILE_NOTE,
    appointment: null,
    details: [{ label: "Familia de aeronave", value: rating }],
  }))
  const english: Certification[] = record.english_level
    ? [
        {
          id: "english",
          kind: "language",
          name: `Inglés OACI nivel ${record.english_level}`,
          code: null,
          issuer: null,
          scope: null,
          expiresAt: null,
          undatedStatus: "registrado",
          observation: PROFILE_NOTE,
          appointment: null,
          details: [
            { label: "Nivel OACI", value: `${record.english_level} de 6` },
          ],
        },
      ]
    : []
  return [...certificates, ...medical, ...ratings, ...english]
}

// La cuenta demo usa los datos de ejemplo; la sesión real, el backend.
export const getCertifications = withDemo(
  certificationsFromApi,
  demoCertifications
)
