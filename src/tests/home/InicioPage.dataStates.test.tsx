import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

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
  // Nombres que exporta de verdad home.data.ts (HL-08).
  exports: [] as string[],
}))

vi.mock("@/modules/home/data/home.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  homeData.exports = Object.keys(actual)
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
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
  "getUrgentReplacementRequest",
  "getNextFlight",
]

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

// Bloques con datos: WelcomeHeader, AssignmentStatus, ReplacementRequestBanner,
// NextFlightCard y CertificationsCard.
const BLOCKS_WITH_DATA = 5

const CERTIFICATIONS_LOADING = "Cargando certificaciones…"
const CERTIFICATIONS_ERROR = "No se pudo cargar el resumen de certificaciones."

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
            /^no se pudo cargar/i.test(element.textContent?.trim() ?? "")
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

  it("HT-13: si getUrgentReplacementRequest devuelve null, no existe la región «Solicitud de reemplazo urgente»", async () => {
    homeData.overrides.getUrgentReplacementRequest = () => Promise.resolve(null)

    renderRoute(PATHS.tripulante.inicio)

    // Ancla positiva: el resto de la pantalla ya cargó y ningún bloque sigue cargando.
    const main = await screen.findByRole("main")
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await waitFor(() =>
      expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(0)
    )
    expect(homeData.calls).toContain("getUrgentReplacementRequest")
    expect(
      screen.queryByRole("region", { name: /solicitud de reemplazo urgente/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/AV-9344/)).not.toBeInTheDocument()
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
