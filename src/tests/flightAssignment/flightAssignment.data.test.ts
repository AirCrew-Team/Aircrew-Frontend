import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { fixClock, restoreClock } from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md), PG-15: los datos
// simulados cumplen las reglas del dominio, comprobado SOLO con las funciones públicas de
// flightAssignment.data.ts (sin leer el pool interno), y los datos fijados por la spec.
//
// El módulo se carga con vi.importActual dentro de cada test, así el archivo compila aunque
// aún no exista. Forma mínima local (los tipos reales viven en flightAssignment.types.ts).
//
// Este archivo NO muta: los rechazos de assignCrew y confirmFlightCrew van al final y, si el
// código es correcto, no cambian nada.

vi.setConfig({ testTimeout: 15_000 })

beforeEach(fixClock)
afterEach(restoreClock)

interface AssigneeLike {
  crewId: string
  fullName: string
  summary: string
  source: string
  rationale: string | null
}

interface SlotLike {
  id: string
  role: string
  label: string
  assignee: AssigneeLike | null
}

interface FlightLike {
  id: string
  flightNumber: string
  date: string
  origin: { code: string; city: string }
  destination: { code: string; city: string }
  departureUtc: string
  arrivalUtc: string
  arrivesNextDay: boolean
  durationMinutes: number
  scope: string
  aircraft: {
    model: string
    family: string
    registration: string
    seats: number
  }
  minimumCrew: { pilots: number; cabin: number }
  slots: SlotLike[]
  status: string
}

interface DayLike {
  date: string
  flightCount: number
  pendingCount: number
}

interface CandidatesLike {
  eligible: { crewId: string; fullName: string; summary: string }[]
  ineligible: { crewId: string; fullName: string; reason: string }[]
}

interface FlightAssignmentDataLike {
  getScheduleDays: () => Promise<DayLike[]>
  getDayFlights: (date: string) => Promise<FlightLike[]>
  getSlotCandidates: (
    flightId: string,
    slotId: string
  ) => Promise<CandidatesLike>
  assignCrew: (
    flightId: string,
    slotId: string,
    crewId: string
  ) => Promise<FlightLike>
  unassignCrew: (flightId: string, slotId: string) => Promise<FlightLike>
  suggestCrew: (flightId: string) => Promise<FlightLike>
  confirmFlightCrew: (flightId: string) => Promise<FlightLike>
}

const loadData = () =>
  vi.importActual<FlightAssignmentDataLike>(
    "@/modules/shared/flightAssignment/data/flightAssignment.demo"
  )

const DATES = [
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
  "2026-11-23",
]

interface SlotCandidates {
  flight: FlightLike
  slot: SlotLike
  candidates: CandidatesLike
}

// Todo lo público: los 7 días, sus vuelos y los candidatos de cada puesto de los vuelos por
// completar (los que el supervisor puede abrir). En paralelo: 400 ms por llamada.
const loadAll = async () => {
  const data = await loadData()
  const days = await data.getScheduleDays()
  const flightsByDay = await Promise.all(
    days.map((day) => data.getDayFlights(day.date))
  )
  const flights = flightsByDay.flat()
  const open = flights.filter((flight) => flight.status !== "confirmada")
  const slots: SlotCandidates[] = await Promise.all(
    open.flatMap((flight) =>
      flight.slots.map(async (slot) => ({
        flight,
        slot,
        candidates: await data.getSlotCandidates(flight.id, slot.id),
      }))
    )
  )
  return { data, days, flightsByDay, flights, slots }
}

let snapshot: ReturnType<typeof loadAll> | undefined
const all = () => (snapshot ??= loadAll())

const byNumber = (flights: FlightLike[], flightNumber: string) => {
  const flight = flights.find((item) => item.flightNumber === flightNumber)
  expect(flight, `existe ${flightNumber}`).toBeDefined()
  return flight as FlightLike
}

const slotByLabel = (flight: FlightLike, label: string) => {
  const slot = flight.slots.find((item) => item.label === label)
  expect(slot, `${flight.flightNumber} tiene el puesto ${label}`).toBeDefined()
  return slot as SlotLike
}

const candidatesOf = (
  slots: SlotCandidates[],
  flightNumber: string,
  label: string
) => {
  const found = slots.find(
    ({ flight, slot }) =>
      flight.flightNumber === flightNumber && slot.label === label
  )
  expect(found, `candidatos de ${flightNumber} · ${label}`).toBeDefined()
  return (found as SlotCandidates).candidates
}

// --- Horarios: ventana de servicio de 1 h antes de la salida a 30 min después de la llegada ---

const dayMinutes = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / 60_000
}

// Acepta «HH:MM» o un ISO con hora: toma la primera «HH:MM».
const clockMinutes = (value: string) => {
  const match = value.match(/(\d{2}):(\d{2})/)
  expect(match, `hora legible en «${value}»`).not.toBeNull()
  const [, hours, minutes] = match as RegExpMatchArray
  return Number(hours) * 60 + Number(minutes)
}

const departureOf = (flight: FlightLike) =>
  dayMinutes(flight.date) + clockMinutes(flight.departureUtc)

const arrivalOf = (flight: FlightLike) =>
  dayMinutes(flight.date) +
  (flight.arrivesNextDay ? 24 * 60 : 0) +
  clockMinutes(flight.arrivalUtc)

const windowOf = (flight: FlightLike) => ({
  start: departureOf(flight) - 60,
  end: arrivalOf(flight) + 30,
})

const crosses = (a: FlightLike, b: FlightLike) => {
  const first = windowOf(a)
  const second = windowOf(b)
  return first.start < second.end && second.start < first.end
}

// --- Puestos esperados según la fórmula ---

const expectedSlots = (flight: FlightLike) => {
  const relief = flight.durationMinutes > 480
  const cabin = Math.ceil(flight.aircraft.seats / 50)
  return [
    { role: "capitan", label: "Capitán" },
    { role: "primer_oficial", label: "Primer Oficial" },
    ...(relief ? [{ role: "piloto_relevo", label: "Piloto de relevo" }] : []),
    { role: "jefe_cabina", label: "Jefe de Cabina" },
    ...Array.from({ length: cabin - 1 }, (_, index) => ({
      role: "tcp",
      label: `TCP ${index + 1}`,
    })),
  ]
}

const PILOT_ROLES = ["capitan", "primer_oficial", "piloto_relevo"]

const covered = (flight: FlightLike) =>
  flight.slots.filter((slot) => slot.assignee !== null).length

const hoursOf = (summary: string) =>
  Number(summary.match(/ · (\d+) h de 90 este mes · /)?.[1])

// Los 7 motivos visibles de la spec, en el orden de las reglas. La regla 1 (rango) no da
// motivo: quien no tiene el rango del puesto no se lista (decisión del 2026-11-17).
const REASONS: { rule: number; pattern: RegExp }[] = [
  { rule: 2, pattern: /^Sin habilitación en (\S+)$/ },
  { rule: 3, pattern: /^Certificado médico vencido$/ },
  { rule: 4, pattern: /^Descanso mínimo hasta ([01]\d|2[0-3]):[0-5]\d$/ },
  { rule: 5, pattern: /^Superaría el límite de 90 h del mes$/ },
  { rule: 6, pattern: /^(Ausente ese día|De vacaciones)$/ },
  { rule: 7, pattern: /^Ya asignado a (AV-\d+), que se cruza en horario$/ },
  { rule: 8, pattern: /^Sin inglés OACI nivel 4 \(vuelo internacional\)$/ },
]

const ruleOf = (reason: string) =>
  REASONS.find(({ pattern }) => pattern.test(reason))?.rule

describe("Programación: resúmenes de los días (PG-15)", () => {
  it("PG-15 getScheduleDays da 7 días de hoy a hoy + 6 (fecha local) con 5/0, 6/0, 6/0, 5/1, 6/2, 6/3 y 4/4", async () => {
    const { days } = await all()

    expect(days.map(({ date }) => date)).toEqual(DATES)
    expect(
      days.map(({ flightCount, pendingCount }) => [flightCount, pendingCount])
    ).toEqual([
      [5, 0],
      [6, 0],
      [6, 0],
      [5, 1],
      [6, 2],
      [6, 3],
      [4, 4],
    ])
  })

  it("PG-15 cada ScheduleDay cuadra con getDayFlights (vuelos y por completar) y suman 38 / 10", async () => {
    const { days, flightsByDay } = await all()

    days.forEach((day, index) => {
      const flights = flightsByDay[index]
      expect(flights.length, `vuelos del ${day.date}`).toBe(day.flightCount)
      expect(
        flights.filter((flight) => flight.status !== "confirmada").length,
        `por completar del ${day.date}`
      ).toBe(day.pendingCount)
      for (const flight of flights)
        expect(flight.date, flight.flightNumber).toBe(day.date)
    })
    expect(days.reduce((sum, day) => sum + day.flightCount, 0)).toBe(38)
    expect(days.reduce((sum, day) => sum + day.pendingCount, 0)).toBe(10)
  })

  it("PG-15 (contrato) getDayFlights viene ordenado por salida y los números e ids de vuelo no se repiten entre días", async () => {
    const { flightsByDay, flights } = await all()

    for (const dayFlights of flightsByDay) {
      const departures = dayFlights.map(departureOf)
      expect(departures).toEqual([...departures].sort((a, b) => a - b))
    }
    expect(new Set(flights.map(({ flightNumber }) => flightNumber)).size).toBe(
      flights.length
    )
    expect(new Set(flights.map(({ id }) => id)).size).toBe(flights.length)
  })
})

describe("Programación: datos fijados por la spec (PG-03, PG-11, precisiones)", () => {
  it("PG-03 hoy tiene AV-8402, AV-2280, AV-4011, AV-5520 y AV-6140, todos confirmados", async () => {
    const { flightsByDay } = await all()

    expect(
      flightsByDay[0].map(
        ({ flightNumber, destination, departureUtc, arrivalUtc, status }) => ({
          flightNumber,
          destination: destination.code,
          times: `${clockMinutes(departureUtc)}-${clockMinutes(arrivalUtc)}`,
          status,
        })
      )
    ).toEqual([
      {
        flightNumber: "AV-8402",
        destination: "MDE",
        times: `${6 * 60}-${6 * 60 + 55}`,
        status: "confirmada",
      },
      {
        flightNumber: "AV-2280",
        destination: "CLO",
        times: `${9 * 60 + 15}-${10 * 60 + 20}`,
        status: "confirmada",
      },
      {
        flightNumber: "AV-4011",
        destination: "CTG",
        times: `${12 * 60 + 40}-${14 * 60 + 5}`,
        status: "confirmada",
      },
      {
        flightNumber: "AV-5520",
        destination: "BAQ",
        times: `${15 * 60 + 30}-${17 * 60}`,
        status: "confirmada",
      },
      {
        flightNumber: "AV-6140",
        destination: "MDE",
        times: `${18 * 60 + 50}-${19 * 60 + 45}`,
        status: "confirmada",
      },
    ])
  })

  it("PG-03 hoy + 5 tiene los 6 vuelos de la tabla con su ruta, horas, avión, puestos y estado", async () => {
    const { flightsByDay } = await all()

    const table = flightsByDay[5].map((flight) => ({
      flightNumber: flight.flightNumber,
      route: `${flight.origin.city} (${flight.origin.code}) → ${flight.destination.city} (${flight.destination.code})`,
      departure: clockMinutes(flight.departureUtc),
      arrival: clockMinutes(flight.arrivalUtc),
      arrivesNextDay: flight.arrivesNextDay,
      aircraft: `${flight.aircraft.model} · ${flight.aircraft.registration}`,
      family: flight.aircraft.family,
      seats: flight.aircraft.seats,
      slots: flight.slots.length,
      covered: covered(flight),
      status: flight.status,
    }))
    const bog = "Bogotá (BOG)"
    expect(table).toEqual([
      {
        flightNumber: "AV-8410",
        route: `${bog} → Medellín (MDE)`,
        departure: 370,
        arrival: 425,
        arrivesNextDay: false,
        aircraft: "Airbus A320neo · HK-5301",
        family: "A320",
        seats: 186,
        slots: 6,
        covered: 6,
        status: "confirmada",
      },
      {
        flightNumber: "AV-2290",
        route: `${bog} → Cali (CLO)`,
        departure: 630,
        arrival: 695,
        arrivesNextDay: false,
        aircraft: "Airbus A320 · HK-5118",
        family: "A320",
        seats: 180,
        slots: 6,
        covered: 6,
        status: "confirmada",
      },
      {
        flightNumber: "AV-4021",
        route: `${bog} → Cartagena (CTG)`,
        departure: 860,
        arrival: 945,
        arrivesNextDay: false,
        aircraft: "Airbus A320neo · HK-5370",
        family: "A320",
        seats: 186,
        slots: 6,
        covered: 3,
        status: "incompleta",
      },
      {
        flightNumber: "AV-5530",
        route: `${bog} → Barranquilla (BAQ)`,
        departure: 1010,
        arrival: 1100,
        arrivesNextDay: false,
        aircraft: "Airbus A320neo · HK-5342",
        family: "A320",
        seats: 186,
        slots: 6,
        covered: 6,
        status: "confirmada",
      },
      {
        flightNumber: "AV-6150",
        route: `${bog} → Medellín (MDE)`,
        departure: 1185,
        arrival: 1240,
        arrivesNextDay: false,
        aircraft: "Airbus A320 · HK-5112",
        family: "A320",
        seats: 180,
        slots: 6,
        covered: 5,
        status: "incompleta",
      },
      {
        flightNumber: "AV-9012",
        route: `${bog} → Madrid (MAD)`,
        departure: 1325,
        arrival: 520,
        arrivesNextDay: true,
        aircraft: "Boeing 787-8 · HK-5280",
        family: "787",
        seats: 250,
        slots: 8,
        covered: 0,
        status: "sin_asignar",
      },
    ])
  })

  it("PG-04 AV-4021 dura 85 min, es nacional, pide 2 pilotos + 4 TCP y tiene a Lucía Mora, Paula Cárdenas y Natalia Reyes", async () => {
    const { flights } = await all()

    const flight = byNumber(flights, "AV-4021")
    expect(flight.durationMinutes).toBe(85)
    expect(flight.scope).toBe("nacional")
    expect(flight.minimumCrew).toEqual({ pilots: 2, cabin: 4 })
    expect(
      flight.slots.map(({ label, assignee }) => [
        label,
        assignee?.fullName ?? null,
      ])
    ).toEqual([
      ["Capitán", null],
      ["Primer Oficial", null],
      ["Jefe de Cabina", "Lucía Mora"],
      ["TCP 1", "Paula Cárdenas"],
      ["TCP 2", "Natalia Reyes"],
      ["TCP 3", null],
    ])
  })

  it("PG-10 AV-6150 tiene a Ricardo Salazar, Mateo Morales, Andrea López, Juliana Pérez y Felipe Rojas, y le falta TCP 3", async () => {
    const { flights } = await all()

    expect(
      byNumber(flights, "AV-6150").slots.map(({ label, assignee }) => [
        label,
        assignee?.fullName ?? null,
      ])
    ).toEqual([
      ["Capitán", "Ricardo Salazar"],
      ["Primer Oficial", "Mateo Morales"],
      ["Jefe de Cabina", "Andrea López"],
      ["TCP 1", "Juliana Pérez"],
      ["TCP 2", "Felipe Rojas"],
      ["TCP 3", null],
    ])
  })

  it("PG-11 AV-9012 es internacional de 635 min (787), pide 3 pilotos + 5 TCP y tiene sus 8 puestos vacíos", async () => {
    const { flights } = await all()

    const flight = byNumber(flights, "AV-9012")
    expect(flight.scope).toBe("internacional")
    expect(flight.durationMinutes).toBe(635)
    expect(flight.aircraft.family).toBe("787")
    expect(flight.minimumCrew).toEqual({ pilots: 3, cabin: 5 })
    expect(flight.slots.map(({ role, label }) => [role, label])).toEqual([
      ["capitan", "Capitán"],
      ["primer_oficial", "Primer Oficial"],
      ["piloto_relevo", "Piloto de relevo"],
      ["jefe_cabina", "Jefe de Cabina"],
      ["tcp", "TCP 1"],
      ["tcp", "TCP 2"],
      ["tcp", "TCP 3"],
      ["tcp", "TCP 4"],
    ])
    expect(flight.slots.every(({ assignee }) => assignee === null)).toBe(true)
  })

  it.each<{
    label: string
    eligible: [string, number][]
    ineligible: [string, string][]
  }>([
    {
      label: "Capitán",
      eligible: [
        ["Andrés Valencia", 62],
        ["Ricardo Salazar", 70],
      ],
      ineligible: [["Jorge Medina", "Sin habilitación en A320"]],
    },
    {
      label: "Primer Oficial",
      eligible: [
        ["Sebastián Castro", 48],
        ["Mateo Morales", 71],
        ["Valentina Ortiz", 80],
      ],
      ineligible: [
        ["Simón Echeverri", "Descanso mínimo hasta 15:10"],
        ["Diego Pardo", "Certificado médico vencido"],
        ["Tomás Rincón", "Ausente ese día"],
      ],
    },
    {
      label: "TCP 3",
      eligible: [
        ["Daniela Torres", 40],
        ["Camilo Herrera", 55],
      ],
      ineligible: [["Laura Gómez", "De vacaciones"]],
    },
  ])(
    "PG-05 candidatos de AV-4021 · $label: elegibles exactos en orden y los que no cumplen con su motivo",
    async ({ label, eligible, ineligible }) => {
      const { slots } = await all()

      const candidates = candidatesOf(slots, "AV-4021", label)
      expect(
        candidates.eligible.map(({ fullName, summary }) => [fullName, summary])
      ).toEqual(
        eligible.map(([name, hours]) => [
          name,
          `Habilitado en A320 · ${hours} h de 90 este mes · descanso cumplido`,
        ])
      )
      const reasons = candidates.ineligible.map(({ fullName, reason }) => [
        fullName,
        reason,
      ])
      // Contiene los fijados por la spec; puede haber más (p. ej. la tripulación de los
      // vuelos confirmados del día, con su descanso o su cruce de horario).
      for (const pair of ineligible) expect(reasons).toContainEqual(pair)
    }
  )

  it("PG-10 / PG-11 en AV-9012, Valentina Ortiz no cumple en Primer Oficial por inglés y Juliana Pérez en TCP 1 por AV-6150", async () => {
    const { slots } = await all()

    expect(
      candidatesOf(slots, "AV-9012", "Primer Oficial").ineligible.map(
        ({ fullName, reason }) => [fullName, reason]
      )
    ).toContainEqual([
      "Valentina Ortiz",
      "Sin inglés OACI nivel 4 (vuelo internacional)",
    ])
    const tcp1 = candidatesOf(slots, "AV-9012", "TCP 1")
    expect(
      tcp1.ineligible.map(({ fullName, reason }) => [fullName, reason])
    ).toContainEqual([
      "Juliana Pérez",
      "Ya asignado a AV-6150, que se cruza en horario",
    ])
    expect(tcp1.eligible.map(({ fullName }) => fullName)).not.toContain(
      "Juliana Pérez"
    )
  })
})

describe("Programación: invariantes del dominio (PG-15)", () => {
  it("PG-15 los puestos siguen la fórmula: Capitán y Primer Oficial, relevo con más de 480 min, y 1 TCP por cada 50 sillas", async () => {
    const { flights } = await all()

    for (const flight of flights) {
      const expected = expectedSlots(flight)
      expect(
        flight.slots.map(({ role, label }) => ({ role, label })),
        flight.flightNumber
      ).toEqual(expected)
      expect(flight.minimumCrew, flight.flightNumber).toEqual({
        pilots: expected.filter(({ role }) => PILOT_ROLES.includes(role))
          .length,
        cabin: Math.ceil(flight.aircraft.seats / 50),
      })
      expect(
        flight.durationMinutes,
        `${flight.flightNumber}: durationMinutes cuadra con salida y llegada`
      ).toBe(arrivalOf(flight) - departureOf(flight))
    }
  })

  it("PG-15 status cuadra con los puestos cubiertos", async () => {
    const { flights } = await all()

    for (const flight of flights) {
      const filled = covered(flight)
      const total = flight.slots.length
      if (flight.status === "confirmada") {
        expect(filled, `${flight.flightNumber} confirmada y completa`).toBe(
          total
        )
      } else {
        const expected =
          filled === 0
            ? "sin_asignar"
            : filled < total
              ? "incompleta"
              : "completa"
        expect(flight.status, flight.flightNumber).toBe(expected)
      }
    }
  })

  it("PG-15 nadie ocupa dos puestos del mismo vuelo", async () => {
    const { flights } = await all()

    for (const flight of flights) {
      const ids = flight.slots
        .map(({ assignee }) => assignee?.crewId)
        .filter(Boolean)
      expect(new Set(ids).size, flight.flightNumber).toBe(ids.length)
    }
  })

  it("PG-15 nadie está a la vez en las dos listas, y quien ocupa un puesto del vuelo no sale en ninguna lista de ese vuelo", async () => {
    const { slots } = await all()

    expect(slots.length, "hay puestos de vuelos por completar").toBeGreaterThan(
      0
    )
    for (const { flight, slot, candidates } of slots) {
      const where = `${flight.flightNumber} · ${slot.label}`
      const eligible = candidates.eligible.map(({ crewId }) => crewId)
      const ineligible = candidates.ineligible.map(({ crewId }) => crewId)
      expect(
        eligible.filter((id) => ineligible.includes(id)),
        `${where}: en las dos listas`
      ).toEqual([])
      const occupants = flight.slots
        .map(({ assignee }) => assignee?.crewId)
        .filter((id): id is string => Boolean(id))
      expect(
        [...eligible, ...ineligible].filter((id) => occupants.includes(id)),
        `${where}: ocupantes del vuelo en las listas`
      ).toEqual([])
    }
  })

  it("PG-15 cada motivo es uno de los textos de la spec y es coherente con el vuelo", async () => {
    const { slots, flights } = await all()

    for (const { flight, slot, candidates } of slots) {
      for (const { fullName, crewId, reason } of candidates.ineligible) {
        const where = `${flight.flightNumber} · ${slot.label} · ${fullName}: «${reason}»`
        const rule = ruleOf(reason)
        expect(rule, `${where} es un motivo de la spec`).toBeDefined()
        if (rule === 2) {
          expect(reason, where).toBe(
            `Sin habilitación en ${flight.aircraft.family}`
          )
        }
        if (rule === 8) {
          expect(flight.scope, where).toBe("internacional")
          expect(PILOT_ROLES, where).toContain(slot.role)
        }
        if (rule === 7) {
          const other = byNumber(
            flights,
            (
              reason.match(
                (
                  REASONS.find(
                    ({ rule }) => rule === 7
                  ) as (typeof REASONS)[number]
                ).pattern
              ) as RegExpMatchArray
            )[1]
          )
          expect(
            other.slots.some(({ assignee }) => assignee?.crewId === crewId),
            `${where}: está asignado en ${other.flightNumber}`
          ).toBe(true)
          expect(crosses(flight, other), `${where}: se cruzan`).toBe(true)
        }
      }
    }
  })

  it("PG-15 ningún elegible está asignado a otro vuelo que se cruce con este", async () => {
    const { slots, flights } = await all()

    const assignments = new Map<string, FlightLike[]>()
    for (const flight of flights)
      for (const { assignee } of flight.slots)
        if (assignee)
          assignments.set(assignee.crewId, [
            ...(assignments.get(assignee.crewId) ?? []),
            flight,
          ])

    for (const { flight, slot, candidates } of slots) {
      for (const { crewId, fullName } of candidates.eligible) {
        for (const other of assignments.get(crewId) ?? []) {
          if (other.id === flight.id) continue
          expect(
            crosses(flight, other),
            `${flight.flightNumber} · ${slot.label}: ${fullName} está en ${other.flightNumber}, que se cruza`
          ).toBe(false)
        }
      }
    }
  })

  // Regla 4 (descanso) y regla 7 (cruces) sobre las asignaciones ya hechas, no solo sobre los
  // candidatos: los datos fijados no pueden poner a nadie en dos vuelos que se crucen ni sin
  // 10 h entre la llegada de un vuelo y la presentación del siguiente (1 h antes de la salida).
  it("PG-15 cada tripulante asignado en la semana tiene al menos 10 h entre la llegada de un vuelo y la presentación del siguiente, y ningún cruce", async () => {
    const { flights } = await all()

    expect(flights.length, "los vuelos de los 7 días").toBeGreaterThan(0)
    const byCrew = new Map<string, FlightLike[]>()
    for (const flight of flights)
      for (const { assignee } of flight.slots)
        if (assignee)
          byCrew.set(assignee.crewId, [
            ...(byCrew.get(assignee.crewId) ?? []),
            flight,
          ])

    const problems: string[] = []
    for (const [crewId, assigned] of byCrew) {
      const name = flights
        .flatMap(({ slots }) => slots)
        .find(({ assignee }) => assignee?.crewId === crewId)?.assignee?.fullName
      const ordered = [...assigned].sort(
        (a, b) => departureOf(a) - departureOf(b)
      )
      ordered.forEach((flight, index) => {
        for (const other of ordered.slice(index + 1))
          if (crosses(flight, other))
            problems.push(
              `${name}: ${flight.flightNumber} (${flight.date}) se cruza con ${other.flightNumber} (${other.date})`
            )
        const next = ordered[index + 1]
        if (!next) return
        const rest = departureOf(next) - 60 - arrivalOf(flight)
        if (rest < 10 * 60)
          problems.push(
            `${name}: ${rest} min entre la llegada de ${flight.flightNumber} (${flight.date}) y la presentación de ${next.flightNumber} (${next.date})`
          )
      })
    }
    expect(problems).toEqual([])
  })

  it("PG-15 (precisión) el resumen es «Habilitado en {familia} · {h} h de 90 este mes · descanso cumplido» y los elegibles van de más a menos margen", async () => {
    const { slots, flights } = await all()

    for (const flight of flights)
      for (const { assignee, label } of flight.slots)
        if (assignee)
          expect(assignee.summary, `${flight.flightNumber} · ${label}`).toMatch(
            new RegExp(
              `^Habilitado en ${flight.aircraft.family} · \\d+ h de 90 este mes · descanso cumplido$`
            )
          )

    for (const { flight, slot, candidates } of slots) {
      const where = `${flight.flightNumber} · ${slot.label}`
      for (const { summary } of candidates.eligible)
        expect(summary, where).toMatch(
          new RegExp(
            `^Habilitado en ${flight.aircraft.family} · \\d+ h de 90 este mes · descanso cumplido$`
          )
        )
      const hours = candidates.eligible.map(({ summary }) => hoursOf(summary))
      expect(hours, `${where}: más margen primero`).toEqual(
        [...hours].sort((a, b) => a - b)
      )
    }
  })

  it("PG-15 (datos) hay al menos un caso de cada uno de los 7 motivos visibles", async () => {
    const { slots } = await all()

    const rules = new Set(
      slots.flatMap(({ candidates }) =>
        candidates.ineligible.map(({ reason }) => ruleOf(reason))
      )
    )
    expect([...rules].sort()).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it("PG-15 (datos) cada vuelo por completar tiene elegibles suficientes para sus puestos vacíos", async () => {
    const { slots, flights } = await all()

    for (const flight of flights.filter(
      ({ status }) => status !== "confirmada"
    )) {
      const empty = slots.filter(
        (item) => item.flight.id === flight.id && item.slot.assignee === null
      )
      const people = new Set<string>()
      for (const { slot, candidates } of empty) {
        expect(
          candidates.eligible.length,
          `${flight.flightNumber} · ${slot.label} tiene al menos un elegible`
        ).toBeGreaterThan(0)
        for (const { crewId } of candidates.eligible) people.add(crewId)
      }
      expect(
        people.size,
        `${flight.flightNumber}: personas distintas para ${empty.length} puestos`
      ).toBeGreaterThanOrEqual(empty.length)
    }
  })
})

describe("Programación: contrato de las acciones sin mutar (spec «Contratos de datos»)", () => {
  it("(alcance) cada respuesta es una copia: modificar lo devuelto no cambia la siguiente lectura", async () => {
    const data = await loadData()

    const [first] = await data.getDayFlights("2026-11-22")
    const original = first.slots[0].assignee?.fullName
    first.slots[0].assignee = null
    first.status = "sin_asignar"
    const [again] = await data.getDayFlights("2026-11-22")

    expect(again.flightNumber).toBe("AV-8410")
    expect(again.status).toBe("confirmada")
    expect(again.slots[0].assignee?.fullName).toBe(original)
  })

  it("(errores de reglas) assignCrew con alguien que no cumple rechaza con el motivo y no cambia el puesto", async () => {
    const { data, flights, slots } = await all()
    const flight = byNumber(flights, "AV-4021")
    const slot = slotByLabel(flight, "Primer Oficial")
    const diego = candidatesOf(
      slots,
      "AV-4021",
      "Primer Oficial"
    ).ineligible.find(({ fullName }) => fullName === "Diego Pardo")
    expect(diego).toBeDefined()

    await expect(
      data.assignCrew(flight.id, slot.id, (diego as { crewId: string }).crewId)
    ).rejects.toThrow("Certificado médico vencido")

    const after = byNumber(await data.getDayFlights("2026-11-22"), "AV-4021")
    expect(slotByLabel(after, "Primer Oficial").assignee).toBeNull()
    expect(after.status).toBe("incompleta")
  })

  it("(errores de reglas) confirmFlightCrew sin estar completa rechaza y no confirma", async () => {
    const { data, flights } = await all()
    const flight = byNumber(flights, "AV-4021")

    await expect(data.confirmFlightCrew(flight.id)).rejects.toBeInstanceOf(
      Error
    )

    const after = byNumber(await data.getDayFlights("2026-11-22"), "AV-4021")
    expect(after.status).toBe("incompleta")
  })

  it("(revisión 2026-11-17) confirmFlightCrew sobre un vuelo ya confirmado rechaza con «La tripulación ya está confirmada.» y sigue confirmado", async () => {
    const { data, flights } = await all()
    const flight = byNumber(flights, "AV-8402")
    expect(flight.status, "ancla: AV-8402 viene confirmado").toBe("confirmada")

    await expect(data.confirmFlightCrew(flight.id)).rejects.toThrow(
      "La tripulación ya está confirmada."
    )

    const after = byNumber(await data.getDayFlights("2026-11-17"), "AV-8402")
    expect(after.status).toBe("confirmada")
  })
})
