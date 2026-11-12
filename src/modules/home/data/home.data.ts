import type {
  CrewStatus,
  NextFlight,
  ReplacementRequest,
} from "@/modules/home/types/home.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.

export const getCrewStatus = (): Promise<CrewStatus> =>
  Promise.resolve({
    base: "BOG / SKBO",
    operationalCondition: "Nivel Óptimo",
    availability: "disponible",
  })

export const getUrgentReplacementRequest =
  (): Promise<ReplacementRequest | null> =>
    Promise.resolve({
      flightNumber: "AV-9344",
      timeRemaining: "T-11:42",
      origin: { code: "BOG", name: "Bogotá El Dorado" },
      destination: { code: "MIA", name: "Miami Intl" },
      departureUtc: "16:15",
      departureLocal: "11:15",
      aircraft: "Airbus A320neo",
      position: "Primer Oficial (Copiloto)",
      estimatedDuration: "3h 50m",
      reason: "Incapacidad médica sobrevenida de tripulante titular.",
      requestedBy: "Supervisora Camila Restrepo (OCC Central)",
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
    })

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
