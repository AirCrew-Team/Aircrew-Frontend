// Datos simulados originales (antes de conectar el backend). Los usan los tests de
// pantalla como fixture: setup.ts reemplaza el módulo de datos real por este.
import type {
  CrewMember,
  ShiftCrew,
} from "@/modules/shiftCrew/types/shiftCrew.types"

// Datos simulados ("quemados") con la forma de la acción real: se moverán a App/actions
// cuando exista la API. El backend filtrará por la base y el turno del supervisor (sesión)
// y devolverá la lista ya ordenada: guardia (disponibles por minutos a rampa, luego no
// disponibles), en vuelo por llegada, programados por presentación, descanso por fin y
// ausentes en el orden de Ausencias. Los 11 de guardia disponibles son los candidatos de
// Recomendaciones, con los mismos datos.

// Canal de radio: los pilotos por operaciones y la cabina por su canal.
const PILOTS_RADIO = "CH-04 OPS BOG (131.85)"
const CABIN_RADIO = "CH-02 OPS BOG (129.40)"

// Campos comunes; la certificación por vencer solo la tienen 3 personas.
const person = (
  id: string,
  fullName: string,
  position: string,
  phone: string,
  expiringCertification: { name: string; daysLeft: number } | null = null
) => ({
  id,
  fullName,
  position,
  phone,
  radioChannel:
    position === "Comandante" || position === "Primer Oficial"
      ? PILOTS_RADIO
      : CABIN_RADIO,
  expiringCertification,
})

const fromBog = (flightNumber: string, destination: string) => ({
  flightNumber,
  origin: "BOG",
  destination,
})

const FO = "Primer Oficial"
const CPT = "Comandante"
const PURSER = "Jefe de Cabina"
const CABIN = "Tripulante de Cabina"

const MEMBERS: CrewMember[] = [
  {
    ...person("c-501", "Camila Herrera", FO, "+57 316 540 3378"),
    status: "guardia",
    location: "Standby Hotel (Aeropuerto)",
    minutesToRamp: 15,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-101", "Juan Pablo Navarro", FO, "+57 310 445 8899"),
    status: "guardia",
    location: "Standby Casa (Fontibón)",
    minutesToRamp: 25,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-502", "Felipe Vargas", FO, "+57 320 117 8842"),
    status: "guardia",
    location: "Zona Fontibón",
    minutesToRamp: 28,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-202", "Diego Ruiz", PURSER, "+57 300 918 2264"),
    status: "guardia",
    location: "Zona Modelia",
    minutesToRamp: 30,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-302", "Sebastián Castro", CABIN, "+57 301 665 2390"),
    status: "guardia",
    location: "Zona Engativá",
    minutesToRamp: 33,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-201", "Laura Gómez", PURSER, "+57 312 550 1187"),
    status: "guardia",
    location: "Standby Casa (Chapinero)",
    minutesToRamp: 35,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-301", "Valentina Ortiz", CABIN, "+57 318 402 7735", {
      name: "CRM",
      daysLeft: 25,
    }),
    status: "guardia",
    location: "Standby Casa (Suba)",
    minutesToRamp: 40,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-102", "Mateo Morales", FO, "+57 311 208 4410"),
    status: "guardia",
    location: "Zona Salitre",
    minutesToRamp: 42,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-401", "Carlos Mejía", CPT, "+57 310 882 1456", {
      name: "Simulador A320",
      daysLeft: 12,
    }),
    status: "guardia",
    location: "Standby Casa (Usaquén)",
    minutesToRamp: 45,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-402", "Ricardo Peña", CPT, "+57 314 290 6613"),
    status: "guardia",
    location: "Zona Cedritos",
    minutesToRamp: 50,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("c-103", "Andrés Restrepo", FO, "+57 315 774 0921"),
    status: "guardia",
    location: "Zona Norte",
    minutesToRamp: 55,
    guardUntilUtc: "22:00",
    replacementBlocker: null,
  },
  {
    ...person("t-112", "Simón Echeverri", FO, "+57 317 509 1132"),
    status: "guardia",
    location: "Standby Casa (Kennedy)",
    minutesToRamp: 38,
    guardUntilUtc: "22:00",
    replacementBlocker: "Descanso mínimo hasta 16:40",
  },
  {
    ...person("t-201", "Alejandro Rojas", CPT, "+57 314 663 1209"),
    status: "en_vuelo",
    flight: fromBog("AV-8805", "CUN"),
    arrivalUtc: "15:20",
  },
  {
    ...person("t-202", "Daniel Ospina", FO, "+57 315 287 9934"),
    status: "en_vuelo",
    flight: fromBog("AV-8805", "CUN"),
    arrivalUtc: "15:20",
  },
  {
    ...person("t-203", "Mariana Castaño", PURSER, "+57 316 119 4402"),
    status: "en_vuelo",
    flight: fromBog("AV-8805", "CUN"),
    arrivalUtc: "15:20",
  },
  {
    ...person("t-204", "Juliana Patiño", CABIN, "+57 317 840 5576"),
    status: "en_vuelo",
    flight: fromBog("AV-8805", "CUN"),
    arrivalUtc: "15:20",
  },
  {
    ...person("t-205", "Luis Fernando Arango", CPT, "+57 318 372 6618"),
    status: "en_vuelo",
    flight: fromBog("AV-7310", "PTY"),
    arrivalUtc: "16:05",
  },
  {
    ...person("t-206", "Isabel Quintana", FO, "+57 319 925 3047"),
    status: "en_vuelo",
    flight: fromBog("AV-7310", "PTY"),
    arrivalUtc: "16:05",
  },
  {
    ...person("t-207", "Héctor Bermúdez", CPT, "+57 310 221 4587", {
      name: "Certificado médico",
      daysLeft: 40,
    }),
    status: "en_vuelo",
    flight: fromBog("AV-4021", "MAD"),
    arrivalUtc: "23:40",
  },
  {
    ...person("t-208", "Paola Jiménez", FO, "+57 311 734 2290"),
    status: "en_vuelo",
    flight: fromBog("AV-4021", "MAD"),
    arrivalUtc: "23:40",
  },
  {
    ...person("t-209", "Gabriela Torres", PURSER, "+57 312 908 6614"),
    status: "en_vuelo",
    flight: fromBog("AV-4021", "MAD"),
    arrivalUtc: "23:40",
  },
  {
    ...person("t-210", "Esteban Molina", CABIN, "+57 313 452 7781"),
    status: "en_vuelo",
    flight: fromBog("AV-4021", "MAD"),
    arrivalUtc: "23:40",
  },
  {
    ...person("t-301", "Roberto Méndez", CPT, "+57 300 614 2873"),
    status: "programado",
    flight: fromBog("AV-4410", "JFK"),
    reportUtc: "17:20",
  },
  {
    ...person("t-302", "Sofía Navas", FO, "+57 301 458 7710"),
    status: "programado",
    flight: fromBog("AV-4410", "JFK"),
    reportUtc: "17:20",
  },
  {
    ...person("t-303", "Catalina Duarte", PURSER, "+57 302 773 1965"),
    status: "programado",
    flight: fromBog("AV-4410", "JFK"),
    reportUtc: "17:20",
  },
  {
    ...person("t-304", "Manuel Ochoa", CABIN, "+57 304 209 8851"),
    status: "programado",
    flight: fromBog("AV-4410", "JFK"),
    reportUtc: "17:20",
  },
  {
    ...person("t-305", "Fernando Lozano", CPT, "+57 305 836 4127"),
    status: "programado",
    flight: fromBog("AV-6150", "MEX"),
    reportUtc: "19:45",
  },
  {
    ...person("t-306", "Andrea Villamil", FO, "+57 310 547 9902"),
    status: "programado",
    flight: fromBog("AV-6150", "MEX"),
    reportUtc: "19:45",
  },
  {
    ...person("t-307", "Ximena Prieto", PURSER, "+57 311 692 3348"),
    status: "programado",
    flight: fromBog("AV-6150", "MEX"),
    reportUtc: "19:45",
  },
  {
    ...person("t-308", "Julián Cortés", CABIN, "+57 312 184 6075"),
    status: "programado",
    flight: fromBog("AV-6150", "MEX"),
    reportUtc: "19:45",
  },
  {
    ...person("t-401", "Óscar Pineda", CPT, "+57 313 905 2264"),
    status: "descanso",
    restUntilUtc: "18:00",
  },
  {
    ...person("t-402", "Lina Marcela Gil", CABIN, "+57 314 428 7319"),
    status: "descanso",
    restUntilUtc: "19:30",
  },
  {
    ...person("t-403", "Santiago Beltrán", FO, "+57 315 761 0458"),
    status: "descanso",
    restUntilUtc: "21:15",
  },
  {
    ...person("t-404", "Carolina Acosta", PURSER, "+57 316 237 8896"),
    status: "descanso",
    restUntilUtc: "22:40",
  },
  {
    ...person("t-501", "Tomás Rincón", FO, "+57 320 694 3381"),
    status: "ausente",
    flight: fromBog("AV-1288", "PEI"),
    reason: "Incapacidad médica repentina",
  },
  {
    ...person("t-502", "Felipe Ardila", FO, "+57 318 846 2275"),
    status: "ausente",
    flight: fromBog("AV-9344", "MIA"),
    reason: "Incapacidad médica repentina",
  },
  {
    ...person("t-503", "Natalia Ríos", PURSER, "+57 319 173 5560"),
    status: "ausente",
    flight: fromBog("AV-8120", "CLO"),
    reason: "Calamidad doméstica o familiar",
  },
]

// Tripulación de la base del supervisor durante su turno.
export const getShiftCrew = (): Promise<ShiftCrew> =>
  Promise.resolve({
    base: { code: "BOG", name: "Base Eldorado" },
    members: MEMBERS,
  })
