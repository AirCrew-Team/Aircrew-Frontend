import { describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import {
  getPendingReplacementRequests,
  getRecommendedCandidates,
} from "@/modules/recommendations/data/recommendations.data"
import { useAuthStore } from "@/stores/auth.store"

// Ausencias del Supervisor (spec docs/specs/ausencias-supervisor.md), AS-19: datos simulados
// de getAbsenceTracking, sus estados, su orden y su coherencia con Recomendaciones.

// Forma mínima de la spec (los tipos reales viven en absenceTracking.types.ts). El módulo se
// carga con vi.importActual para que el archivo compile aunque todavía no exista.
interface TimelineEventLike {
  atUtc: string
  text: string
  missed?: boolean
}

interface TrackedAbsenceLike {
  id: string
  flightNumber: string
  origin: string
  destination: string
  departureUtc: string
  timeToDeparture: string
  position: string
  reason: string
  reportedBy: string
  reportedAtUtc: string
  timeline: TimelineEventLike[]
  status: string
  suggestions?: string
  candidateCount?: number
  replacement?: { fullName: string; option: number }
  approval?: { by: string; atUtc: string }
  deadlineUtc?: string
  confirmedAtUtc?: string
}

const loadAbsences = async () => {
  const data = await vi.importActual<{
    getAbsenceTracking: () => Promise<TrackedAbsenceLike[]>
  }>("@/modules/absenceTracking/data/absenceTracking.data")
  return data.getAbsenceTracking()
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

const MEDICAL = "Incapacidad médica repentina"
const FAMILY = "Calamidad doméstica o familiar"
const FATIGUE = "Fatiga operacional / RAC 212"
const TRANSFER = "Dificultad de traslado comprobada"
const APPROVER = "Camila Restrepo"

// `missed` es opcional: se compara como booleano para no exigir `missed: false` explícito.
const event = (atUtc: string, text: string, missed = false) => ({
  atUtc,
  text,
  missed,
})

const withNormalizedTimeline = (absence: TrackedAbsenceLike) => ({
  ...absence,
  timeline: absence.timeline.map(({ atUtc, text, missed }) =>
    event(atUtc, text, missed === true)
  ),
})

const base = (
  id: string,
  flightNumber: string,
  destination: string,
  departureUtc: string,
  timeToDeparture: string,
  position: string,
  reason: string,
  reportedBy: string,
  reportedAtUtc: string
) => ({
  id,
  flightNumber,
  origin: "BOG",
  destination,
  departureUtc,
  timeToDeparture,
  position,
  reason,
  reportedBy,
  reportedAtUtc,
})

// Tabla «Datos simulados» de la spec, en su orden, con los textos exactos del timeline.
// Desde el 2026-11-14, «sin candidatos» (abs-07) va primero en «Por aprobar».
const EXPECTED = [
  {
    ...base(
      "abs-07",
      "AV-1288",
      "PEI",
      "23:15",
      "8h 45m",
      "Copiloto ATR 72",
      MEDICAL,
      "Tomás Rincón",
      "13:30"
    ),
    status: "por_aprobar",
    suggestions: "sin_candidatos",
    candidateCount: 0,
    timeline: [
      event("13:30", "Ausencia reportada por Tomás Rincón"),
      event("13:33", "Ningún tripulante cumple los requisitos"),
    ],
  },
  {
    ...base(
      "abs-01",
      "AV-9344",
      "MIA",
      "16:15",
      "1h 45m",
      "Copiloto A320",
      MEDICAL,
      "Felipe Ardila",
      "13:58"
    ),
    status: "por_aprobar",
    suggestions: "listas",
    candidateCount: 3,
    timeline: [
      event("13:58", "Ausencia reportada por Felipe Ardila"),
      event("14:01", "La IA propuso 3 candidatos"),
    ],
  },
  {
    ...base(
      "abs-02",
      "AV-8120",
      "CLO",
      "17:40",
      "3h 10m",
      "Jefe de Cabina",
      FAMILY,
      "Natalia Ríos",
      "14:05"
    ),
    status: "por_aprobar",
    suggestions: "listas",
    candidateCount: 2,
    timeline: [
      event("14:05", "Ausencia reportada por Natalia Ríos"),
      event("14:08", "La IA propuso 2 candidatos"),
    ],
  },
  {
    ...base(
      "abs-03",
      "AV-7741",
      "MDE",
      "19:30",
      "5h 00m",
      "Tripulante de Cabina",
      MEDICAL,
      "Sara Londoño",
      "14:12"
    ),
    status: "por_aprobar",
    suggestions: "listas",
    candidateCount: 2,
    timeline: [
      event("14:12", "Ausencia reportada por Sara Londoño"),
      event("14:15", "La IA propuso 2 candidatos"),
    ],
  },
  {
    ...base(
      "abs-04",
      "AV-6612",
      "CTG",
      "20:50",
      "6h 20m",
      "Comandante",
      FATIGUE,
      "Andrés Vélez",
      "14:20"
    ),
    status: "por_aprobar",
    suggestions: "listas",
    candidateCount: 2,
    timeline: [
      event("14:20", "Ausencia reportada por Andrés Vélez"),
      event("14:23", "La IA propuso 2 candidatos"),
    ],
  },
  {
    ...base(
      "abs-05",
      "AV-5023",
      "SMR",
      "22:35",
      "8h 05m",
      "Copiloto A320",
      TRANSFER,
      "Daniela Pardo",
      "14:26"
    ),
    status: "por_aprobar",
    suggestions: "listas",
    candidateCount: 2,
    timeline: [
      event("14:26", "Ausencia reportada por Daniela Pardo"),
      event("14:29", "La IA propuso 2 candidatos"),
    ],
  },
  {
    ...base(
      "abs-06",
      "AV-3307",
      "BAQ",
      "21:10",
      "6h 40m",
      "Tripulante de Cabina",
      FATIGUE,
      "Lucía Mora",
      "14:38"
    ),
    status: "por_aprobar",
    suggestions: "buscando",
    candidateCount: 0,
    timeline: [event("14:38", "Ausencia reportada por Lucía Mora")],
  },
  {
    ...base(
      "abs-08",
      "AV-9341",
      "LIM",
      "17:05",
      "2h 35m",
      "Copiloto A320",
      MEDICAL,
      "Paula Cárdenas",
      "13:58"
    ),
    status: "esperando_confirmacion",
    replacement: { fullName: "Mateo Morales", option: 2 },
    approval: { by: APPROVER, atUtc: "14:06" },
    deadlineUtc: "14:51",
    timeline: [
      event("13:58", "Ausencia reportada por Paula Cárdenas"),
      event("14:01", "La IA propuso 3 candidatos"),
      event("14:06", "Camila Restrepo aprobó a Sebastián Castro (1.ª opción)"),
      event("14:21", "Sebastián Castro no confirmó a tiempo", true),
      event("14:21", "Se notificó a Mateo Morales (2.ª opción)"),
    ],
  },
  {
    ...base(
      "abs-09",
      "AV-2104",
      "MAD",
      "21:30",
      "7h 00m",
      "Jefe de Cabina",
      FAMILY,
      "Jorge Salas",
      "13:20"
    ),
    status: "cubierta",
    replacement: { fullName: "Laura Gómez", option: 1 },
    approval: { by: APPROVER, atUtc: "13:40" },
    confirmedAtUtc: "13:52",
    timeline: [
      event("13:20", "Ausencia reportada por Jorge Salas"),
      event("13:23", "La IA propuso 2 candidatos"),
      event("13:40", "Camila Restrepo aprobó a Laura Gómez (1.ª opción)"),
      event("13:52", "Laura Gómez confirmó el reemplazo"),
    ],
  },
  {
    ...base(
      "abs-10",
      "AV-4410",
      "JFK",
      "18:20",
      "3h 50m",
      "Comandante",
      FATIGUE,
      "Martín Quintero",
      "11:48"
    ),
    status: "cubierta",
    replacement: { fullName: "Roberto Méndez", option: 1 },
    approval: { by: APPROVER, atUtc: "12:02" },
    confirmedAtUtc: "12:15",
    timeline: [
      event("11:48", "Ausencia reportada por Martín Quintero"),
      event("11:51", "La IA propuso 2 candidatos"),
      event("12:02", "Camila Restrepo aprobó a Roberto Méndez (1.ª opción)"),
      event("12:15", "Roberto Méndez confirmó el reemplazo"),
    ],
  },
]

const BASE_KEYS = [
  "id",
  "flightNumber",
  "origin",
  "destination",
  "departureUtc",
  "timeToDeparture",
  "position",
  "reason",
  "reportedBy",
  "reportedAtUtc",
  "timeline",
  "status",
]

const KEYS_BY_STATUS: Record<string, string[]> = {
  por_aprobar: [...BASE_KEYS, "suggestions", "candidateCount"],
  esperando_confirmacion: [
    ...BASE_KEYS,
    "replacement",
    "approval",
    "deadlineUtc",
  ],
  cubierta: [...BASE_KEYS, "replacement", "approval", "confirmedAtUtc"],
}

// Claves con valor definido (una clave opcional con undefined no cuenta).
const definedKeys = (value: object) =>
  Object.entries(value)
    .filter(([, field]) => field !== undefined)
    .map(([key]) => key)
    .sort()

describe("Ausencias: datos simulados de getAbsenceTracking (AS-19)", () => {
  it("AS-19 getAbsenceTracking devuelve las 10 ausencias de la tabla de la spec, en su orden y con sus timelines exactos", async () => {
    const absences = await loadAbsences()

    expect(absences).toHaveLength(10)
    expect(absences.map(withNormalizedTimeline)).toEqual(EXPECTED)
  })

  it("AS-19 cada ausencia tiene la forma de su estado: los campos base más los propios de «por_aprobar», «esperando_confirmacion» o «cubierta»", async () => {
    const absences = await loadAbsences()

    expect(absences).toHaveLength(10)
    for (const absence of absences) {
      const expectedKeys = KEYS_BY_STATUS[absence.status]
      expect(expectedKeys, `estado válido en ${absence.id}`).toBeDefined()
      expect(definedKeys(absence), `campos de ${absence.id}`).toEqual(
        [...expectedKeys].sort()
      )
      if (absence.replacement) {
        expect(definedKeys(absence.replacement)).toEqual(["fullName", "option"])
      }
      if (absence.approval) {
        expect(definedKeys(absence.approval)).toEqual(["atUtc", "by"])
      }
      for (const item of absence.timeline) {
        expect(
          definedKeys(item).filter((key) => key !== "missed"),
          `evento de ${absence.id}`
        ).toEqual(["atUtc", "text"])
      }
    }
  })

  it("AS-19 todas las horas van en «HH:mm» y cada timeline está en orden cronológico", async () => {
    const absences = await loadAbsences()

    expect(absences).toHaveLength(10)
    for (const absence of absences) {
      const hours = [
        absence.departureUtc,
        absence.reportedAtUtc,
        absence.deadlineUtc,
        absence.confirmedAtUtc,
        absence.approval?.atUtc,
        ...absence.timeline.map(({ atUtc }) => atUtc),
      ].filter((hour): hour is string => hour !== undefined)
      for (const hour of hours) {
        expect(hour, `hora de ${absence.id}`).toMatch(HH_MM)
      }
      const times = absence.timeline.map(({ atUtc }) => atUtc)
      expect(times, `timeline de ${absence.id}`).toEqual([...times].sort())
      expect(
        times[0],
        `el timeline de ${absence.id} empieza con el reporte`
      ).toBe(absence.reportedAtUtc)
    }
  })

  it("AS-19 estados y orden: 7 «por_aprobar» (sin candidatos, 5 listas por urgencia y buscando), 1 «esperando_confirmacion» y 2 «cubierta» con la confirmación más reciente primero", async () => {
    const absences = await loadAbsences()

    expect(absences.map(({ status }) => status)).toEqual([
      ...Array(7).fill("por_aprobar"),
      "esperando_confirmacion",
      "cubierta",
      "cubierta",
    ])

    const pending = absences.filter(({ status }) => status === "por_aprobar")
    expect(pending.map(({ suggestions }) => suggestions)).toEqual([
      "sin_candidatos",
      ...Array(5).fill("listas"),
      "buscando",
    ])
    for (const absence of pending) {
      if (absence.suggestions !== "listas") {
        expect(absence.candidateCount, `${absence.id} sin candidatos`).toBe(0)
      }
    }

    const waiting = absences.filter(
      ({ status }) => status === "esperando_confirmacion"
    )
    const waitingDeadlines = waiting.map(({ deadlineUtc }) => deadlineUtc)
    expect(waitingDeadlines).toEqual([...waitingDeadlines].sort())

    const covered = absences.filter(({ status }) => status === "cubierta")
    expect(covered.map(({ confirmedAtUtc }) => confirmedAtUtc)).toEqual([
      "13:52",
      "12:15",
    ])
  })

  it("AS-19 solo el 4.º evento de AV-9341 (abs-08) lleva missed: true", async () => {
    const absences = await loadAbsences()

    const missed = absences.flatMap(({ id, timeline }) =>
      timeline
        .map((item, index) => ({ id, index, item }))
        .filter(({ item }) => item.missed === true)
    )
    expect(missed.map(({ id, index, item }) => [id, index, item.text])).toEqual(
      [["abs-08", 3, "Sebastián Castro no confirmó a tiempo"]]
    )
  })

  it("AS-19 las 5 «por_aprobar» · listas coinciden en vuelo, cargo, horas y número de candidatos con getPendingReplacementRequests y getRecommendedCandidates", async () => {
    const absences = await loadAbsences()
    const requests = await getPendingReplacementRequests()

    const ready = absences.filter(
      ({ status, suggestions }) =>
        status === "por_aprobar" && suggestions === "listas"
    )
    expect(ready.map(({ flightNumber }) => flightNumber)).toEqual(
      requests.map(({ flightNumber }) => flightNumber)
    )

    for (const absence of ready) {
      const request = requests.find(
        ({ flightNumber }) => flightNumber === absence.flightNumber
      )
      expect(request, `solicitud de ${absence.flightNumber}`).toBeDefined()
      if (!request) continue
      expect(
        {
          position: absence.position,
          departureUtc: absence.departureUtc,
          timeToDeparture: absence.timeToDeparture,
        },
        `datos de ${absence.flightNumber}`
      ).toEqual({
        position: request.position,
        departureUtc: request.departureUtc,
        timeToDeparture: request.timeToDeparture,
      })
      const candidates = await getRecommendedCandidates(request.id)
      expect(
        absence.candidateCount,
        `candidatos de ${absence.flightNumber}`
      ).toBe(candidates.length)
    }
  })

  it("AS-19 el aprobador simulado es el usuario simulado del rol Supervisor", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    const supervisor = useAuthStore.getState().user
    const absences = await loadAbsences()

    const approvers = absences.flatMap(({ approval }) =>
      approval ? [approval.by] : []
    )
    expect(approvers).toHaveLength(3)
    for (const approver of approvers) {
      expect(approver).toBe(supervisor?.fullName)
    }
  })
})
