import { describe, expect, it, vi } from "vitest"

import { getAbsenceTracking } from "@/modules/absenceTracking/data/absenceTracking.data"
import {
  getPendingReplacementRequests,
  getRecommendedCandidates,
} from "@/modules/recommendations/data/recommendations.demo"
import { getCrewSummary } from "@/modules/supervisorHome/data/supervisorHome.demo"

// Tripulación del Supervisor (spec docs/specs/tripulacion-supervisor.md), TC-20: datos
// simulados de getShiftCrew, su forma por estado, su orden y su coherencia con el Inicio,
// Recomendaciones y Ausencias.

// Forma mínima de la spec (los tipos reales viven en shiftCrew.types.ts). El módulo se carga
// con vi.importActual para que el archivo compile aunque todavía no exista.
interface FlightRefLike {
  flightNumber: string
  origin: string
  destination: string
}

interface CrewMemberLike {
  id: string
  fullName: string
  position: string
  phone: string
  radioChannel: string
  expiringCertification: { name: string; daysLeft: number } | null
  status: string
  location?: string
  minutesToRamp?: number
  guardUntilUtc?: string
  replacementBlocker?: string | null
  flight?: FlightRefLike
  arrivalUtc?: string
  reportUtc?: string
  restUntilUtc?: string
  reason?: string
}

interface ShiftCrewLike {
  base: { code: string; name: string }
  members: CrewMemberLike[]
}

const loadShiftCrew = async () => {
  const data = await vi.importActual<{
    getShiftCrew: () => Promise<ShiftCrewLike>
  }>("@/modules/shiftCrew/data/shiftCrew.demo")
  return data.getShiftCrew()
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

const PILOTS = "CH-04 OPS BOG (131.85)"
const CABIN = "CH-02 OPS BOG (129.40)"
const radioFor = (position: string) =>
  position === "Comandante" || position === "Primer Oficial" ? PILOTS : CABIN

const CERTIFICATIONS: Record<string, { name: string; daysLeft: number }> = {
  "Carlos Mejía": { name: "Simulador A320", daysLeft: 12 },
  "Valentina Ortiz": { name: "CRM", daysLeft: 25 },
  "Héctor Bermúdez": { name: "Certificado médico", daysLeft: 40 },
}

const person = (
  id: string,
  fullName: string,
  position: string,
  phone: string
) => ({
  id,
  fullName,
  position,
  phone,
  radioChannel: radioFor(position),
  expiringCertification: CERTIFICATIONS[fullName] ?? null,
})

const flight = (flightNumber: string, destination: string) => ({
  flightNumber,
  origin: "BOG",
  destination,
})

const guard = (
  base: ReturnType<typeof person>,
  location: string,
  minutesToRamp: number,
  replacementBlocker: string | null = null
) => ({
  ...base,
  status: "guardia",
  location,
  minutesToRamp,
  guardUntilUtc: "22:00",
  replacementBlocker,
})

const inFlight = (
  base: ReturnType<typeof person>,
  flightNumber: string,
  destination: string,
  arrivalUtc: string
) => ({
  ...base,
  status: "en_vuelo",
  flight: flight(flightNumber, destination),
  arrivalUtc,
})

const scheduled = (
  base: ReturnType<typeof person>,
  flightNumber: string,
  destination: string,
  reportUtc: string
) => ({
  ...base,
  status: "programado",
  flight: flight(flightNumber, destination),
  reportUtc,
})

const resting = (base: ReturnType<typeof person>, restUntilUtc: string) => ({
  ...base,
  status: "descanso",
  restUntilUtc,
})

const absent = (
  base: ReturnType<typeof person>,
  flightNumber: string,
  destination: string,
  reason: string
) => ({
  ...base,
  status: "ausente",
  flight: flight(flightNumber, destination),
  reason,
})

const MEDICAL = "Incapacidad médica repentina"
const FAMILY = "Calamidad doméstica o familiar"
const FO = "Primer Oficial"
const CPT = "Comandante"
const PURSER = "Jefe de Cabina"
const CABIN_CREW = "Tripulante de Cabina"

// Tabla «Datos simulados» de la spec, en su orden.
const EXPECTED = [
  guard(
    person("c-501", "Camila Herrera", FO, "+57 316 540 3378"),
    "Standby Hotel (Aeropuerto)",
    15
  ),
  guard(
    person("c-101", "Juan Pablo Navarro", FO, "+57 310 445 8899"),
    "Standby Casa (Fontibón)",
    25
  ),
  guard(
    person("c-502", "Felipe Vargas", FO, "+57 320 117 8842"),
    "Zona Fontibón",
    28
  ),
  guard(
    person("c-202", "Diego Ruiz", PURSER, "+57 300 918 2264"),
    "Zona Modelia",
    30
  ),
  guard(
    person("c-302", "Sebastián Castro", CABIN_CREW, "+57 301 665 2390"),
    "Zona Engativá",
    33
  ),
  guard(
    person("c-201", "Laura Gómez", PURSER, "+57 312 550 1187"),
    "Standby Casa (Chapinero)",
    35
  ),
  guard(
    person("c-301", "Valentina Ortiz", CABIN_CREW, "+57 318 402 7735"),
    "Standby Casa (Suba)",
    40
  ),
  guard(
    person("c-102", "Mateo Morales", FO, "+57 311 208 4410"),
    "Zona Salitre",
    42
  ),
  guard(
    person("c-401", "Carlos Mejía", CPT, "+57 310 882 1456"),
    "Standby Casa (Usaquén)",
    45
  ),
  guard(
    person("c-402", "Ricardo Peña", CPT, "+57 314 290 6613"),
    "Zona Cedritos",
    50
  ),
  guard(
    person("c-103", "Andrés Restrepo", FO, "+57 315 774 0921"),
    "Zona Norte",
    55
  ),
  guard(
    person("t-112", "Simón Echeverri", FO, "+57 317 509 1132"),
    "Standby Casa (Kennedy)",
    38,
    "Descanso mínimo hasta 16:40"
  ),
  inFlight(
    person("t-201", "Alejandro Rojas", CPT, "+57 314 663 1209"),
    "AV-8805",
    "CUN",
    "15:20"
  ),
  inFlight(
    person("t-202", "Daniel Ospina", FO, "+57 315 287 9934"),
    "AV-8805",
    "CUN",
    "15:20"
  ),
  inFlight(
    person("t-203", "Mariana Castaño", PURSER, "+57 316 119 4402"),
    "AV-8805",
    "CUN",
    "15:20"
  ),
  inFlight(
    person("t-204", "Juliana Patiño", CABIN_CREW, "+57 317 840 5576"),
    "AV-8805",
    "CUN",
    "15:20"
  ),
  inFlight(
    person("t-205", "Luis Fernando Arango", CPT, "+57 318 372 6618"),
    "AV-7310",
    "PTY",
    "16:05"
  ),
  inFlight(
    person("t-206", "Isabel Quintana", FO, "+57 319 925 3047"),
    "AV-7310",
    "PTY",
    "16:05"
  ),
  inFlight(
    person("t-207", "Héctor Bermúdez", CPT, "+57 310 221 4587"),
    "AV-4021",
    "MAD",
    "23:40"
  ),
  inFlight(
    person("t-208", "Paola Jiménez", FO, "+57 311 734 2290"),
    "AV-4021",
    "MAD",
    "23:40"
  ),
  inFlight(
    person("t-209", "Gabriela Torres", PURSER, "+57 312 908 6614"),
    "AV-4021",
    "MAD",
    "23:40"
  ),
  inFlight(
    person("t-210", "Esteban Molina", CABIN_CREW, "+57 313 452 7781"),
    "AV-4021",
    "MAD",
    "23:40"
  ),
  scheduled(
    person("t-301", "Roberto Méndez", CPT, "+57 300 614 2873"),
    "AV-4410",
    "JFK",
    "17:20"
  ),
  scheduled(
    person("t-302", "Sofía Navas", FO, "+57 301 458 7710"),
    "AV-4410",
    "JFK",
    "17:20"
  ),
  scheduled(
    person("t-303", "Catalina Duarte", PURSER, "+57 302 773 1965"),
    "AV-4410",
    "JFK",
    "17:20"
  ),
  scheduled(
    person("t-304", "Manuel Ochoa", CABIN_CREW, "+57 304 209 8851"),
    "AV-4410",
    "JFK",
    "17:20"
  ),
  scheduled(
    person("t-305", "Fernando Lozano", CPT, "+57 305 836 4127"),
    "AV-6150",
    "MEX",
    "19:45"
  ),
  scheduled(
    person("t-306", "Andrea Villamil", FO, "+57 310 547 9902"),
    "AV-6150",
    "MEX",
    "19:45"
  ),
  scheduled(
    person("t-307", "Ximena Prieto", PURSER, "+57 311 692 3348"),
    "AV-6150",
    "MEX",
    "19:45"
  ),
  scheduled(
    person("t-308", "Julián Cortés", CABIN_CREW, "+57 312 184 6075"),
    "AV-6150",
    "MEX",
    "19:45"
  ),
  resting(person("t-401", "Óscar Pineda", CPT, "+57 313 905 2264"), "18:00"),
  resting(
    person("t-402", "Lina Marcela Gil", CABIN_CREW, "+57 314 428 7319"),
    "19:30"
  ),
  resting(person("t-403", "Santiago Beltrán", FO, "+57 315 761 0458"), "21:15"),
  resting(
    person("t-404", "Carolina Acosta", PURSER, "+57 316 237 8896"),
    "22:40"
  ),
  absent(
    person("t-501", "Tomás Rincón", FO, "+57 320 694 3381"),
    "AV-1288",
    "PEI",
    MEDICAL
  ),
  absent(
    person("t-502", "Felipe Ardila", FO, "+57 318 846 2275"),
    "AV-9344",
    "MIA",
    MEDICAL
  ),
  absent(
    person("t-503", "Natalia Ríos", PURSER, "+57 319 173 5560"),
    "AV-8120",
    "CLO",
    FAMILY
  ),
]

const BASE_KEYS = [
  "id",
  "fullName",
  "position",
  "phone",
  "radioChannel",
  "expiringCertification",
  "status",
]

const KEYS_BY_STATUS: Record<string, string[]> = {
  guardia: [
    ...BASE_KEYS,
    "location",
    "minutesToRamp",
    "guardUntilUtc",
    "replacementBlocker",
  ],
  en_vuelo: [...BASE_KEYS, "flight", "arrivalUtc"],
  programado: [...BASE_KEYS, "flight", "reportUtc"],
  descanso: [...BASE_KEYS, "restUntilUtc"],
  ausente: [...BASE_KEYS, "flight", "reason"],
}

// Claves con valor definido (null cuenta como definido: `replacementBlocker` y
// `expiringCertification` son null a propósito).
const definedKeys = (value: object) =>
  Object.entries(value)
    .filter(([, field]) => field !== undefined)
    .map(([key]) => key)
    .sort()

const isSorted = <T extends string | number>(values: T[]) =>
  values.every((value, index) => index === 0 || values[index - 1] <= value)

describe("Tripulación: datos simulados de getShiftCrew (TC-20)", () => {
  it("TC-20 getShiftCrew devuelve la base «Base Eldorado» (BOG) y los 37 tripulantes de la tabla de la spec, en su orden", async () => {
    const crew = await loadShiftCrew()

    expect(crew.base).toEqual({ code: "BOG", name: "Base Eldorado" })
    expect(crew.members).toHaveLength(37)
    expect(crew.members).toEqual(EXPECTED)
  })

  it("TC-20 cada tripulante tiene la forma de su estado: los campos base más los propios de guardia, en_vuelo, programado, descanso o ausente", async () => {
    const crew = await loadShiftCrew()

    expect(crew.members).toHaveLength(37)
    for (const member of crew.members) {
      const expectedKeys = KEYS_BY_STATUS[member.status]
      expect(expectedKeys, `estado válido en ${member.id}`).toBeDefined()
      expect(definedKeys(member), `campos de ${member.id}`).toEqual(
        [...expectedKeys].sort()
      )
      if (member.flight) {
        expect(definedKeys(member.flight), `vuelo de ${member.id}`).toEqual([
          "destination",
          "flightNumber",
          "origin",
        ])
      }
      if (member.expiringCertification) {
        expect(definedKeys(member.expiringCertification)).toEqual([
          "daysLeft",
          "name",
        ])
      }
    }
  })

  it("TC-20 las horas van en «HH:mm»", async () => {
    const crew = await loadShiftCrew()

    expect(crew.members).toHaveLength(37)
    for (const member of crew.members) {
      const hours = [
        member.guardUntilUtc,
        member.arrivalUtc,
        member.reportUtc,
        member.restUntilUtc,
      ].filter((hour): hour is string => hour !== undefined)
      if (member.status !== "ausente") {
        expect(hours, `una hora en ${member.id}`).toHaveLength(1)
      }
      for (const hour of hours) {
        expect(hour, `hora de ${member.id}`).toMatch(HH_MM)
      }
    }
  })

  it("TC-20 orden: guardia (disponibles por minutos a rampa y luego no disponibles), en vuelo por llegada, programados por presentación, descanso por fin y ausentes; 12/10/8/4/3", async () => {
    const crew = await loadShiftCrew()
    const { members } = crew

    expect(members.map(({ status }) => status)).toEqual([
      ...Array(12).fill("guardia"),
      ...Array(10).fill("en_vuelo"),
      ...Array(8).fill("programado"),
      ...Array(4).fill("descanso"),
      ...Array(3).fill("ausente"),
    ])
    const guards = members.filter(({ status }) => status === "guardia")
    const available = guards.filter(
      ({ replacementBlocker }) => replacementBlocker === null
    )
    expect(available).toHaveLength(11)
    expect(guards.slice(0, 11)).toEqual(available)
    expect(
      isSorted(available.map(({ minutesToRamp }) => minutesToRamp ?? -1))
    ).toBe(true)
    const byStatus = (status: string, key: keyof CrewMemberLike) =>
      members
        .filter((member) => member.status === status)
        .map((member) => member[key] as string)
    expect(isSorted(byStatus("en_vuelo", "arrivalUtc"))).toBe(true)
    expect(isSorted(byStatus("programado", "reportUtc"))).toBe(true)
    expect(isSorted(byStatus("descanso", "restUntilUtc"))).toBe(true)
  })

  it("TC-20 en servicio (37 − ausentes = 34) coincide con getCrewSummary().onDuty y round(34/37 × 100) con availabilityPercent (92)", async () => {
    const crew = await loadShiftCrew()
    const summary = await getCrewSummary()

    const total = crew.members.length
    const onDuty =
      total - crew.members.filter(({ status }) => status === "ausente").length
    expect(onDuty).toBe(34)
    expect(onDuty).toBe(summary.onDuty)
    expect(Math.round((onDuty / total) * 100)).toBe(summary.availabilityPercent)
  })

  it("TC-20 los 11 candidatos de getRecommendedCandidates (todas las solicitudes, sin repetir) están de guardia y disponibles, con el mismo nombre, cargo, ubicación, minutos a rampa, teléfono y canal", async () => {
    const crew = await loadShiftCrew()
    const requests = await getPendingReplacementRequests()
    const lists = await Promise.all(
      requests.map(({ id }) => getRecommendedCandidates(id))
    )
    const candidates = [
      ...new Map(lists.flat().map((item) => [item.id, item])).values(),
    ]

    expect(candidates).toHaveLength(11)
    for (const candidate of candidates) {
      const member = crew.members.find(({ id }) => id === candidate.id)
      expect(member, `${candidate.id} en la tripulación`).toBeDefined()
      if (!member) continue
      expect(
        {
          status: member.status,
          replacementBlocker: member.replacementBlocker,
          fullName: member.fullName,
          position: member.position,
          location: member.location,
          minutesToRamp: member.minutesToRamp,
          phone: member.phone,
          radioChannel: member.radioChannel,
        },
        `datos de ${candidate.id}`
      ).toEqual({
        status: "guardia",
        replacementBlocker: null,
        fullName: candidate.fullName,
        position: candidate.rank,
        location: candidate.location,
        minutesToRamp: candidate.minutesToRamp,
        phone: candidate.phone,
        radioChannel: candidate.radioChannel,
      })
    }
  })

  it("TC-20 (coherencia con Ausencias) los 3 ausentes son reportantes de Ausencias con su vuelo, ruta y motivo, y Roberto Méndez está programado en AV-4410", async () => {
    const crew = await loadShiftCrew()
    const absences = await getAbsenceTracking()

    const absentMembers = crew.members.filter(
      ({ status }) => status === "ausente"
    )
    expect(absentMembers.map(({ fullName }) => fullName)).toEqual([
      "Tomás Rincón",
      "Felipe Ardila",
      "Natalia Ríos",
    ])
    for (const member of absentMembers) {
      const absence = absences.find(
        ({ reportedBy }) => reportedBy === member.fullName
      )
      expect(absence, `ausencia de ${member.fullName}`).toBeDefined()
      if (!absence) continue
      expect({ ...member.flight, reason: member.reason }).toEqual({
        flightNumber: absence.flightNumber,
        origin: absence.origin,
        destination: absence.destination,
        reason: absence.reason,
      })
    }
    const roberto = crew.members.find(
      ({ fullName }) => fullName === "Roberto Méndez"
    )
    expect(roberto?.status).toBe("programado")
    expect(roberto?.flight?.flightNumber).toBe("AV-4410")
  })
})
