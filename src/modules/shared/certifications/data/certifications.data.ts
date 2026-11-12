import type {
  Certification,
  RecurrentTraining,
} from "@/modules/shared/certifications/types/certifications.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.
// Las fechas son «hoy + N días» al llamar, en ISO local de solo día (nunca toISOString, que es UTC).
const daysFromToday = (days: number) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export const getCertifications = (): Promise<Certification[]> =>
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
