import { focusManager } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de home.data.ts se envuelve para registrar sus llamadas.
// Sin override, delega en la función real (datos simulados de la referencia).
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const homeData = vi.hoisted(() => ({
  calls: [] as string[],
  overrides: {} as Record<string, DataFn | undefined>,
  // Nombres que exporta de verdad home.data.ts (HL-08, AR-01).
  exports: [] as string[],
  // Funciones reales, para derivar overrides de los datos simulados (AR-01, AR-03, AR-07).
  real: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/home/data/home.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  homeData.exports = Object.keys(actual)
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      homeData.real[name] = real
      return [
        name,
        (...args: unknown[]) => {
          homeData.calls.push(name)
          return (homeData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

// HL-08: la tarjeta de certificaciones lee la lista del módulo shared (mismo envoltorio).
const certificationsData = vi.hoisted(() => ({
  calls: [] as string[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/shared/certifications/data/certifications.data",
  async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return Object.fromEntries(
      Object.entries(actual).map(([name, value]) => {
        if (typeof value !== "function") return [name, value]
        const real = value as DataFn
        return [
          name,
          (...args: unknown[]) => {
            certificationsData.calls.push(name)
            return (certificationsData.overrides[name] ?? real)(...args)
          },
        ]
      })
    )
  }
)

const DATA_FUNCTIONS = [
  "getCrewStatus",
  "getReplacementAssignments",
  "getNextFlight",
]

type Assignment = Record<string, unknown>

// Lista real de asignaciones (AV-9344 y AV-9478). Falla con un mensaje claro si la función no existe.
const realAssignments = async () => {
  const real = homeData.real.getReplacementAssignments
  expect(
    real,
    "home.data.ts debe exportar getReplacementAssignments"
  ).toBeTypeOf("function")
  return (await (real as DataFn)()) as Assignment[]
}

const overrideAll = (fn: DataFn) => {
  for (const name of DATA_FUNCTIONS) homeData.overrides[name] = fn
  certificationsData.overrides.getCertifications = fn
}

afterEach(() => {
  homeData.calls.length = 0
  homeData.overrides = {}
  certificationsData.calls.length = 0
  certificationsData.overrides = {}
})

// Bloques con datos: WelcomeHeader, AssignmentStatus, ReplacementAssignmentBanner,
// NextFlightCard y CertificationsCard.
const BLOCKS_WITH_DATA = 5

const CERTIFICATIONS_LOADING = "Cargando certificaciones…"
const CERTIFICATIONS_ERROR = "No se pudo cargar el resumen de certificaciones."

const BANNER = "Asignación de reemplazo"
const ASSIGNMENTS_LOADING = "Cargando asignaciones de reemplazo…"
const ASSIGNMENTS_ERROR = "No se pudieron cargar las asignaciones de reemplazo."
// «No se pudo cargar…» o, en el banner, «No se pudieron cargar…».
const LOAD_ERROR = /^no se pud(o|ieron) cargar/i

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const statusesStartingWith = (container: HTMLElement, prefix: RegExp) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => prefix.test(element.textContent?.trim() ?? ""))

// Espera a que no quede ningún bloque cargando, con el próximo vuelo como ancla positiva.
const waitForLoaded = async () => {
  const main = await screen.findByRole("main")
  await screen.findByRole("heading", { level: 2, name: "AV-8520" })
  await waitFor(() =>
    expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(0)
  )
  return main
}

const findCertificationsCard = async () => {
  const heading = await screen.findByRole("heading", {
    level: 2,
    name: "Certificaciones",
  })
  const card = heading.closest("article")
  expect(card).not.toBeNull()
  return card as HTMLElement
}

// Una licencia con la forma `Certification` del módulo shared.
const certification = (id: string, name: string, expiresAt: string | null) => ({
  id,
  kind: "license",
  name,
  code: `COD-${id}`,
  issuer: `Organismo ${id}`,
  scope: `Alcance ${id}`,
  expiresAt,
  observation: null,
  appointment: null,
  details: [{ label: "Emisor", value: "Simulado" }],
})

// HL-06: hoy = 10 Nov 2026 a las 15:00 (hora local). ISO escritos a mano: en Bogotá
// `toISOString()` daría el día anterior.
const TODAY = new Date(2026, 10, 10, 15, 0)
const YESTERDAY = "2026-11-09"
const LAST_WEEK = "2026-11-03"
const TOMORROW = "2026-11-11"
const TODAY_ISO = "2026-11-10"
const NEXT_YEAR = "2027-11-10"

describe("Inicio del tripulante: carga, error y datos vacíos", () => {
  it("HT-03: mientras los datos no se resuelven, cada bloque con datos muestra «Cargando…» en un role=status", async () => {
    overrideAll(() => new Promise(() => {}))

    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(
        BLOCKS_WITH_DATA
      )
    )
    expect(homeData.calls).toEqual(expect.arrayContaining(DATA_FUNCTIONS))
    expect(certificationsData.calls).toContain("getCertifications")
  })

  it("HT-03: si los datos fallan, cada bloque con datos muestra «No se pudo cargar…» en un role=alert", async () => {
    overrideAll(() => Promise.reject(new Error("fallo simulado")))

    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(
        within(main)
          .queryAllByRole("alert")
          .filter((element) =>
            LOAD_ERROR.test(element.textContent?.trim() ?? "")
          )
      ).toHaveLength(BLOCKS_WITH_DATA)
    )
    expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(0)
  })

  it("HT-03: si solo falla el próximo vuelo, solo su tarjeta muestra el error y el resto, sus datos", async () => {
    homeData.overrides.getNextFlight = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.inicio)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/^no se pudo cargar/i)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(
      await screen.findByRole("heading", { level: 2, name: "Certificaciones" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { level: 2, name: "AV-8520" })
    ).not.toBeInTheDocument()
  })

  it.each([
    { availability: "vacaciones", label: "Vacaciones" },
    { availability: "incapacitado", label: "Incapacitado" },
  ])(
    "HL-03: con el estado «$availability», la región «Estado de asignación» muestra «$label» como texto",
    async ({ availability, label }) => {
      homeData.overrides.getCrewStatus = () =>
        Promise.resolve({
          base: "BOG / SKBO",
          operationalCondition: "Nivel Óptimo",
          availability,
        })

      renderRoute(PATHS.tripulante.inicio)

      const region = await screen.findByRole("region", {
        name: "Estado de asignación",
      })
      expect(await within(region).findByText(label)).toBeInTheDocument()
      expect(within(region).queryByText("Disponible")).not.toBeInTheDocument()
      expect(within(region).queryAllByRole("radio")).toHaveLength(0)
    }
  )
})

// Spec asignacion-reemplazo-tripulante. AR-03 sustituye a HT-13.
describe("Inicio del tripulante: asignaciones de reemplazo (datos)", () => {
  it("AR-01: home.data.ts exporta getReplacementAssignments y ya no exporta getUrgentReplacementRequest", async () => {
    renderRoute(PATHS.tripulante.inicio)

    await waitForLoaded()

    expect(homeData.exports).toContain("getReplacementAssignments")
    expect(homeData.exports).not.toContain("getUrgentReplacementRequest")
    expect(homeData.calls).toContain("getReplacementAssignments")
    expect(homeData.calls).not.toContain("getUrgentReplacementRequest")
  })

  it("AR-01: getReplacementAssignments devuelve dos asignaciones, AV-9344 («Hoy», aprobada por la Supervisora Camila Restrepo) y luego AV-9478 («Mañana»), sin plazo ni solicitante", async () => {
    renderRoute(PATHS.tripulante.inicio)
    await waitForLoaded()

    const assignments = await realAssignments()

    expect(assignments.map((item) => item.flightNumber)).toEqual([
      "AV-9344",
      "AV-9478",
    ])
    expect(assignments[0]).toMatchObject({
      dayLabel: "Hoy",
      approvedBy: "Supervisora Camila Restrepo (OCC Central)",
      departureUtc: "16:15",
      departureLocal: "11:15",
    })
    expect(assignments[1]).toMatchObject({
      dayLabel: "Mañana",
      approvedBy: "Supervisor Andrés Pardo (OCC Central)",
      departureUtc: "13:40",
      departureLocal: "08:40",
      estimatedDuration: "1h 05m",
    })
    for (const item of assignments) {
      expect(item).not.toHaveProperty("timeRemaining")
      expect(item).not.toHaveProperty("requestedBy")
    }
  })

  it("AR-03: con una lista vacía, no existe la región «Asignación de reemplazo»", async () => {
    homeData.overrides.getReplacementAssignments = () => Promise.resolve([])

    renderRoute(PATHS.tripulante.inicio)

    // Ancla positiva: el resto de la pantalla ya cargó y ningún bloque sigue cargando.
    await waitForLoaded()
    expect(homeData.calls).toContain("getReplacementAssignments")
    expect(
      screen.queryByRole("region", { name: BANNER })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { level: 2, name: BANNER })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/AV-9344/)).not.toBeInTheDocument()
  })

  it("AR-03: con una sola asignación, el banner muestra AV-9344 sin ningún texto «pendiente»", async () => {
    homeData.overrides.getReplacementAssignments = async () =>
      (await realAssignments()).slice(0, 1)

    renderRoute(PATHS.tripulante.inicio)

    const banner = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(banner).toHaveTextContent("Vuelo AV-9344"))
    expect(within(banner).queryByText(/pendiente/i)).not.toBeInTheDocument()
    expect(banner).not.toHaveTextContent(/pendiente/i)
  })

  it("AR-02: con tres asignaciones, el contador dice «+2 pendientes»", async () => {
    homeData.overrides.getReplacementAssignments = async () => {
      const list = await realAssignments()
      return [...list, { ...list[1], flightNumber: "AV-9500" }]
    }

    renderRoute(PATHS.tripulante.inicio)

    const banner = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(banner).toHaveTextContent("Vuelo AV-9344"))
    expect(within(banner).getByText("+2 pendientes")).toBeInTheDocument()
  })

  it("AR-08: si una recarga falla tras haber cargado, el banner muestra solo el error, sin el chip del vuelo", async () => {
    let call = 0
    homeData.overrides.getReplacementAssignments = async () => {
      call += 1
      if (call === 1) return realAssignments()
      throw new Error("fallo simulado")
    }

    renderRoute(PATHS.tripulante.inicio)

    const banner = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(banner).toHaveTextContent("Vuelo AV-9344"))

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    focusManager.setFocused(undefined)

    const alert = await within(banner).findByRole("alert")
    expect(alert).toHaveTextContent(ASSIGNMENTS_ERROR)
    expect(banner).not.toHaveTextContent("Vuelo AV-9344")
    expect(banner).not.toHaveTextContent(/pendiente/i)
  })

  it("AR-07: con una sola asignación, tras «Enterado» la región desaparece y el foco pasa a main#contenido, no a body", async () => {
    homeData.overrides.getReplacementAssignments = async () =>
      (await realAssignments()).slice(0, 1)
    const user = userEvent.setup()

    renderRoute(PATHS.tripulante.inicio)

    const banner = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(banner).toHaveTextContent("Vuelo AV-9344"))
    await user.click(within(banner).getByRole("button", { name: "Enterado" }))

    await findToast("Asignación del vuelo AV-9344 marcada como enterada")
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: BANNER })
      ).not.toBeInTheDocument()
    )
    expect(
      screen.queryByRole("heading", { level: 2, name: BANNER })
    ).not.toBeInTheDocument()
    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "contenido")
    await waitFor(() => expect(main).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })

  it(`AR-08: mientras getReplacementAssignments no se resuelve, solo el banner muestra «${ASSIGNMENTS_LOADING}» en un role=status`, async () => {
    homeData.overrides.getReplacementAssignments = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await screen.findByRole("heading", { level: 2, name: "Certificaciones" })
    await waitFor(() =>
      expect(
        statusesStartingWith(main, /^cargando/i).map((element) =>
          normalize(element.textContent)
        )
      ).toEqual([ASSIGNMENTS_LOADING])
    )
    expect(homeData.calls).toContain("getReplacementAssignments")
  })

  it(`AR-08: si getReplacementAssignments falla, solo el banner muestra «${ASSIGNMENTS_ERROR}» en un role=alert`, async () => {
    homeData.overrides.getReplacementAssignments = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.inicio)

    const alert = await screen.findByRole("alert")
    expect(normalize(alert.textContent)).toBe(ASSIGNMENTS_ERROR)
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await screen.findByRole("heading", { level: 2, name: "Certificaciones" })
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.queryByText(/AV-9344/)).not.toBeInTheDocument()
  })
})

describe("Inicio del tripulante: datos de certificaciones (HL-08)", () => {
  it("HL-08 (HT-04): home.data.ts exporta las tres funciones del Inicio y ya no exporta getCertificationsSummary", async () => {
    renderRoute(PATHS.tripulante.inicio)

    await waitForLoaded()

    expect(homeData.exports).toEqual(expect.arrayContaining(DATA_FUNCTIONS))
    expect(homeData.exports).not.toContain("getCertificationsSummary")
    expect(homeData.calls).not.toContain("getCertificationsSummary")
  })

  it("HL-08 (HT-03): mientras getCertifications no se resuelve, solo la tarjeta de certificaciones muestra «Cargando certificaciones…»", async () => {
    certificationsData.overrides.getCertifications = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await waitFor(() =>
      expect(
        statusesStartingWith(main, /^cargando/i).map((element) =>
          normalize(element.textContent)
        )
      ).toEqual([CERTIFICATIONS_LOADING])
    )
    expect(certificationsData.calls).toContain("getCertifications")
    expect(
      screen.queryByRole("heading", { level: 2, name: "Certificaciones" })
    ).not.toBeInTheDocument()
  })

  it("HL-08 (HT-03): si getCertifications falla, solo la tarjeta de certificaciones muestra el error", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.inicio)

    const alert = await screen.findByRole("alert")
    expect(normalize(alert.textContent)).toBe(CERTIFICATIONS_ERROR)
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(
      screen.queryByRole("heading", { level: 2, name: "Certificaciones" })
    ).not.toBeInTheDocument()
  })
})

describe("Inicio del tripulante: certificaciones calculadas con la fecha fijada (HL-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("HL-06: con los datos simulados, «4 Requisitos», «Evaluación Médica Clase 1» «En 35 días» y «Vigente», sin el examen psicofísico", async () => {
    renderRoute(PATHS.tripulante.inicio)

    const card = await findCertificationsCard()

    expect(certificationsData.calls).toContain("getCertifications")
    expect(within(card).getByText("Vigente")).toBeInTheDocument()
    expect(within(card).getByText("4 Requisitos")).toBeInTheDocument()
    expect(
      within(card).getByText("Evaluación Médica Clase 1")
    ).toBeInTheDocument()
    expect(within(card).getByText("En 35 días")).toBeInTheDocument()
    expect(card).not.toHaveTextContent(/examen psicofísico/i)
  })

  it("HL-06: con una vencida y otra que vence mañana, el distintivo dice «1 vencida» y la fila «En 1 día»", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve([
        certification("ayer", "Licencia Vencida Ayer", YESTERDAY),
        certification("manana", "Licencia Vence Mañana", TOMORROW),
        certification("lejana", "Licencia Lejana", NEXT_YEAR),
        certification("vitalicia", "Licencia Vitalicia", null),
      ])

    renderRoute(PATHS.tripulante.inicio)

    const card = await findCertificationsCard()

    expect(within(card).getByText("1 vencida")).toBeInTheDocument()
    expect(within(card).queryByText("Vigente")).not.toBeInTheDocument()
    expect(within(card).getByText("Licencia Vence Mañana")).toBeInTheDocument()
    expect(within(card).getByText("En 1 día")).toBeInTheDocument()
    expect(card).not.toHaveTextContent("Licencia Vencida Ayer")
    // Aptas = vigentes + vitalicias: la lejana y la vitalicia (la de mañana está próxima a vencer).
    expect(within(card).getByText("2 Requisitos")).toBeInTheDocument()
  })

  it("HL-06: con dos vencidas, el distintivo dice «2 vencidas»", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve([
        certification("ayer", "Licencia Vencida Ayer", YESTERDAY),
        certification("semana", "Licencia Vencida Hace Una Semana", LAST_WEEK),
        certification("lejana", "Licencia Lejana", NEXT_YEAR),
      ])

    renderRoute(PATHS.tripulante.inicio)

    const card = await findCertificationsCard()

    expect(within(card).getByText("2 vencidas")).toBeInTheDocument()
    expect(within(card).queryByText("Vigente")).not.toBeInTheDocument()
  })

  it("HL-06: con una licencia que vence hoy, la fila la muestra con «Hoy»", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve([
        certification("lejana", "Licencia Lejana", NEXT_YEAR),
        certification("hoy", "Licencia Vence Hoy", TODAY_ISO),
      ])

    renderRoute(PATHS.tripulante.inicio)

    const card = await findCertificationsCard()

    expect(within(card).getByText("Vigente")).toBeInTheDocument()
    expect(within(card).getByText("Licencia Vence Hoy")).toBeInTheDocument()
    expect(within(card).getByText("Hoy")).toBeInTheDocument()
    expect(card).not.toHaveTextContent("Licencia Lejana")
  })

  it("HL-06: si ninguna licencia con fecha vence hoy o después, la fila de próximo vencimiento no aparece", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve([
        certification("ayer", "Licencia Vencida Ayer", YESTERDAY),
        certification("vitalicia", "Licencia Vitalicia", null),
      ])

    renderRoute(PATHS.tripulante.inicio)

    const card = await findCertificationsCard()

    expect(within(card).getByText("1 vencida")).toBeInTheDocument()
    expect(card).not.toHaveTextContent("Licencia Vencida Ayer")
    expect(card).not.toHaveTextContent("Licencia Vitalicia")
    expect(card).not.toHaveTextContent(/\bEn \d+ días?\b/)
    expect(within(card).queryByText("Hoy")).not.toBeInTheDocument()
  })
})
