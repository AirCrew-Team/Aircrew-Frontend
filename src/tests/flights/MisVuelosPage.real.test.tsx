import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  COMPLETED_ASSIGNMENT,
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
//   el mes LOCAL del selector como from/to (inicio y fin del mes, to exclusivo); las
//   métricas, de GET /api/crew/crew-members/me/metrics.
// - Un vuelo asignado con una ausencia propia aún en revisión (GET /api/crew/absences/me,
//   cruce por flight_id) lleva la marca «Ausencia reportada: En revisión».
// - Al aprobarse el reemplazo, el vuelo sale de assignments/me: «Próximos Vuelos» lo lista
//   en «Vuelos liberados por tus ausencias» con su estado (esperando confirmación o
//   cubierto) mientras no haya salido. Las canceladas no cuentan.
// - El backend no trae comandante, ICAO ni datos de despacho: no se inventan.

const LAZY = { timeout: 3000 }
const H1 = "Mis Vuelos Asignados"
const TAB = {
  upcoming: "Próximos Vuelos",
  history: "Historial de Vuelos Anteriores",
}

const RELEASED = "Vuelos liberados por tus ausencias"

// Inicio y fin (exclusivo) del mes local, en ISO, como los manda la pantalla.
const monthRange = (year: number, monthIndex: number) => ({
  from: new Date(year, monthIndex, 1).toISOString(),
  to: new Date(year, monthIndex + 1, 1).toISOString(),
})

// Cada query registrada como objeto (los «:» de las fechas llegan codificados).
const parseQueries = (queries: string[]) =>
  queries.map((query) => Object.fromEntries(new URLSearchParams(query)))

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
    expect(parseQueries(assignments)).toEqual(
      expect.arrayContaining([
        { status: "upcoming", ...monthRange(2026, 10) },
        { status: "completed", ...monthRange(2026, 10) },
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

  it("FE-4: el historial va del vuelo más reciente al más antiguo, como la demo", async () => {
    // El backend los da por salida, del más antiguo al más reciente.
    const later = {
      ...COMPLETED_ASSIGNMENT,
      id: "asg-5",
      flight: {
        ...COMPLETED_ASSIGNMENT.flight,
        id: "fl-0876",
        flight_number: "DL0876",
        departure_at: "2026-11-15T12:00:00.000Z",
        arrival_at: "2026-11-15T14:45:00.000Z",
      },
    }
    mockMyAssignments([COMPLETED_ASSIGNMENT, later])
    mockMetrics()
    mockMyAbsences([])
    const user = userEvent.setup()
    await openPage()

    await user.click(
      await screen.findByRole("tab", { name: `${TAB.history} 2` })
    )

    await expectPanelFlights(["DL0876", "DL0875"])
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
      expect(parseQueries(assignments)).toEqual(
        expect.arrayContaining([
          { status: "upcoming", ...monthRange(2026, 9) },
          { status: "completed", ...monthRange(2026, 9) },
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
    expect(screen.queryByRole("region", { name: RELEASED })).toBeNull()
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
  it("FE-4: un vuelo asignado con una ausencia aún en revisión lleva «Ausencia reportada: En revisión»", async () => {
    mockAll()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    await waitFor(() =>
      expect(
        within(articleOf("DL1102")).getByText("Ausencia reportada: En revisión")
      ).toBeInTheDocument()
    )
    // La ausencia cancelada sobre DL2201 no marca el vuelo.
    expect(articleOf("DL2201")).not.toHaveTextContent("Ausencia reportada")
  })

  it("I-2: «Próximos Vuelos» lista los vuelos liberados por tus ausencias que aún no salen, por salida, con su estado", async () => {
    mockAll()
    await openPage()
    await expectPanelFlights(["DL2201", "DL1102"])

    const block = await within(activePanel()).findByRole("region", {
      name: RELEASED,
    })
    const items = within(block)
      .getAllByRole("listitem")
      .map((item) => normalize(item.textContent))
    expect(items).toHaveLength(2)
    expect(items[0]).toContain("DL0990")
    expect(items[0]).toMatch(/ATL.*BOS/)
    expect(items[0]).toContain("Mié 25 Nov, 18:30 UTC")
    expect(items[0]).toContain("Cubierto por otro tripulante")
    expect(items[1]).toContain("DL1450")
    expect(items[1]).toMatch(/ATL.*MCO/)
    expect(items[1]).toContain("Dom 29 Nov, 14:00 UTC")
    expect(items[1]).toContain("Esperando confirmación del reemplazo")
    // Ni el cubierto que ya voló (DL0812) ni el de la ausencia cancelada (DL2201).
    expect(block).not.toHaveTextContent("DL0812")
    expect(block).not.toHaveTextContent("DL2201")
    // Los liberados no son tarjetas de vuelo ni cuentan en la pestaña.
    expect(panelFlights()).toEqual(["DL2201", "DL1102"])
    expect(
      screen.getByRole("tab", { name: `${TAB.upcoming} 2` })
    ).toBeInTheDocument()
  })

  it("I-2: las tarjetas solo llevan la marca «En revisión», y el historial no lista los vuelos liberados", async () => {
    mockAll()
    const user = userEvent.setup()
    await openPage()
    await within(activePanel()).findByRole("region", { name: RELEASED })

    for (const article of within(activePanel()).getAllByRole("article")) {
      expect(article).not.toHaveTextContent(/Cubiert|Esperando confirmación/)
    }

    await user.click(screen.getByRole("tab", { name: `${TAB.history} 1` }))
    await expectPanelFlights(["DL0875"])
    expect(screen.queryByRole("region", { name: RELEASED })).toBeNull()
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
