import type {
  Airport,
  Candidate,
  ReplacementRequest,
} from "@/modules/recommendations/types/recommendations.types"

// Datos simulados ("quemados") con la forma de las acciones reales: se moverán a
// App/actions cuando exista la API, y los componentes no tendrán que cambiar.
// Una función por consulta, porque la cola y los candidatos vendrán de servicios distintos.
// Devuelven una promesa, igual que lo hará la petición HTTP real.

const AIRPORTS = {
  BOG: { code: "BOG", name: "Bogotá El Dorado" },
  MIA: { code: "MIA", name: "Miami Intl" },
  CLO: { code: "CLO", name: "Cali Alfonso Bonilla Aragón" },
  MDE: { code: "MDE", name: "Medellín José María Córdova" },
  CTG: { code: "CTG", name: "Cartagena Rafael Núñez" },
  SMR: { code: "SMR", name: "Santa Marta Simón Bolívar" },
} satisfies Record<string, Airport>

// Cola: solicitudes pendientes de aprobación, ya ordenadas por urgencia (contrato del backend).
// Son 5, como el «5 por aprobar» de la tarjeta del Inicio.
export const getPendingReplacementRequests = (): Promise<
  ReplacementRequest[]
> =>
  Promise.resolve([
    {
      id: "DISP-2025-0982",
      flightNumber: "AV-9344",
      origin: AIRPORTS.BOG,
      destination: AIRPORTS.MIA,
      position: "Copiloto A320",
      departureUtc: "16:15",
      timeToDeparture: "1h 45m",
      gate: "C04",
      reason: "Incapacidad médica sobrevenida del F/O titular.",
    },
    {
      id: "DISP-2025-0987",
      flightNumber: "AV-8120",
      origin: AIRPORTS.BOG,
      destination: AIRPORTS.CLO,
      position: "Jefe de Cabina",
      departureUtc: "17:40",
      timeToDeparture: "3h 10m",
      gate: "B12",
      reason: "Calamidad doméstica de la Jefa de Cabina titular.",
    },
    {
      id: "DISP-2025-0990",
      flightNumber: "AV-7741",
      origin: AIRPORTS.BOG,
      destination: AIRPORTS.MDE,
      position: "Tripulante de Cabina",
      departureUtc: "19:30",
      timeToDeparture: "5h 00m",
      gate: "A07",
      reason: "Incapacidad médica de TCP titular.",
    },
    {
      id: "DISP-2025-0993",
      flightNumber: "AV-6612",
      origin: AIRPORTS.BOG,
      destination: AIRPORTS.CTG,
      position: "Comandante",
      departureUtc: "20:50",
      timeToDeparture: "6h 20m",
      gate: "C11",
      reason: "Vencimiento de descanso reglamentario del titular.",
    },
    {
      id: "DISP-2025-0996",
      flightNumber: "AV-5023",
      origin: AIRPORTS.BOG,
      destination: AIRPORTS.SMR,
      position: "Copiloto A320",
      departureUtc: "22:35",
      timeToDeparture: "8h 05m",
      gate: "B03",
      reason: "Reprogramación por cambio de equipo.",
    },
  ])

const CANDIDATES: Record<string, Candidate[]> = {
  "DISP-2025-0982": [
    {
      id: "c-101",
      fullName: "Juan Pablo Navarro",
      rank: "Primer Oficial",
      base: "BOG",
      affinity: 98,
      affinityLabel: "Óptimo",
      checks: [
        "Certificación A320",
        "FDP: +6h disponibles",
        "Descanso cumplido",
      ],
      location: "Standby Casa (Fontibón)",
      minutesToRamp: 25,
      phone: "+57 310 445 8899",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
    {
      id: "c-102",
      fullName: "Mateo Morales",
      rank: "Primer Oficial",
      base: "BOG",
      affinity: 91,
      affinityLabel: "Alta",
      checks: [
        "Certificación A320",
        "FDP: +4h disponibles",
        "Descanso cumplido",
      ],
      location: "Zona Salitre",
      minutesToRamp: 42,
      phone: "+57 311 208 4410",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
    {
      id: "c-103",
      fullName: "Andrés Restrepo",
      rank: "Primer Oficial",
      base: "BOG",
      affinity: 84,
      affinityLabel: "Viable",
      checks: [
        "Certificación A320",
        "FDP: +3h disponibles",
        "Descanso cumplido",
      ],
      location: "Zona Norte",
      minutesToRamp: 55,
      phone: "+57 315 774 0921",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
  ],
  "DISP-2025-0987": [
    {
      id: "c-201",
      fullName: "Laura Gómez",
      rank: "Jefe de Cabina",
      base: "BOG",
      affinity: 95,
      affinityLabel: "Óptimo",
      checks: [
        "Habilitación Jefe de Cabina",
        "FDP: +5h disponibles",
        "Descanso cumplido",
      ],
      location: "Standby Casa (Chapinero)",
      minutesToRamp: 35,
      phone: "+57 312 550 1187",
      radioChannel: "CH-02 OPS BOG (129.40)",
    },
    {
      id: "c-202",
      fullName: "Diego Ruiz",
      rank: "Jefe de Cabina",
      base: "BOG",
      affinity: 88,
      affinityLabel: "Alta",
      checks: [
        "Habilitación Jefe de Cabina",
        "FDP: +4h disponibles",
        "Descanso cumplido",
      ],
      location: "Zona Modelia",
      minutesToRamp: 30,
      phone: "+57 300 918 2264",
      radioChannel: "CH-02 OPS BOG (129.40)",
    },
  ],
  "DISP-2025-0990": [
    {
      id: "c-301",
      fullName: "Valentina Ortiz",
      rank: "Tripulante de Cabina",
      base: "BOG",
      affinity: 93,
      affinityLabel: "Óptimo",
      checks: [
        "Habilitación TCP A320",
        "FDP: +5h disponibles",
        "Descanso cumplido",
      ],
      location: "Standby Casa (Suba)",
      minutesToRamp: 40,
      phone: "+57 318 402 7735",
      radioChannel: "CH-02 OPS BOG (129.40)",
    },
    {
      id: "c-302",
      fullName: "Sebastián Castro",
      rank: "Tripulante de Cabina",
      base: "BOG",
      affinity: 86,
      affinityLabel: "Alta",
      checks: [
        "Habilitación TCP A320",
        "FDP: +4h disponibles",
        "Descanso cumplido",
      ],
      location: "Zona Engativá",
      minutesToRamp: 33,
      phone: "+57 301 665 2390",
      radioChannel: "CH-02 OPS BOG (129.40)",
    },
  ],
  "DISP-2025-0993": [
    {
      id: "c-401",
      fullName: "Carlos Mejía",
      rank: "Comandante",
      base: "BOG",
      affinity: 96,
      affinityLabel: "Óptimo",
      checks: [
        "Certificación A320",
        "FDP: +7h disponibles",
        "Descanso cumplido",
      ],
      location: "Standby Casa (Usaquén)",
      minutesToRamp: 45,
      phone: "+57 310 882 1456",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
    {
      id: "c-402",
      fullName: "Ricardo Peña",
      rank: "Comandante",
      base: "BOG",
      affinity: 89,
      affinityLabel: "Alta",
      checks: [
        "Certificación A320",
        "FDP: +5h disponibles",
        "Descanso cumplido",
      ],
      location: "Zona Cedritos",
      minutesToRamp: 50,
      phone: "+57 314 290 6613",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
  ],
  "DISP-2025-0996": [
    {
      id: "c-501",
      fullName: "Camila Herrera",
      rank: "Primer Oficial",
      base: "BOG",
      affinity: 94,
      affinityLabel: "Óptimo",
      checks: [
        "Certificación A320",
        "FDP: +8h disponibles",
        "Descanso cumplido",
      ],
      location: "Standby Hotel (Aeropuerto)",
      minutesToRamp: 15,
      phone: "+57 316 540 3378",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
    {
      id: "c-502",
      fullName: "Felipe Vargas",
      rank: "Primer Oficial",
      base: "BOG",
      affinity: 87,
      affinityLabel: "Alta",
      checks: [
        "Certificación A320",
        "FDP: +6h disponibles",
        "Descanso cumplido",
      ],
      location: "Zona Fontibón",
      minutesToRamp: 28,
      phone: "+57 320 117 8842",
      radioChannel: "CH-04 OPS BOG (131.85)",
    },
  ],
}

// Candidatos que propone la IA para una solicitud, ya ordenados por afinidad.
export const getRecommendedCandidates = (
  requestId: string
): Promise<Candidate[]> => Promise.resolve(CANDIDATES[requestId] ?? [])
