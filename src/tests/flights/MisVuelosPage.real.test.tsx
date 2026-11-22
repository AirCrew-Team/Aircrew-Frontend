import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  mockMetrics,
  mockMetricsError,
  mockMyAbsences,
  mockMyAbsencesError,
  mockMyAssignments,
  mockMyAssignmentsError,
  TODAY,
} from "../mocks/crewFlightsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"

// FE-4 (docs/specs/cierre-pendientes.md): Mis Vuelos con la sesión real.
// - Las listas salen de GET /api/flights/assignments/me con status (upcoming|completed) y
//   el mes del selector; las métricas, de GET /api/crew/crew-members/me/metrics.
// - Cada vuelo con una ausencia propia (GET /api/crew/absences/me, cruce por flight_id)
//   lleva la marca «Ausencia reportada: <estado>»; las canceladas no marcan.
// - El backend no trae comandante, ICAO ni datos de despacho: no se inventan.

const LAZY = { timeout: 3000 }
const H1 = "Mis Vuelos Asignados"
const TAB = {
  upcoming: "Próximos Vuelos",
  history: "Historial de Vuelos Anteriores",
}

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const activePanel = () => {
  const panels = screen.getAllByRole("tabpanel")
  expect(panels, "un único tabpanel visible").toHaveLength(1)
  return panels[0]
}

const panelFlights = () =>
  within(activePanel())
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 2 }).textContent)
    )

const expectPanelFlights = (flights: string[]) =>
  waitFor(() => expect(panelFlights()).toEqual(flights))

const articleOf = (flightNumber: string) => {
  const heading = within(activePanel()).getByRole("heading", {
    level: 2,
    name: flightNumber,
  })
  const article = heading.closest("article")
  expect(article, `tarjeta de ${flightNumber}`).not.toBeNull()
  return article as HTMLElement
}

const openPage = async () => {
  useAuthStore.getState().setUser(REAL_USERS.crew)
  renderRoute(PATHS.tripulante.misVuelos)
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  return screen.getByRole("main")
}

const mockAll = () => {
  const assignments = mockMyAssignments()
  const metrics = mockMetrics()
  mockMyAbsences()
  return { assignments, metrics }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("FE-4: listas de Mis Vuelos con la sesión real", () => {
  it("FE-4: pide los próximos y los realizados del mes actual a assignments/me", async () => {
    const { assignments } = mockAll()
    await openPage()

    await expectPanelFlights(["DL2201", "DL1102"])
    expect(assignments).toEqual(
      expect.arrayContaining([
        "status=upcoming&month=2026-11",
        "status=completed&month=2026-11",
      ])
    )
    expect(
      screen.getByRole("tab", { name: `${TAB.upcoming} 2` })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: `${TAB.history} 1` })
    ).toBeInTheDocument()
  })

  it("FE-4: la tarjeta de un reemplazo muestra ruta, ciudades, bloque, salida UTC y local, equipo, rol y puerta reales", async () => {
    mockAll()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    const text = normalize(articleOf("DL2201").textContent)
    for (const fragment of [
      "Reemplazo Asignado",
      "ATL",
      "Atlanta",
      "LAX",
      "Los Angeles",
      "4h 55m",
      "Lun 23 Nov, 16:15 UTC",
      "11:15 Local",
      "Airbus A321neo",
      "N501DN",
      "Primer Oficial",
      "Puerta B12",
    ]) {
      expect(text).toContain(fragment)
    }
    // Sin datos del backend: ni comandante ni códigos ICAO de ejemplo.
    expect(text).not.toContain("Comandante:")
    expect(text).not.toMatch(/SKBO|KMIA|KLAX/)
  })

  it("FE-4: un vuelo propio sin puerta dice «Por asignar» y su estado es «Programado Roster»", async () => {
    mockAll()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    const text = normalize(articleOf("DL1102").textContent)
    expect(text).toContain("Programado Roster")
    expect(text).toContain("Por asignar")
    expect(text).toContain("2h 10m")
  })

  it("FE-4: el historial muestra los vuelos realizados del mes como «Completado»", async () => {
    mockAll()
    const user = userEvent.setup()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    await user.click(screen.getByRole("tab", { name: `${TAB.history} 1` }))

    await expectPanelFlights(["DL0875"])
    expect(normalize(articleOf("DL0875").textContent)).toContain("Completado")
  })

  it("FE-4: al cambiar de mes se piden los vuelos de ese mes", async () => {
    const { assignments } = mockAll()
    const user = userEvent.setup()
    const main = await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    await user.selectOptions(
      within(main).getByRole("combobox", { name: "Mes del roster" }),
      "2026-10"
    )

    expect(
      await screen.findByRole("tab", { name: `${TAB.upcoming} 0` })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(assignments).toEqual(
        expect.arrayContaining([
          "status=upcoming&month=2026-10",
          "status=completed&month=2026-10",
        ])
      )
    )
    await expectPanelFlights([])
    await user.click(screen.getByRole("tab", { name: `${TAB.history} 1` }))
    await expectPanelFlights(["DL0300"])
    expect(normalize(articleOf("DL0300").textContent)).toContain(
      "Internacional"
    )
  })

  it("FE-4: el buscador filtra los vuelos reales por destino", async () => {
    mockAll()
    const user = userEvent.setup()
    const main = await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    await user.type(
      within(main).getByRole("searchbox", { name: "Buscar vuelo" }),
      "JFK"
    )

    await expectPanelFlights(["DL1102"])
    await waitFor(() =>
      expect(
        Array.from(
          main.querySelectorAll<HTMLElement>('[role="status"].sr-only')
        ).map((status) => normalize(status.textContent))
      ).toContain("1 vuelo en Próximos Vuelos, Noviembre 2026")
    )
  })

  it("FE-4: sin vuelos en el mes, las dos pestañas muestran su estado vacío y no hay alertas", async () => {
    mockMyAssignments([])
    mockMetrics()
    mockMyAbsences([])
    const user = userEvent.setup()
    const main = await openPage()

    await waitFor(() =>
      expect(activePanel()).toHaveTextContent("No hay vuelos para este mes.")
    )
    await user.click(screen.getByRole("tab", { name: `${TAB.history} 0` }))
    await waitFor(() =>
      expect(activePanel()).toHaveTextContent("No hay vuelos para este mes.")
    )
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
  })

  it("FE-4: si assignments/me falla, la pestaña muestra «No se pudieron cargar los vuelos.» en un alert", async () => {
    mockMyAssignmentsError()
    mockMetrics()
    mockMyAbsences()
    await openPage()

    await waitFor(() =>
      expect(
        within(activePanel())
          .queryAllByRole("alert")
          .map((alert) => normalize(alert.textContent))
      ).toEqual(["No se pudieron cargar los vuelos."])
    )
  })
})

describe("FE-4: ausencias propias en Mis Vuelos", () => {
  it("FE-4: un vuelo de una ausencia por fechas lleva «Ausencia reportada: Esperando confirmación»", async () => {
    mockAll()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    await waitFor(() =>
      expect(
        within(articleOf("DL1102")).getByText(
          "Ausencia reportada: Esperando confirmación"
        )
      ).toBeInTheDocument()
    )
    // La ausencia cancelada sobre DL2201 no marca el vuelo.
    expect(articleOf("DL2201")).not.toHaveTextContent("Ausencia reportada")
  })

  it("FE-4: un vuelo con una ausencia directa ya cubierta lleva «Ausencia reportada: Cubierta»", async () => {
    mockAll()
    const user = userEvent.setup()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    await user.click(screen.getByRole("tab", { name: `${TAB.history} 1` }))
    await expectPanelFlights(["DL0875"])

    await waitFor(() =>
      expect(
        within(articleOf("DL0875")).getByText("Ausencia reportada: Cubierta")
      ).toBeInTheDocument()
    )
  })

  it("FE-4: si absences/me falla, los vuelos se ven igual y un alert avisa que faltan las ausencias", async () => {
    mockMyAssignments()
    mockMetrics()
    mockMyAbsencesError()
    const main = await openPage()

    await expectPanelFlights(["DL2201", "DL1102"])
    await waitFor(() =>
      expect(
        within(main)
          .queryAllByRole("alert")
          .map((alert) => normalize(alert.textContent))
      ).toEqual(["No se pudieron cargar tus ausencias reportadas."])
    )
  })
})

describe("FE-4: métricas de Mis Vuelos con la sesión real", () => {
  it("FE-4: muestra las horas del mes, el límite FAA, el cierre del ciclo, el descanso y los sectores del backend", async () => {
    const { metrics } = mockAll()
    const main = await openPage()

    await waitFor(() => expect(main).toHaveTextContent("45h 30m"))
    const text = normalize(main.textContent)
    for (const fragment of [
      "/ 100h máx legal",
      "FAA 14 CFR Part 117",
      "+54.5h de margen",
      "Ciclo cierra en 8 días",
      "10h 00m",
      "Cumplido",
      "Noviembre 2026",
      "1 sectores completados",
    ]) {
      expect(text).toContain(fragment)
    }
    expect(
      screen.getByRole("meter", { name: "Consumo FDP mensual" })
    ).toHaveAttribute("aria-valuenow", "45.5")
    // Sin month: el backend usa el mes actual en la zona de la base.
    expect(metrics).toEqual(expect.arrayContaining([""]))
  })

  it("FE-4: si las métricas fallan, se ve «No se pudieron cargar las métricas.» en un alert", async () => {
    mockMyAssignments()
    mockMetricsError()
    mockMyAbsences()
    const main = await openPage()

    await waitFor(() =>
      expect(
        within(main)
          .queryAllByRole("alert")
          .map((alert) => normalize(alert.textContent))
      ).toContain("No se pudieron cargar las métricas.")
    )
  })
})
