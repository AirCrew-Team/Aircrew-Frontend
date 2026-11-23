import {
  getMyAbsences,
  getMyAssignments,
  getMyFlightMetrics,
} from "@/App/actions/flights/flights.actions"
import type {
  ApiCrewRole,
  ApiFlightAssignment,
  ApiFlightStatus,
  ApiMyAbsenceFlight,
} from "@/App/types/flights.types"
import type {
  CrewFlight,
  FlightAbsences,
  FlightAirport,
  FlightMetrics,
  ReleasedFlight,
} from "@/modules/flights/types/flights.types"
import { withDemo } from "@/modules/shared/session/demoSession"

const BOG: FlightAirport = { code: "BOG", city: "Bogotá", icao: "SKBO" }
const MIA: FlightAirport = { code: "MIA", city: "Miami", icao: "KMIA" }
const CLO: FlightAirport = { code: "CLO", city: "Cali", icao: "SKCL" }
const MDE: FlightAirport = { code: "MDE", city: "Medellín", icao: "SKRG" }

const FIRST_OFFICER = {
  label: "Rol Asignado",
  value: "Primer Oficial",
  note: "Copiloto",
}

// Datos de ejemplo (cuenta demo). Traen todos los meses: el mes y la búsqueda se filtran
// en el cliente.
const demoFlightMetrics = (): Promise<FlightMetrics> =>
  Promise.resolve({
    fdp: {
      usedHours: 45,
      maxHours: 90,
      regulation: "RAC 121.465",
      cycleClosesInDays: 12,
    },
    rest: {
      guaranteed: "16h 20m",
      status: "Conforme",
      note: "Mínimo legal de 12h cumplido ampliamente tras AV-9102",
      endsAt: "Hoy, 14:15 UTC (Presentación)",
    },
    month: {
      label: "Octubre 2024",
      completedSectors: 18,
      crewDelays: 0,
      domestic: 14,
      international: 4,
      internationalLabel: "Troncales MIA/LIM",
    },
  })

const demoUpcomingFlights = (): Promise<CrewFlight[]> =>
  Promise.resolve([
    {
      id: "AV-9344",
      flightNumber: "AV-9344",
      status: "reemplazo",
      month: "2024-10",
      origin: BOG,
      destination: MIA,
      duration: "3h 55m",
      routeType: "Directo",
      departure: {
        label: "Fecha y Salida",
        value: "Hoy, 16:15 UTC",
        note: "11:15 Local",
      },
      aircraft: { label: "Equipo", value: "Airbus A320neo", note: "HK-5388" },
      role: FIRST_OFFICER,
      milestone: {
        label: "Terminal / Puerta",
        value: "T1 • Puerta B12",
        note: "Abordaje 15:35",
      },
      dispatch: "Despacho Autorizado (BOG OCC)",
      captain: "Cpt. Hernán Morales",
      note: "Combustible Plan: 9.420 kg",
      aside: "Tiempo para Presentación: 0h 45m",
      details: [
        { label: "Jefe de Cabina", value: "Mariana Santos + 3 TCPs" },
        { label: "Ruta Plan", value: "W19 / MNX / DCT / SKBO-KMIA" },
        { label: "METAR SKBO", value: "12008KT 9999 FEW018 17/11 Q1024" },
        {
          label: "Descanso Post-Vuelo",
          value: "18h en KMIA · Retorno AV-9345 día siguiente",
        },
      ],
    },
    {
      id: "AV-8520",
      flightNumber: "AV-8520",
      status: "programado",
      month: "2024-10",
      origin: BOG,
      destination: CLO,
      duration: "0h 58m",
      routeType: "Nacional",
      departure: {
        label: "Fecha y Salida",
        value: "Dom 20 Oct, 07:15 UTC",
        note: "02:15 Local",
      },
      aircraft: {
        label: "Equipo",
        value: "Airbus A320",
        note: "Matrícula TBD",
      },
      role: FIRST_OFFICER,
      milestone: {
        label: "Estado Check-in",
        value: "En 41h",
        note: "Abre Sáb 07:15",
      },
      dispatch: "Itinerario Confirmado RAC 121",
      captain: "Cpt. Mauricio Restrepo",
      note: "Retorno asignado: AV-8521 (CLO-BOG)",
      aside: "Roster Ciclo W42",
      details: [
        { label: "Jefe de Cabina", value: "Andrea Ruiz + 3 TCPs" },
        { label: "Ruta Plan", value: "UL780 / SKCL" },
        { label: "Retorno Asignado", value: "AV-8521 (CLO-BOG) · 10:05 UTC" },
      ],
    },
    {
      id: "AV-9210",
      flightNumber: "AV-9210",
      status: "programado",
      month: "2024-10",
      origin: BOG,
      destination: MDE,
      duration: "0h 50m",
      routeType: "Nacional",
      departure: {
        label: "Fecha y Salida",
        value: "Mar 22 Oct, 14:30 UTC",
        note: "09:30 Local",
      },
      aircraft: {
        label: "Equipo",
        value: "Airbus A320",
        note: "Matrícula TBD",
      },
      role: FIRST_OFFICER,
      milestone: {
        label: "Despacho de Vuelo",
        value: "Pendiente despacho",
        note: "Disponible T-12h",
      },
      dispatch: "Plan Preliminar Generado",
      captain: "Por Asignar",
      note: "Nivel de Vuelo crucero estimado: FL240",
      aside: "Roster Ciclo W42",
      details: [
        { label: "Jefe de Cabina", value: "Por asignar" },
        { label: "Nivel de Vuelo", value: "FL240 (estimado)" },
        { label: "Despacho", value: "Disponible T-12h" },
      ],
    },
  ])

// Comunes a todo el historial: estado, rol, cuarto dato «Bloque Real», despacho y nota.
const completed = (flight: {
  flightNumber: string
  month: string
  origin: FlightAirport
  destination: FlightAirport
  routeType: string
  departure: { value: string; note: string }
  aircraft: { value: string; note: string }
  block: { value: string; note: string }
  captain: string
  aside: string
  details: { label: string; value: string }[]
}): CrewFlight => ({
  id: flight.flightNumber,
  flightNumber: flight.flightNumber,
  status: "completado",
  month: flight.month,
  origin: flight.origin,
  destination: flight.destination,
  duration: flight.block.value,
  routeType: flight.routeType,
  departure: { label: "Fecha y Salida", ...flight.departure },
  aircraft: { label: "Equipo", ...flight.aircraft },
  role: FIRST_OFFICER,
  milestone: { label: "Bloque Real", ...flight.block },
  dispatch: "Vuelo Completado",
  captain: flight.captain,
  note: "Sin demoras atribuibles",
  aside: flight.aside,
  details: flight.details,
})

// Del más reciente al más antiguo.
const demoFlightHistory = (): Promise<CrewFlight[]> =>
  Promise.resolve([
    completed({
      flightNumber: "AV-9102",
      month: "2024-10",
      origin: MIA,
      destination: BOG,
      routeType: "Directo",
      departure: { value: "Jue 17 Oct, 21:40 UTC", note: "16:40 Local" },
      aircraft: { value: "Airbus A320neo", note: "HK-5388" },
      block: { value: "3h 48m", note: "Llegada 01:28 UTC" },
      captain: "Cpt. Hernán Morales",
      aside: "Roster Ciclo W42",
      details: [
        { label: "Jefe de Cabina", value: "Mariana Santos + 3 TCPs" },
        { label: "Combustible Usado", value: "8.960 kg" },
      ],
    }),
    completed({
      flightNumber: "AV-9101",
      month: "2024-10",
      origin: BOG,
      destination: MIA,
      routeType: "Directo",
      departure: { value: "Jue 17 Oct, 12:10 UTC", note: "07:10 Local" },
      aircraft: { value: "Airbus A320neo", note: "HK-5388" },
      block: { value: "3h 52m", note: "Llegada 16:02 UTC" },
      captain: "Cpt. Hernán Morales",
      aside: "Roster Ciclo W42",
      details: [
        { label: "Jefe de Cabina", value: "Mariana Santos + 3 TCPs" },
        { label: "Combustible Usado", value: "9.180 kg" },
      ],
    }),
    completed({
      flightNumber: "AV-8517",
      month: "2024-10",
      origin: CLO,
      destination: BOG,
      routeType: "Nacional",
      departure: { value: "Lun 14 Oct, 19:05 UTC", note: "14:05 Local" },
      aircraft: { value: "Airbus A320", note: "HK-5271" },
      block: { value: "0h 56m", note: "Llegada 20:01 UTC" },
      captain: "Cpt. Mauricio Restrepo",
      aside: "Roster Ciclo W42",
      details: [
        { label: "Jefe de Cabina", value: "Andrea Ruiz + 3 TCPs" },
        { label: "Combustible Usado", value: "2.840 kg" },
      ],
    }),
    completed({
      flightNumber: "AV-8516",
      month: "2024-10",
      origin: BOG,
      destination: CLO,
      routeType: "Nacional",
      departure: { value: "Lun 14 Oct, 16:20 UTC", note: "11:20 Local" },
      aircraft: { value: "Airbus A320", note: "HK-5271" },
      block: { value: "0h 57m", note: "Llegada 17:17 UTC" },
      captain: "Cpt. Mauricio Restrepo",
      aside: "Roster Ciclo W42",
      details: [
        { label: "Jefe de Cabina", value: "Andrea Ruiz + 3 TCPs" },
        { label: "Combustible Usado", value: "2.910 kg" },
      ],
    }),
    completed({
      flightNumber: "AV-9221",
      month: "2024-09",
      origin: MDE,
      destination: BOG,
      routeType: "Nacional",
      departure: { value: "Vie 27 Sep, 22:15 UTC", note: "17:15 Local" },
      aircraft: { value: "Airbus A320", note: "HK-5402" },
      block: { value: "0h 49m", note: "Llegada 23:04 UTC" },
      captain: "Cpt. Laura Gómez",
      aside: "Roster Ciclo W39",
      details: [
        { label: "Jefe de Cabina", value: "Paula Herrera + 3 TCPs" },
        { label: "Combustible Usado", value: "2.450 kg" },
      ],
    }),
    completed({
      flightNumber: "AV-9220",
      month: "2024-09",
      origin: BOG,
      destination: MDE,
      routeType: "Nacional",
      departure: { value: "Vie 27 Sep, 19:30 UTC", note: "14:30 Local" },
      aircraft: { value: "Airbus A320", note: "HK-5402" },
      block: { value: "0h 51m", note: "Llegada 20:21 UTC" },
      captain: "Cpt. Laura Gómez",
      aside: "Roster Ciclo W39",
      details: [
        { label: "Jefe de Cabina", value: "Paula Herrera + 3 TCPs" },
        { label: "Combustible Usado", value: "2.520 kg" },
      ],
    }),
  ])

// --- Sesión real (FE-4): GET /flights/assignments/me, /crew/crew-members/me/metrics y
// /crew/absences/me. Lo que el backend no tiene (comandante, ICAO, despacho, notas de la
// demo) no se muestra.

// Sin Intl: según la versión de ICU daría «lun.» o «nov.» con punto.
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
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const ROLE_LABEL: Record<ApiCrewRole, string> = {
  captain: "Comandante",
  first_officer: "Primer Oficial",
  purser: "Jefe de Cabina",
  flight_attendant: "Auxiliar de Vuelo",
}

const DISPATCH_LABEL: Record<ApiFlightStatus, string> = {
  scheduled: "Vuelo programado",
  delayed: "Vuelo demorado",
  in_flight: "En vuelo",
  completed: "Vuelo completado",
  cancelled: "Vuelo cancelado",
}

// 295 → «4h 55m».
const formatMinutes = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`

// «2026-11-23T16:15:00.000Z» → «16:15».
const utcClock = (iso: string) => new Date(iso).toISOString().slice(11, 16)

// «2026-11-23T16:15:00.000Z» → «Lun 23 Nov, 16:15 UTC».
const formatUtc = (iso: string) => {
  const date = new Date(iso)
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]}, ${utcClock(iso)} UTC`
}

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

// «2026-01» con la fecha local, la misma del selector de meses.
const localMonth = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

const toCrewFlight = (
  { flight, aircraft, ...assignment }: ApiFlightAssignment,
  completed: boolean
): CrewFlight => {
  const duration = formatMinutes(flight.block_minutes)
  const local = localClock(flight.departure_at, flight.origin_timezone)
  const replacement = assignment.is_replacement ? assignment.replacement : null
  return {
    id: flight.id,
    flightNumber: flight.flight_number,
    status: completed
      ? "completado"
      : assignment.is_replacement
        ? "reemplazo"
        : "programado",
    // Mes local, el del selector (se pide al backend con from/to).
    month: localMonth(flight.departure_at),
    origin: { code: flight.origin, city: flight.origin_city ?? "", icao: null },
    destination: {
      code: flight.destination,
      city: flight.destination_city ?? "",
      icao: null,
    },
    duration,
    routeType: flight.scope === "international" ? "Internacional" : "Nacional",
    departure: {
      label: "Fecha y Salida",
      value: formatUtc(flight.departure_at),
      note: local ? `${local} Local` : "",
    },
    aircraft: {
      label: "Equipo",
      value: aircraft.name ?? aircraft.family ?? "Por asignar",
      note: aircraft.registration ?? "",
    },
    role: {
      label: "Rol Asignado",
      value: ROLE_LABEL[assignment.role],
      note: assignment.is_replacement ? "Reemplazo" : "Titular",
    },
    milestone: completed
      ? {
          label: "Bloque programado",
          value: duration,
          note: `Llegada ${utcClock(flight.arrival_at)} UTC`,
        }
      : {
          label: "Puerta",
          value: flight.gate ? `Puerta ${flight.gate}` : "Por asignar",
          note: "",
        },
    dispatch: DISPATCH_LABEL[flight.status],
    captain: null,
    note: replacement?.reason
      ? `Motivo del reemplazo: ${replacement.reason}`
      : null,
    aside:
      completed || !assignment.is_replacement
        ? null
        : assignment.acknowledged
          ? "Reemplazo confirmado"
          : "Pendiente de «Enterado»",
    details: [
      { label: "Origen", value: flight.origin_name ?? flight.origin },
      {
        label: "Destino",
        value: flight.destination_name ?? flight.destination,
      },
      { label: "Llegada programada", value: formatUtc(flight.arrival_at) },
      ...(replacement?.approved_by
        ? [{ label: "Aprobado por", value: replacement.approved_by }]
        : []),
    ],
  }
}

// Los cancelados no se listan (el backend los deja en el historial si ya pasó su hora).
// El mes «AAAA-MM» es local: se pide su rango en ISO (to exclusivo), porque el month del
// backend cuenta en UTC y la última noche del mes perdería los vuelos de esa noche. El
// backend da los vuelos por salida; el historial va del más reciente al más antiguo.
const flightsFromApi =
  (status: "upcoming" | "completed") => async (month: string) => {
    const [year, monthNumber] = month.split("-").map(Number)
    const flights = (
      await getMyAssignments({
        status,
        from: new Date(year, monthNumber - 1, 1).toISOString(),
        to: new Date(year, monthNumber, 1).toISOString(),
      })
    )
      .filter((assignment) => assignment.flight.status !== "cancelled")
      .map((assignment) => toCrewFlight(assignment, status === "completed"))
    return status === "completed" ? flights.toReversed() : flights
  }

// Días desde hoy (medianoche local) hasta «AAAA-MM-DD».
const daysUntil = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Math.round: un cambio de horario deja la diferencia a una hora de un día entero.
  return Math.round(
    (new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000
  )
}

const flightMetricsFromApi = async (): Promise<FlightMetrics> => {
  const { month, fdp, rest, sectors } = await getMyFlightMetrics()
  const [year, monthNumber] = month.split("-").map(Number)
  const closesIn = daysUntil(fdp.cycle_closes_on)
  return {
    fdp: {
      usedHours: fdp.used_hours,
      maxHours: fdp.max_hours,
      regulation: fdp.regulation,
      cycleClosesInDays: closesIn >= 0 ? closesIn : null,
    },
    rest: {
      guaranteed: formatMinutes(rest.guaranteed_minutes),
      status:
        rest.rest_ends_at === null
          ? "Sin datos"
          : new Date(rest.rest_ends_at).getTime() > Date.now()
            ? "En descanso"
            : "Cumplido",
      note: rest.last_duty_end_at
        ? `Último vuelo terminado: ${formatUtc(rest.last_duty_end_at)}`
        : "Sin vuelos registrados.",
      endsAt: rest.rest_ends_at ? formatUtc(rest.rest_ends_at) : "—",
    },
    month: {
      label: `${MONTH_NAMES[monthNumber - 1]} ${year}`,
      completedSectors: sectors.completed,
      crewDelays: sectors.crew_delays,
      domestic: sectors.domestic,
      international: sectors.international,
      internationalLabel: "Internacionales",
    },
  }
}

// Ausencias propias (la más reciente primero; manda la primera de cada vuelo). Las
// canceladas no cuentan. Con el reemplazo aprobado (pending_ack) o confirmado (covered) la
// asignación pasa a replaced y el vuelo ya no sale en assignments/me: va a «released» si
// aún no ha salido. Cualquier otro estado deja el vuelo asignado con «En revisión».
const flightAbsencesFromApi = async (): Promise<FlightAbsences> => {
  const marks: Record<string, string> = {}
  const released: { departureAt: number; flight: ReleasedFlight }[] = []
  const seen = new Set<string>()
  const now = Date.now()
  const add = (id: string, flight: ApiMyAbsenceFlight) => {
    const { flight_id: flightId, status } = flight
    if (!flightId || status === "cancelled" || seen.has(flightId)) return
    seen.add(flightId)
    if (status !== "pending_ack" && status !== "covered") {
      marks[flightId] = "En revisión"
      return
    }
    const departureAt = flight.departure_at
      ? new Date(flight.departure_at).getTime()
      : Number.NaN
    if (!flight.departure_at || !flight.flight_number || !(departureAt > now))
      return
    released.push({
      departureAt,
      flight: {
        id,
        flightNumber: flight.flight_number,
        origin: flight.origin ?? "—",
        destination: flight.destination ?? "—",
        departure: formatUtc(flight.departure_at),
        status,
      },
    })
  }
  for (const absence of await getMyAbsences()) {
    add(absence.id, absence)
    for (const flight of absence.flights) add(flight.id, flight)
  }
  return {
    marks,
    released: released
      .toSorted((a, b) => a.departureAt - b.departureAt)
      .map(({ flight }) => flight),
  }
}

// La cuenta demo usa los datos de ejemplo; la sesión real, el backend.
export const getFlightMetrics = withDemo(
  flightMetricsFromApi,
  demoFlightMetrics
)
export const getUpcomingFlights = withDemo(
  flightsFromApi("upcoming"),
  demoUpcomingFlights
)
export const getFlightHistory = withDemo(
  flightsFromApi("completed"),
  demoFlightHistory
)
// La demo no tiene ausencias propias.
export const getFlightAbsences = withDemo(
  flightAbsencesFromApi,
  (): Promise<FlightAbsences> => Promise.resolve({ marks: {}, released: [] })
)
