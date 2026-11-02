import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec mis-vuelos: carga y error de las métricas (MV-03) y de la lista de Próximos (MV-12),
// con fallos simulados, y las consultas que se piden al entrar («Datos simulados»).

// Hoy la ruta no es lazy, pero puede pasar a serlo (MV-13): la primera espera lleva margen.
const LAZY = { timeout: 3000 }

type DataFn = (...args: unknown[]) => Promise<unknown>

// Cada función de flights.data.ts se envuelve para registrar sus llamadas.
// Sin override, delega en la función real (datos simulados de la spec).
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const flightsData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/flights/data/flights.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          flightsData.calls.push({ name, args })
          return (flightsData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

const callsTo = (name: string) =>
  flightsData.calls.filter((call) => call.name === name)

const H1 = "Mis Vuelos Asignados"
const METRICS_LOADING = "Cargando métricas del mes…"
const METRICS_ERROR = "No se pudieron cargar las métricas."
const FLIGHTS_LOADING = "Cargando vuelos…"
const FLIGHTS_ERROR = "No se pudieron cargar los vuelos."

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const withText = (elements: HTMLElement[], text: string) =>
  elements.filter((element) => normalize(element.textContent) === text)

const statusesWithText = (container: HTMLElement, text: string) =>
  withText(within(container).queryAllByRole("status"), text)

const alertsWithText = (container: HTMLElement, text: string) =>
  withText(within(container).queryAllByRole("alert"), text)

const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(normalize(element.textContent)))

// El panel de la pestaña activa (al entrar, Próximos Vuelos).
const upcomingPanel = () =>
  waitFor(() => {
    const tab = screen.getByRole("tab", { name: /^Próximos Vuelos/ })
    expect(tab).toHaveAttribute("aria-selected", "true")
    const panels = screen.getAllByRole("tabpanel")
    expect(panels, "un único tabpanel visible").toHaveLength(1)
    return panels[0]
  })

const findMain = async () => {
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  return screen.getByRole("main")
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

afterEach(() => {
  flightsData.calls.length = 0
  flightsData.overrides = {}
})

describe("Mis Vuelos: carga y error de las métricas (MV-03)", () => {
  it("MV-03: mientras cargan las métricas hay un único role=status «Cargando métricas del mes…» y no se ven sus datos", async () => {
    flightsData.overrides.getFlightMetrics = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.misVuelos)

    const main = await findMain()
    await waitFor(() =>
      expect(statusesWithText(main, METRICS_LOADING)).toHaveLength(1)
    )
    expect(callsTo("getFlightMetrics").length).toBeGreaterThan(0)
    expect(within(main).queryByRole("meter")).toBeNull()
    expect(main).not.toHaveTextContent("45h 00m")
    expect(main).not.toHaveTextContent("16h 20m")
    expect(main).not.toHaveTextContent("sectores completados")
    expect(alertsWithText(main, METRICS_ERROR)).toHaveLength(0)
  })

  it("MV-03: si fallan las métricas, hay un único role=alert «No se pudieron cargar las métricas.» y desaparece la carga", async () => {
    flightsData.overrides.getFlightMetrics = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.misVuelos)

    const main = await findMain()
    await waitFor(() =>
      expect(alertsWithText(main, METRICS_ERROR)).toHaveLength(1)
    )
    // Las listas cargan bien: cuando terminan, ese es el único alert de la pantalla.
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
    expect(within(main).getAllByRole("alert")).toHaveLength(1)
    expect(statusesWithText(main, METRICS_LOADING)).toHaveLength(0)
    expect(callsTo("getFlightMetrics").length).toBeGreaterThan(0)
    expect(within(main).queryByRole("meter")).toBeNull()
    expect(main).not.toHaveTextContent("45h 00m")
  })
})

describe("Mis Vuelos: carga y error de los próximos vuelos (MV-12)", () => {
  it("MV-12: mientras carga Próximos, su panel muestra un único role=status «Cargando vuelos…» y ningún vuelo", async () => {
    flightsData.overrides.getUpcomingFlights = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.misVuelos)

    const main = await findMain()
    const panel = await upcomingPanel()
    await waitFor(() =>
      expect(statusesWithText(panel, FLIGHTS_LOADING)).toHaveLength(1)
    )
    expect(statusesWithText(main, FLIGHTS_LOADING)).toHaveLength(1)
    expect(within(panel).queryAllByRole("article")).toHaveLength(0)
    expect(alertsWithText(main, FLIGHTS_ERROR)).toHaveLength(0)
    expect(callsTo("getUpcomingFlights").length).toBeGreaterThan(0)
  })

  it("MV-09 (contrato): mientras carga la lista activa, el status de resultados está montado y vacío", async () => {
    flightsData.overrides.getUpcomingFlights = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.misVuelos)

    const main = await findMain()
    // Las métricas sí cargan: se espera a que terminen para que solo quede la carga de la lista.
    await waitFor(() => expect(main).toHaveTextContent("45h 00m"))
    await waitFor(() =>
      expect(statusesWithText(main, FLIGHTS_LOADING)).toHaveLength(1)
    )
    const others = within(main)
      .queryAllByRole("status")
      .filter((element) => !/^cargando/i.test(normalize(element.textContent)))
    expect(others, "un único status de resultados, vacío").toHaveLength(1)
    expect(normalize(others[0].textContent)).toBe("")
  })

  it("MV-12: si getUpcomingFlights falla, el panel de Próximos muestra un único role=alert «No se pudieron cargar los vuelos.»", async () => {
    flightsData.overrides.getUpcomingFlights = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.misVuelos)

    await findMain()
    const panel = await upcomingPanel()
    await waitFor(() =>
      expect(alertsWithText(panel, FLIGHTS_ERROR)).toHaveLength(1)
    )
    expect(within(panel).getAllByRole("alert")).toHaveLength(1)
    expect(statusesWithText(panel, FLIGHTS_LOADING)).toHaveLength(0)
    expect(within(panel).queryAllByRole("article")).toHaveLength(0)
    expect(callsTo("getUpcomingFlights").length).toBeGreaterThan(0)
  })
})

describe("Mis Vuelos: consultas al entrar (Datos simulados)", () => {
  it("Datos simulados: al entrar se piden las métricas y las dos listas, sin abrir el historial", async () => {
    renderRoute(PATHS.tripulante.misVuelos)

    await screen.findByRole(
      "tab",
      { name: "Historial de Vuelos Anteriores 4" },
      LAZY
    )
    expect(callsTo("getFlightMetrics").length).toBeGreaterThan(0)
    expect(callsTo("getUpcomingFlights").length).toBeGreaterThan(0)
    expect(callsTo("getFlightHistory").length).toBeGreaterThan(0)
  })
})
