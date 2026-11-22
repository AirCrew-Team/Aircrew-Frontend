// Datos de ejemplo de las cuentas demo (D4) y de los tests: el módulo .data.ts los
// devuelve cuando la sesión es demo, sin llamar al backend.
import type {
  Airport,
  CrewSlot,
  FlightStatus,
  PlannedFlight,
  ScheduleDay,
  SlotCandidates,
  SlotRole,
} from "@/modules/shared/flightAssignment/types/flightAssignment.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.
// Hacen de backend: aplican las reglas de elegibilidad, tardan 400 ms, guardan el estado en
// memoria (se reinicia al recargar, sin función de reinicio) y cada respuesta es una copia.
// Los vuelos se guardan con su día como «hoy + N»: la fecha ISO local se calcula al llamar.
// Los helpers no se exportan: los tests envuelven cada función exportada con vi.mock.

const LATENCY_MS = 400
const SCHEDULE_DAYS = 7
const MIN_REST_MINUTES = 10 * 60
const MONTHLY_LIMIT_HOURS = 90
const MINUTES_PER_DAY = 24 * 60

// --- Fechas y horas ---

const pad = (value: number) => String(value).padStart(2, "0")

// ISO de solo día de «hoy + N» en fecha local (nunca toISOString, que es UTC).
const dateOf = (day: number) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const minutesOf = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number)
  return hours * 60 + minutes
}

const clockOf = (minutes: number) => {
  const inDay =
    ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  return `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`
}

// Si la llegada es anterior a la salida, el vuelo llega al día siguiente.
const durationOf = (departure: string, arrival: string) => {
  const minutes = minutesOf(arrival) - minutesOf(departure)
  return minutes > 0 ? minutes : minutes + MINUTES_PER_DAY
}

// --- Aeropuertos y flota ---

const AIRPORTS = {
  BOG: { code: "BOG", city: "Bogotá" },
  MDE: { code: "MDE", city: "Medellín" },
  CLO: { code: "CLO", city: "Cali" },
  CTG: { code: "CTG", city: "Cartagena" },
  BAQ: { code: "BAQ", city: "Barranquilla" },
  MAD: { code: "MAD", city: "Madrid" },
} satisfies Record<string, Airport>

type Destination = Exclude<keyof typeof AIRPORTS, "BOG">

type Family = "A320" | "787"

const AIRCRAFT = {
  "HK-5301": { model: "Airbus A320neo", family: "A320", seats: 186 },
  "HK-5305": { model: "Airbus A320neo", family: "A320", seats: 186 },
  "HK-5342": { model: "Airbus A320neo", family: "A320", seats: 186 },
  "HK-5370": { model: "Airbus A320neo", family: "A320", seats: 186 },
  "HK-5112": { model: "Airbus A320", family: "A320", seats: 180 },
  "HK-5118": { model: "Airbus A320", family: "A320", seats: 180 },
  "HK-5280": { model: "Boeing 787-8", family: "787", seats: 250 },
  "HK-5284": { model: "Boeing 787-8", family: "787", seats: 250 },
} satisfies Record<string, { model: string; family: Family; seats: number }>

type Registration = keyof typeof AIRCRAFT

// --- Tripulantes de la base BOG ---

type Rank = "capitan" | "primer_oficial" | "jefe_cabina" | "tcp"

interface CrewMember {
  id: string
  fullName: string
  rank: Rank
  // Tipos de avión en los que está habilitado.
  ratings: Family[]
  // Horas de vuelo del mes antes de esta semana (la simulación no las suma).
  monthHours: number
  // Inglés OACI nivel 4 o superior (solo se exige a los pilotos en vuelos internacionales).
  icaoEnglish4?: boolean
  // Día («hoy + N») desde el que el certificado médico está vencido.
  medicalExpiredFrom?: number
  absences?: { day: number; kind: "ausente" | "vacaciones" }[]
}

const CREW: CrewMember[] = [
  // Capitanes
  {
    id: "c-01",
    fullName: "Andrés Valencia",
    rank: "capitan",
    ratings: ["A320"],
    monthHours: 62,
    icaoEnglish4: true,
  },
  {
    id: "c-02",
    fullName: "Ricardo Salazar",
    rank: "capitan",
    ratings: ["A320"],
    monthHours: 70,
    icaoEnglish4: true,
  },
  {
    id: "c-03",
    fullName: "Hernán Ospina",
    rank: "capitan",
    ratings: ["A320"],
    monthHours: 74,
    icaoEnglish4: true,
  },
  {
    id: "c-04",
    fullName: "Alejandro Vargas",
    rank: "capitan",
    ratings: ["A320"],
    monthHours: 68,
    icaoEnglish4: true,
  },
  {
    id: "c-05",
    fullName: "Carlos Restrepo",
    rank: "capitan",
    ratings: ["A320"],
    monthHours: 77,
    icaoEnglish4: true,
  },
  {
    id: "c-06",
    fullName: "Gustavo Lozano",
    rank: "capitan",
    ratings: ["A320"],
    monthHours: 60,
    icaoEnglish4: true,
    absences: [
      { day: 5, kind: "vacaciones" },
      { day: 6, kind: "vacaciones" },
    ],
  },
  {
    id: "c-07",
    fullName: "Jorge Medina",
    rank: "capitan",
    ratings: ["787"],
    monthHours: 58,
    icaoEnglish4: true,
  },
  {
    id: "c-08",
    fullName: "Martín Gutiérrez",
    rank: "capitan",
    ratings: ["787"],
    monthHours: 66,
    icaoEnglish4: true,
  },
  // Primeros oficiales
  {
    id: "f-01",
    fullName: "Sebastián Castro",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 48,
    icaoEnglish4: true,
  },
  {
    id: "f-02",
    fullName: "Mateo Morales",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 71,
    icaoEnglish4: true,
  },
  {
    id: "f-03",
    fullName: "Valentina Ortiz",
    rank: "primer_oficial",
    ratings: ["A320", "787"],
    monthHours: 80,
    icaoEnglish4: false,
  },
  {
    id: "f-04",
    fullName: "Simón Echeverri",
    rank: "primer_oficial",
    ratings: ["A320", "787"],
    monthHours: 64,
    icaoEnglish4: true,
  },
  {
    id: "f-05",
    fullName: "Diego Pardo",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 59,
    icaoEnglish4: true,
    medicalExpiredFrom: 5,
  },
  {
    id: "f-06",
    fullName: "Tomás Rincón",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 52,
    icaoEnglish4: true,
    absences: [{ day: 5, kind: "ausente" }],
  },
  {
    id: "f-07",
    fullName: "Santiago Mejía",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 66,
    icaoEnglish4: true,
  },
  {
    id: "f-08",
    fullName: "Juan Pablo Henao",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 58,
    icaoEnglish4: true,
  },
  {
    id: "f-09",
    fullName: "Camila Navarro",
    rank: "primer_oficial",
    ratings: ["A320"],
    monthHours: 63,
    icaoEnglish4: true,
  },
  // Jefes de cabina
  {
    id: "j-01",
    fullName: "Lucía Mora",
    rank: "jefe_cabina",
    ratings: ["A320"],
    monthHours: 57,
  },
  {
    id: "j-02",
    fullName: "Andrea López",
    rank: "jefe_cabina",
    ratings: ["A320"],
    monthHours: 63,
  },
  {
    id: "j-03",
    fullName: "Carolina Ruiz",
    rank: "jefe_cabina",
    ratings: ["A320"],
    monthHours: 45,
  },
  {
    id: "j-04",
    fullName: "Marcela Duarte",
    rank: "jefe_cabina",
    ratings: ["A320"],
    monthHours: 69,
  },
  {
    id: "j-05",
    fullName: "Patricia Zapata",
    rank: "jefe_cabina",
    ratings: ["A320"],
    monthHours: 72,
  },
  {
    id: "j-06",
    fullName: "Isabel Cortés",
    rank: "jefe_cabina",
    ratings: ["A320", "787"],
    monthHours: 61,
  },
  // TCP
  {
    id: "t-01",
    fullName: "Paula Cárdenas",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 54,
  },
  {
    id: "t-02",
    fullName: "Natalia Reyes",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 67,
  },
  {
    id: "t-03",
    fullName: "Juliana Pérez",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 66,
  },
  {
    id: "t-04",
    fullName: "Felipe Rojas",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 73,
  },
  {
    id: "t-05",
    fullName: "Daniela Torres",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 40,
  },
  {
    id: "t-06",
    fullName: "Camilo Herrera",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 55,
  },
  {
    id: "t-07",
    fullName: "Laura Gómez",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 50,
    absences: [
      { day: 5, kind: "vacaciones" },
      { day: 6, kind: "vacaciones" },
    ],
  },
  {
    id: "t-08",
    fullName: "Mariana Silva",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 84,
  },
  {
    id: "t-09",
    fullName: "Sofía Ramírez",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 58,
  },
  {
    id: "t-10",
    fullName: "Gabriela Rueda",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 61,
  },
  {
    id: "t-11",
    fullName: "Daniel Acosta",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 70,
  },
  {
    id: "t-12",
    fullName: "Valeria Méndez",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 47,
    absences: [{ day: 5, kind: "ausente" }],
  },
  {
    id: "t-13",
    fullName: "Julián Becerra",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 75,
  },
  {
    id: "t-14",
    fullName: "Catalina Ríos",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 65,
  },
  {
    id: "t-15",
    fullName: "Manuela Quintero",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 56,
  },
  {
    id: "t-16",
    fullName: "Esteban Pineda",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 49,
  },
  {
    id: "t-17",
    fullName: "Lorena Vélez",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 62,
  },
  {
    id: "t-18",
    fullName: "Nicolás Arango",
    rank: "tcp",
    ratings: ["A320", "787"],
    monthHours: 53,
  },
  {
    id: "t-19",
    fullName: "Alejandra Muñoz",
    rank: "tcp",
    ratings: ["A320"],
    monthHours: 52,
  },
]

// --- Puestos por vuelo (los calcula backend según el avión y la duración) ---

const RANKS_FOR_ROLE: Record<SlotRole, Rank[]> = {
  capitan: ["capitan"],
  primer_oficial: ["primer_oficial"],
  piloto_relevo: ["capitan", "primer_oficial"],
  jefe_cabina: ["jefe_cabina"],
  tcp: ["tcp"],
}

const PILOT_ROLES: SlotRole[] = ["capitan", "primer_oficial", "piloto_relevo"]

// Capitán y Primer Oficial; Piloto de relevo con más de 8 h; 1 TCP por cada 50 sillas,
// uno de ellos Jefe de Cabina.
const slotsFor = (
  seats: number,
  durationMinutes: number
): Omit<CrewSlot, "assignee">[] => [
  { id: "capitan", role: "capitan", label: "Capitán" },
  { id: "primer-oficial", role: "primer_oficial", label: "Primer Oficial" },
  ...(durationMinutes > 8 * 60
    ? [
        {
          id: "piloto-relevo",
          role: "piloto_relevo" as const,
          label: "Piloto de relevo",
        },
      ]
    : []),
  { id: "jefe-cabina", role: "jefe_cabina", label: "Jefe de Cabina" },
  ...Array.from({ length: Math.ceil(seats / 50) - 1 }, (_, index) => ({
    id: `tcp-${index + 1}`,
    role: "tcp" as const,
    label: `TCP ${index + 1}`,
  })),
]

// --- Vuelos de los próximos 7 días ---

interface StoredAssignment {
  crewId: string
  source: "manual" | "ia"
  rationale: string | null
}

interface StoredSlot extends Omit<CrewSlot, "assignee"> {
  assignment: StoredAssignment | null
}

interface StoredFlight {
  id: string
  flightNumber: string
  // «hoy + N».
  day: number
  destination: Destination
  departure: string
  arrival: string
  registration: Registration
  confirmed: boolean
  slots: StoredSlot[]
}

// La tripulación va en el orden de los puestos; null = puesto vacío.
const flight = (
  flightNumber: string,
  day: number,
  destination: Destination,
  departure: string,
  arrival: string,
  registration: Registration,
  confirmed: boolean,
  crew: (string | null)[]
): StoredFlight => ({
  id: flightNumber.toLowerCase(),
  flightNumber,
  day,
  destination,
  departure,
  arrival,
  registration,
  confirmed,
  slots: slotsFor(
    AIRCRAFT[registration].seats,
    durationOf(departure, arrival)
  ).map((slot, index) => {
    const crewId = crew[index] ?? null
    return {
      ...slot,
      assignment: crewId ? { crewId, source: "manual", rationale: null } : null,
    }
  }),
})

// Tripulaciones que repiten franja horaria cada día (así descansan unas 24 h entre servicios).
// Orden: Capitán, Primer Oficial, Jefe de Cabina, TCP 1, TCP 2 y TCP 3.
// Todas las tripulaciones asignadas cumplen las 8 reglas en su vuelo.
const EARLY = ["c-03", "f-07", "j-03", "t-03", "t-04", "t-08"]
const MORNING = ["c-04", "f-08", "j-04", "t-09", "t-10", "t-11"]
const MIDDAY = ["c-01", "f-01", "j-01", "t-01", "t-02", "t-05"]
const AFTERNOON = ["c-02", "f-02", "j-02", "t-06", "t-12", "t-07"]
const EVENING = ["c-05", "f-03", "j-05", "t-13", "t-14", "t-19"]
const NIGHT = ["c-06", "f-04", "j-06", "t-16", "t-17", "t-18"]

// Estado en memoria (las acciones lo modifican).
const FLIGHTS: StoredFlight[] = [
  // Hoy: 5 vuelos, todos confirmados.
  flight("AV-8402", 0, "MDE", "06:00", "06:55", "HK-5301", true, EARLY),
  flight("AV-2280", 0, "CLO", "09:15", "10:20", "HK-5118", true, MORNING),
  flight("AV-4011", 0, "CTG", "12:40", "14:05", "HK-5370", true, MIDDAY),
  flight("AV-5520", 0, "BAQ", "15:30", "17:00", "HK-5342", true, AFTERNOON),
  flight("AV-6140", 0, "MDE", "18:50", "19:45", "HK-5112", true, EVENING),
  // Hoy + 1: 6 vuelos, listos.
  flight("AV-8404", 1, "MDE", "06:05", "07:00", "HK-5301", true, EARLY),
  flight("AV-2282", 1, "CLO", "09:20", "10:25", "HK-5118", true, MORNING),
  flight("AV-4013", 1, "CTG", "12:45", "14:10", "HK-5370", true, MIDDAY),
  flight("AV-5522", 1, "BAQ", "15:35", "17:05", "HK-5342", true, AFTERNOON),
  flight("AV-6142", 1, "MDE", "18:55", "19:50", "HK-5112", true, EVENING),
  flight("AV-7304", 1, "CTG", "21:30", "22:55", "HK-5305", true, NIGHT),
  // Hoy + 2: 6 vuelos, listos.
  flight("AV-8406", 2, "MDE", "06:00", "06:55", "HK-5301", true, EARLY),
  flight("AV-2284", 2, "CLO", "09:15", "10:20", "HK-5118", true, MORNING),
  flight("AV-4015", 2, "CTG", "12:40", "14:05", "HK-5370", true, MIDDAY),
  flight("AV-5524", 2, "BAQ", "15:30", "17:00", "HK-5342", true, AFTERNOON),
  flight("AV-6144", 2, "MDE", "18:50", "19:45", "HK-5112", true, EVENING),
  flight("AV-7306", 2, "BAQ", "21:20", "22:50", "HK-5305", true, NIGHT),
  // Hoy + 3: 5 vuelos, 1 por completar (falta TCP 3 en AV-4017).
  flight("AV-8408", 3, "MDE", "06:05", "07:00", "HK-5301", true, EARLY),
  flight("AV-2286", 3, "CLO", "09:20", "10:25", "HK-5118", true, MORNING),
  flight("AV-4017", 3, "CTG", "12:45", "14:10", "HK-5370", false, [
    ...MIDDAY.slice(0, 5),
    null,
  ]),
  flight("AV-5526", 3, "BAQ", "15:35", "17:05", "HK-5342", true, AFTERNOON),
  flight("AV-6146", 3, "MDE", "18:55", "19:50", "HK-5112", true, EVENING),
  // Hoy + 4: 6 vuelos, 2 por completar. AV-9010 llega el día siguiente a las 04:40: de ahí
  // el descanso de Simón Echeverri hasta las 15:10 del día siguiente.
  flight("AV-8409", 4, "MDE", "06:00", "06:55", "HK-5301", true, EARLY),
  flight("AV-2288", 4, "CLO", "09:15", "10:20", "HK-5118", true, MORNING),
  flight("AV-4019", 4, "CTG", "12:40", "14:05", "HK-5370", true, MIDDAY),
  flight("AV-5528", 4, "BAQ", "15:30", "17:00", "HK-5342", false, [
    ...AFTERNOON.slice(0, 5),
    null,
  ]),
  flight("AV-9010", 4, "MAD", "18:05", "04:40", "HK-5284", true, [
    "c-07",
    "f-04",
    "c-08",
    "j-06",
    "t-16",
    "t-17",
    "t-18",
    "t-15",
  ]),
  flight("AV-6148", 4, "MDE", "18:50", "19:45", "HK-5112", false, [
    ...EVENING.slice(0, 5),
    null,
  ]),
  // Hoy + 5 (la tabla de la spec): 6 vuelos, 3 por completar. Juliana Pérez y Felipe Rojas
  // vuelan AV-8410 y AV-6150, con 11 h 10 min de descanso entre los dos.
  flight("AV-8410", 5, "MDE", "06:10", "07:05", "HK-5301", true, EARLY),
  flight("AV-2290", 5, "CLO", "10:30", "11:35", "HK-5118", true, MORNING),
  flight("AV-4021", 5, "CTG", "14:20", "15:45", "HK-5370", false, [
    null,
    null,
    "j-01",
    "t-01",
    "t-02",
    null,
  ]),
  flight("AV-5530", 5, "BAQ", "16:50", "18:20", "HK-5342", true, [
    "c-05",
    "f-09",
    "j-05",
    "t-13",
    "t-14",
    "t-19",
  ]),
  flight("AV-6150", 5, "MDE", "19:45", "20:40", "HK-5112", false, [
    "c-02",
    "f-02",
    "j-02",
    "t-03",
    "t-04",
    null,
  ]),
  flight("AV-9012", 5, "MAD", "22:05", "08:40", "HK-5280", false, []),
  // Hoy + 6: 4 vuelos, todos por completar.
  flight("AV-8430", 6, "MDE", "06:40", "07:35", "HK-5301", false, []),
  flight(
    "AV-2310",
    6,
    "CLO",
    "11:10",
    "12:15",
    "HK-5118",
    false,
    MORNING.slice(0, 3)
  ),
  flight("AV-4041", 6, "CTG", "15:00", "16:25", "HK-5370", false, []),
  flight("AV-5550", 6, "BAQ", "18:20", "19:50", "HK-5342", false, EVENING),
]

// --- Reglas ---

// Ventana de servicio: desde la presentación (1 h antes de salir) hasta 30 min después de llegar,
// en minutos desde hoy a las 00:00.
const windowOf = (stored: StoredFlight) => {
  const departure = stored.day * MINUTES_PER_DAY + minutesOf(stored.departure)
  return {
    start: departure - 60,
    end: departure + durationOf(stored.departure, stored.arrival) + 30,
  }
}

const crosses = (a: StoredFlight, b: StoredFlight) => {
  const first = windowOf(a)
  const second = windowOf(b)
  return first.start < second.end && second.start < first.end
}

const assignedFlightsOf = (crewId: string, except: StoredFlight) =>
  FLIGHTS.filter(
    (stored) =>
      stored.id !== except.id &&
      stored.slots.some((slot) => slot.assignment?.crewId === crewId)
  )

const scopeOf = (stored: StoredFlight) =>
  stored.destination === "MAD" ? "internacional" : "nacional"

// El primer motivo que falla, en el orden de las reglas 2 a 8 (la regla 1, el rango, no da
// motivo: quien no lo tiene no se lista). null = cumple todas.
const reasonFor = (
  member: CrewMember,
  stored: StoredFlight,
  role: SlotRole
) => {
  const { family } = AIRCRAFT[stored.registration]
  const window = windowOf(stored)
  const others = assignedFlightsOf(member.id, stored)

  // 2. Habilitación en el tipo de avión.
  if (!member.ratings.includes(family)) return `Sin habilitación en ${family}`
  // 3. Certificado médico vigente.
  if (
    member.medicalExpiredFrom !== undefined &&
    stored.day >= member.medicalExpiredFrom
  )
    return "Certificado médico vencido"
  // 4. Descanso mínimo: solo cuentan los servicios que terminan antes de la presentación
  // (los que se cruzan los detecta la regla 7).
  const lastEnd = Math.max(
    ...others
      .map((other) => windowOf(other).end)
      .filter((end) => end <= window.start)
  )
  if (lastEnd + MIN_REST_MINUTES > window.start)
    return `Descanso mínimo hasta ${clockOf(lastEnd + MIN_REST_MINUTES)}`
  // 5. Límite de horas del mes con este vuelo, en horas completas (como se muestran).
  if (
    Math.floor(
      (member.monthHours * 60 + durationOf(stored.departure, stored.arrival)) /
        60
    ) > MONTHLY_LIMIT_HOURS
  )
    return `Superaría el límite de ${MONTHLY_LIMIT_HOURS} h del mes`
  // 6. Ausencias y vacaciones.
  const absence = member.absences?.find(({ day }) => day === stored.day)
  if (absence)
    return absence.kind === "vacaciones" ? "De vacaciones" : "Ausente ese día"
  // 7. Otro vuelo que se cruza.
  const crossing = others.find((other) => crosses(other, stored))
  if (crossing)
    return `Ya asignado a ${crossing.flightNumber}, que se cruza en horario`
  // 8. Inglés OACI nivel 4 para los pilotos en vuelos internacionales.
  if (
    scopeOf(stored) === "internacional" &&
    PILOT_ROLES.includes(role) &&
    !member.icaoEnglish4
  )
    return "Sin inglés OACI nivel 4 (vuelo internacional)"
  return null
}

const summaryOf = (member: CrewMember, family: Family) =>
  `Habilitado en ${family} · ${member.monthHours} h de ${MONTHLY_LIMIT_HOURS} este mes · descanso cumplido`

// Quien ya ocupa un puesto del vuelo (incluido el que se cambia) no sale en ninguna lista.
const candidatesFor = (stored: StoredFlight, slot: StoredSlot) => {
  const occupants = stored.slots.map((item) => item.assignment?.crewId)
  const ranks = RANKS_FOR_ROLE[slot.role]
  const eligible: CrewMember[] = []
  const ineligible: { member: CrewMember; reason: string }[] = []
  for (const member of CREW) {
    if (!ranks.includes(member.rank) || occupants.includes(member.id)) continue
    const reason = reasonFor(member, stored, slot.role)
    if (reason) ineligible.push({ member, reason })
    else eligible.push(member)
  }
  // Más margen de horas primero.
  eligible.sort((a, b) => a.monthHours - b.monthHours)
  return { eligible, ineligible }
}

// --- Lectura y respuesta ---

const statusOf = (stored: StoredFlight): FlightStatus => {
  if (stored.confirmed) return "confirmada"
  const covered = stored.slots.filter((slot) => slot.assignment).length
  if (covered === 0) return "sin_asignar"
  return covered < stored.slots.length ? "incompleta" : "completa"
}

const memberOf = (crewId: string) => {
  const member = CREW.find((item) => item.id === crewId)
  if (!member) throw new Error(`Tripulante ${crewId} no encontrado`)
  return member
}

const toPlannedFlight = (stored: StoredFlight): PlannedFlight => {
  const aircraft = AIRCRAFT[stored.registration]
  const minutes = durationOf(stored.departure, stored.arrival)
  return {
    id: stored.id,
    flightNumber: stored.flightNumber,
    date: dateOf(stored.day),
    origin: AIRPORTS.BOG,
    destination: AIRPORTS[stored.destination],
    departureUtc: stored.departure,
    arrivalUtc: stored.arrival,
    arrivesNextDay: minutesOf(stored.arrival) < minutesOf(stored.departure),
    durationMinutes: minutes,
    scope: scopeOf(stored),
    aircraft: {
      model: aircraft.model,
      family: aircraft.family,
      registration: stored.registration,
      seats: aircraft.seats,
    },
    minimumCrew: {
      pilots: stored.slots.filter((slot) => PILOT_ROLES.includes(slot.role))
        .length,
      cabin: Math.ceil(aircraft.seats / 50),
    },
    slots: stored.slots.map(({ assignment, ...slot }) => {
      if (!assignment) return { ...slot, assignee: null }
      const member = memberOf(assignment.crewId)
      return {
        ...slot,
        assignee: {
          crewId: member.id,
          fullName: member.fullName,
          summary: summaryOf(member, aircraft.family),
          source: assignment.source,
          rationale: assignment.rationale,
        },
      }
    }),
    status: statusOf(stored),
  }
}

const findFlight = (flightId: string) => {
  const stored = FLIGHTS.find((item) => item.id === flightId)
  if (!stored) throw new Error(`Vuelo ${flightId} no encontrado`)
  return stored
}

const findSlot = (stored: StoredFlight, slotId: string) => {
  const slot = stored.slots.find((item) => item.id === slotId)
  if (!slot) throw new Error(`Puesto ${slotId} no encontrado`)
  return slot
}

const assertEditable = (stored: StoredFlight) => {
  if (stored.confirmed) throw new Error("La tripulación ya está confirmada.")
}

// Simula la latencia de la red. Cada respuesta es una copia: modificarla no cambia los datos.
const respond = <T>(compute: () => T): Promise<T> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(structuredClone(compute()))
      } catch (error) {
        reject(error)
      }
    }, LATENCY_MS)
  })

// --- Acciones ---

// Los 7 días desde hoy, con sus vuelos y cuántos faltan por confirmar.
export const getScheduleDays = (): Promise<ScheduleDay[]> =>
  respond(() =>
    Array.from({ length: SCHEDULE_DAYS }, (_, day) => {
      const flights = FLIGHTS.filter((stored) => stored.day === day)
      return {
        date: dateOf(day),
        flightCount: flights.length,
        pendingCount: flights.filter((stored) => !stored.confirmed).length,
      }
    })
  )

// Vuelos de un día, ordenados por salida.
export const getDayFlights = (date: string): Promise<PlannedFlight[]> =>
  respond(() =>
    FLIGHTS.filter((stored) => dateOf(stored.day) === date)
      .sort((a, b) => minutesOf(a.departure) - minutesOf(b.departure))
      .map(toPlannedFlight)
  )

export const getSlotCandidates = (
  flightId: string,
  slotId: string
): Promise<SlotCandidates> =>
  respond(() => {
    const stored = findFlight(flightId)
    const { family } = AIRCRAFT[stored.registration]
    const { eligible, ineligible } = candidatesFor(
      stored,
      findSlot(stored, slotId)
    )
    return {
      eligible: eligible.map((member) => ({
        crewId: member.id,
        fullName: member.fullName,
        summary: summaryOf(member, family),
      })),
      ineligible: ineligible.map(({ member, reason }) => ({
        crewId: member.id,
        fullName: member.fullName,
        reason,
      })),
    }
  })

// Asigna a mano. Si la persona no cumple, rechaza con el motivo.
export const assignCrew = (
  flightId: string,
  slotId: string,
  crewId: string
): Promise<PlannedFlight> =>
  respond(() => {
    const stored = findFlight(flightId)
    assertEditable(stored)
    const slot = findSlot(stored, slotId)
    const member = memberOf(crewId)
    if (!RANKS_FOR_ROLE[slot.role].includes(member.rank))
      throw new Error("No tiene el rango para este puesto.")
    if (stored.slots.some((item) => item.assignment?.crewId === crewId))
      throw new Error("Ya ocupa un puesto en este vuelo.")
    const reason = reasonFor(member, stored, slot.role)
    if (reason) throw new Error(reason)
    slot.assignment = { crewId, source: "manual", rationale: null }
    return toPlannedFlight(stored)
  })

export const unassignCrew = (
  flightId: string,
  slotId: string
): Promise<PlannedFlight> =>
  respond(() => {
    const stored = findFlight(flightId)
    assertEditable(stored)
    findSlot(stored, slotId).assignment = null
    return toPlannedFlight(stored)
  })

// La IA simulada: para cada puesto vacío, en orden, elige al elegible con más margen de horas.
export const suggestCrew = (flightId: string): Promise<PlannedFlight> =>
  respond(() => {
    const stored = findFlight(flightId)
    assertEditable(stored)
    let suggested = 0
    for (const slot of stored.slots) {
      if (slot.assignment) continue
      const [best] = candidatesFor(stored, slot).eligible
      if (!best) continue
      slot.assignment = {
        crewId: best.id,
        source: "ia",
        rationale: `Cumple todas las reglas y es quien tiene más margen de horas este mes (${best.monthHours} h de ${MONTHLY_LIMIT_HOURS}).`,
      }
      suggested += 1
    }
    if (suggested === 0)
      throw new Error("Nadie cumple las reglas para los puestos vacíos.")
    return toPlannedFlight(stored)
  })

// Confirma la tripulación y avisa a cada tripulante. Solo con todos los puestos cubiertos.
export const confirmFlightCrew = (flightId: string): Promise<PlannedFlight> =>
  respond(() => {
    const stored = findFlight(flightId)
    assertEditable(stored)
    if (statusOf(stored) !== "completa")
      throw new Error("La tripulación no está completa.")
    stored.confirmed = true
    return toPlannedFlight(stored)
  })
