import type {
  CrewFlight,
  FlightAirport,
  FlightMetrics,
} from "@/modules/flights/types/flights.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.
// Hoy devuelven todos los vuelos; el mes y la búsqueda se filtran en el cliente.

const BOG: FlightAirport = { code: "BOG", city: "Bogotá", icao: "SKBO" }
const MIA: FlightAirport = { code: "MIA", city: "Miami", icao: "KMIA" }
const CLO: FlightAirport = { code: "CLO", city: "Cali", icao: "SKCL" }
const MDE: FlightAirport = { code: "MDE", city: "Medellín", icao: "SKRG" }

const FIRST_OFFICER = {
  label: "Rol Asignado",
  value: "Primer Oficial",
  note: "Copiloto",
}

export const getFlightMetrics = (): Promise<FlightMetrics> =>
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
    },
  })

export const getUpcomingFlights = (): Promise<CrewFlight[]> =>
  Promise.resolve([
    {
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
export const getFlightHistory = (): Promise<CrewFlight[]> =>
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
