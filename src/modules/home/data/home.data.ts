import {
  acknowledgeAssignment,
  getMyAssignments,
  getMyNextAssignment,
} from "@/App/actions/flights/flights.actions"
import {
  getMyCrewMember,
  type CrewMemberStatus,
} from "@/App/actions/profile/profile.actions"
import type {
  ApiCrewRole,
  ApiFlightAssignment,
} from "@/App/types/flights.types"
import type {
  CrewStatus,
  NextFlight,
  ReplacementAssignment,
} from "@/modules/home/types/home.types"
import { withDemo } from "@/modules/shared/session/demoSession"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.

export const getCrewStatus = (): Promise<CrewStatus> =>
  Promise.resolve({
    base: "BOG / SKBO",
    operationalCondition: "Nivel Óptimo",
    availability: "disponible",
  })

const CONDITION_LABELS: Record<CrewMemberStatus, string> = {
  available: "Disponible",
  on_duty: "En servicio",
  in_flight: "En vuelo",
  medical_leave: "Incapacidad médica",
  vacation: "Vacaciones",
}

// Sesión real: el estado sale de GET /api/crew/crew-members/me.
export const getMyCrewStatus = async (): Promise<CrewStatus> => {
  const { current_location, status } = await getMyCrewMember()
  return {
    base: current_location,
    operationalCondition: CONDITION_LABELS[status],
    availability:
      status === "medical_leave"
        ? "incapacitado"
        : status === "vacation"
          ? "vacaciones"
          : "disponible",
  }
}

// Datos de ejemplo (cuenta demo). La lista llega ordenada, la más próxima primero.
const demoReplacementAssignments = (): Promise<ReplacementAssignment[]> =>
  Promise.resolve([
    {
      id: "AV-9344",
      flightNumber: "AV-9344",
      dayLabel: "Hoy",
      origin: { code: "BOG", name: "Bogotá El Dorado" },
      destination: { code: "MIA", name: "Miami Intl" },
      departureUtc: "16:15",
      departureLocal: "11:15",
      aircraft: "Airbus A320neo",
      position: "Primer Oficial (Copiloto)",
      estimatedDuration: "3h 50m",
      reason: "Incapacidad médica sobrevenida de tripulante titular.",
      approvedBy: "Supervisora Camila Restrepo (OCC Central)",
      compliance: "Cumple límites RAC 121 / Descanso Reglamentario.",
      details: [
        {
          label: "Tripulación a bordo",
          value: "Comandante: Cap. Carlos Mendivelso",
          note: "Jefe de Cabina: Mariana Santos + 3 TCPs",
        },
        {
          label: "Descanso post-vuelo",
          value: "Descanso garantizado: 18h en KMIA",
          note: "Retorno asignado: AV-9345 día siguiente",
        },
      ],
    },
    {
      id: "AV-9478",
      flightNumber: "AV-9478",
      dayLabel: "Mañana",
      origin: { code: "BOG", name: "Bogotá El Dorado" },
      destination: { code: "MDE", name: "Medellín José María Córdova" },
      departureUtc: "13:40",
      departureLocal: "08:40",
      aircraft: "Airbus A320neo",
      position: "Primer Oficial (Copiloto)",
      estimatedDuration: "1h 05m",
      reason: "Reprogramación por descanso reglamentario del titular.",
      approvedBy: "Supervisor Andrés Pardo (OCC Central)",
      compliance: "Cumple límites RAC 121 / Descanso Reglamentario.",
      details: [
        {
          label: "Tripulación a bordo",
          value: "Comandante: Cap. Laura Gómez",
          note: "Jefe de Cabina: Diego Ruiz + 2 TCPs",
        },
        {
          label: "Descanso post-vuelo",
          value: "Descanso garantizado: 12h en SKRG",
          note: "Retorno asignado: AV-9479 mismo día",
        },
      ],
    },
  ])

const demoNextFlight = (): Promise<NextFlight | null> =>
  Promise.resolve({
    flightNumber: "AV-8520",
    dayLabel: "Mañana",
    origin: { code: "BOG", name: "Bogotá El Dorado" },
    destination: { code: "CLO", name: "Cali Alfonso Bonilla Aragón" },
    departureUtc: "07:15",
    gate: "B4",
    flightRole: "Copiloto Activo",
  })

// --- Sesión real (FE-4): GET /flights/assignments/me/next y
// /flights/assignments/me?replacement=true&acknowledged=false.

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const SHORT_MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

const ROLE_LABEL: Record<ApiCrewRole, string> = {
  captain: "Comandante",
  first_officer: "Primer Oficial",
  purser: "Jefe de Cabina",
  flight_attendant: "Auxiliar de Vuelo",
}

// «2026-11-23T16:15:00.000Z» → «16:15».
const utcClock = (iso: string) => new Date(iso).toISOString().slice(11, 16)

// Hora «HH:MM» en la zona del aeropuerto; null sin zona o con una zona que no existe.
const localClock = (iso: string, timeZone: string | null) => {
  if (!timeZone) return null
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso))
  } catch {
    return null
  }
}

// «Hoy», «Mañana» o «Lun 23 Nov», con el día local del dispositivo.
const dayLabel = (iso: string) => {
  const date = new Date(iso)
  const now = new Date()
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  if (days === 0) return "Hoy"
  if (days === 1) return "Mañana"
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
}

// 295 → «4h 55m».
const formatMinutes = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`

const airport = (code: string, name: string | null, city: string | null) => ({
  code,
  name: name ?? city ?? code,
})

const nextFlightFromApi = async (): Promise<NextFlight | null> => {
  const assignment = await getMyNextAssignment()
  if (!assignment) return null
  const { flight } = assignment
  return {
    flightNumber: flight.flight_number,
    dayLabel: dayLabel(flight.departure_at),
    origin: airport(flight.origin, flight.origin_name, flight.origin_city),
    destination: airport(
      flight.destination,
      flight.destination_name,
      flight.destination_city
    ),
    departureUtc: utcClock(flight.departure_at),
    gate: flight.gate,
    flightRole: ROLE_LABEL[assignment.role],
  }
}

// El backend no trae la tripulación a bordo ni el descanso: el detalle lleva la llegada y
// el plazo para dar «Enterado».
const toReplacementAssignment = ({
  id,
  role,
  replacement,
  flight,
  aircraft,
}: ApiFlightAssignment): ReplacementAssignment => {
  const deadline = replacement?.deadline_at
  return {
    id,
    flightNumber: flight.flight_number,
    dayLabel: dayLabel(flight.departure_at),
    origin: airport(flight.origin, flight.origin_name, flight.origin_city),
    destination: airport(
      flight.destination,
      flight.destination_name,
      flight.destination_city
    ),
    departureUtc: utcClock(flight.departure_at),
    departureLocal: localClock(flight.departure_at, flight.origin_timezone),
    aircraft: aircraft.name ?? aircraft.family ?? "Aeronave por asignar",
    position: ROLE_LABEL[role],
    estimatedDuration: formatMinutes(flight.block_minutes),
    reason: replacement?.reason ?? "",
    approvedBy: replacement?.approved_by ?? null,
    compliance: "",
    details: [
      {
        label: "Llegada programada",
        value: `${utcClock(flight.arrival_at)} UTC`,
        note: dayLabel(flight.arrival_at),
      },
      ...(deadline
        ? [
            {
              label: "Confirma antes de",
              value: `${dayLabel(deadline)}, ${utcClock(deadline)} UTC`,
              note: "Pulsa «Enterado» para confirmar que cubrirás el vuelo.",
            },
          ]
        : []),
    ],
  }
}

const replacementAssignmentsFromApi = async () =>
  (await getMyAssignments({ replacement: true, acknowledged: false })).map(
    toReplacementAssignment
  )

// La cuenta demo usa los datos de ejemplo; la sesión real, el backend.
export const getReplacementAssignments = withDemo(
  replacementAssignmentsFromApi,
  demoReplacementAssignments
)
export const getNextFlight = withDemo(nextFlightFromApi, demoNextFlight)
// «Enterado»: en la demo no se guarda nada (el banner lo recuerda mientras está abierto).
export const acknowledgeReplacement = withDemo(
  (assignmentId: string) => acknowledgeAssignment(assignmentId),
  () => Promise.resolve()
)
