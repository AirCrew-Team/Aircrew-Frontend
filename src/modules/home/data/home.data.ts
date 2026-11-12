import type {
  CrewStatus,
  NextFlight,
  ReplacementAssignment,
} from "@/modules/home/types/home.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.

export const getCrewStatus = (): Promise<CrewStatus> =>
  Promise.resolve({
    base: "BOG / SKBO",
    operationalCondition: "Nivel Óptimo",
    availability: "disponible",
  })

// La lista llega ordenada, la más próxima primero (contrato del backend futuro).
export const getReplacementAssignments = (): Promise<ReplacementAssignment[]> =>
  Promise.resolve([
    {
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

export const getNextFlight = (): Promise<NextFlight> =>
  Promise.resolve({
    flightNumber: "AV-8520",
    dayLabel: "Mañana",
    origin: { code: "BOG", name: "Bogotá El Dorado" },
    destination: { code: "CLO", name: "Cali Alfonso Bonilla Aragón" },
    departureUtc: "07:15",
    gate: "B4",
    flightRole: "Copiloto Activo",
  })
