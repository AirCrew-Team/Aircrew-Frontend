import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Tripulación del Supervisor (spec docs/specs/tripulacion-supervisor.md): estados de carga
// (TC-02), error (TC-03), turno vacío (TC-04), filtro sin personas (TC-21) y protección de la
// ruta (TC-22), con la función de datos sustituida.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de shiftCrew.data.ts se envuelve: registra su nombre y argumentos y, si hay
// override, lo usa en lugar de la real. El test no importa el módulo, así compila aunque
// aún no exista.
const data = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/shiftCrew/data/shiftCrew.data", async () => {
    const actual: Record<string, unknown> = await import(
      "@/tests/fixtures/shiftCrew.fixtures"
    )
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          data.calls.push({ name, args })
          return (data.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

afterEach(() => {
  data.calls = []
  data.overrides = {}
})

// Forma mínima de la spec (los tipos reales viven en shiftCrew.types.ts).
interface ShiftCrewLike {
  base: { code: string; name: string }
  members: { status: string }[]
}

const H1 = "Tripulación"
const LOADING = "Cargando tripulación…"
const ERROR = "No se pudo cargar la tripulación del turno."
const EMPTY = "No hay tripulantes asignados al turno."
const EMPTY_FILTER = "No hay tripulantes en este estado."
const LIST = "Tripulantes del turno"
const FILTER_GROUP = "Filtrar por estado"

const never = () => new Promise(() => {})
const fail = () => Promise.reject(new Error("servicio caído"))

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const withText = (elements: HTMLElement[], text: string) =>
  elements.filter((element) => normalize(element.textContent) === text)

const statusesWithText = (main: HTMLElement, text: string) =>
  withText(within(main).queryAllByRole("status"), text)

const alertsWithText = (main: HTMLElement, text: string) =>
  withText(within(main).queryAllByRole("alert"), text)

const isLoading = (element: HTMLElement) =>
  normalize(element.textContent) === LOADING

// El status de resultados es el único role=status de la pantalla que no es el de carga.
const resultsStatuses = (main: HTMLElement) =>
  within(main)
    .queryAllByRole("status")
    .filter((element) => !isLoading(element))

const expectEmptyResultsStatus = (main: HTMLElement) => {
  const statuses = resultsStatuses(main)
  expect(statuses, "un único status de resultados, montado").toHaveLength(1)
  expect(normalize(statuses[0].textContent), "status de resultados vacío").toBe(
    ""
  )
}

// Ni panorama (sections con nombre y sus h2), ni buscador, ni filtros, ni lista; tampoco
// el h2 sr-only de la lista: no hay ningún h2 en main.
const expectNoBoard = (main: HTMLElement) => {
  expect(within(main).queryAllByRole("region"), "sin panorama").toHaveLength(0)
  expect(
    within(main).queryAllByRole("heading", { level: 2 }),
    "ningún h2 en main"
  ).toHaveLength(0)
  expect(within(main).queryByRole("searchbox"), "sin buscador").toBeNull()
  expect(
    within(main).queryByRole("group", { name: FILTER_GROUP }),
    "sin filtros"
  ).toBeNull()
  expect(within(main).queryByRole("list"), "sin lista").toBeNull()
  expect(within(main).queryAllByRole("article"), "sin tarjetas").toHaveLength(0)
  expect(main).not.toHaveTextContent("Mostrando")
}

// El elemento más interno cuyo texto completo (normalizado) es `text`.
const getByFullText = (container: HTMLElement, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])'

const expectNoLiveRegion = (element: HTMLElement) => {
  expect(element).not.toHaveAttribute("role")
  expect(element.closest(LIVE_REGION), "sin región viva").toBeNull()
}

const findMain = async () => {
  renderRoute(PATHS.superVisor.tripulacion)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return screen.getByRole("main")
}

const loadRealCrew = async () => {
  const actual = await vi.importActual<{
    getShiftCrew: () => Promise<ShiftCrewLike>
  }>("@/tests/fixtures/shiftCrew.fixtures")
  return actual.getShiftCrew()
}

describe("Tripulación: datos de la pantalla", () => {
  it("TC-02 a TC-04 (ancla): sin override, la lista sale de getShiftCrew", async () => {
    const main = await findMain()

    expect(
      await within(main).findByRole("list", { name: LIST })
    ).toBeInTheDocument()
    expect(data.calls.map(({ name }) => name)).toContain("getShiftCrew")
  })
})

describe("Tripulación: estados de carga, error y vacío (TC-02 a TC-04)", () => {
  it("TC-02 mientras carga hay un solo role=status «Cargando tripulación…», el status de resultados montado y vacío, y no hay panorama, ni buscador, ni filtros, ni lista", async () => {
    data.overrides.getShiftCrew = never

    const main = await findMain()

    await waitFor(() => expect(statusesWithText(main, LOADING)).toHaveLength(1))
    expect(screen.getAllByText(LOADING)).toHaveLength(1)
    expectEmptyResultsStatus(main)
    expect(within(main).getAllByRole("status")).toHaveLength(2)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expectNoBoard(main)
    expect(data.calls.map(({ name }) => name)).toContain("getShiftCrew")
  })

  it("TC-03 si getShiftCrew falla hay un solo role=alert «No se pudo cargar la tripulación del turno.», sin panorama ni lista, y el status de resultados montado y vacío", async () => {
    data.overrides.getShiftCrew = fail

    const main = await findMain()

    await waitFor(() => expect(alertsWithText(main, ERROR)).toHaveLength(1))
    expect(within(main).getAllByRole("alert")).toHaveLength(1)
    expect(screen.queryByText(LOADING)).toBeNull()
    expectEmptyResultsStatus(main)
    expectNoBoard(main)
    expect(
      screen.getByRole("heading", { level: 1, name: H1 })
    ).toBeInTheDocument()
  })

  it("TC-04 con members: [] se ve «No hay tripulantes asignados al turno.» sin región viva, sin carga, sin alert, sin panorama ni lista, y el status de resultados montado y vacío", async () => {
    data.overrides.getShiftCrew = () =>
      Promise.resolve({
        base: { code: "BOG", name: "Base Eldorado" },
        members: [],
      })

    const main = await findMain()

    const empty = await waitFor(() => getByFullText(main, EMPTY))
    expectNoLiveRegion(empty)
    expect(screen.queryByText(LOADING)).toBeNull()
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expectEmptyResultsStatus(main)
    expectNoBoard(main)
    expect(main).not.toHaveTextContent("Ningún tripulante coincide")
    expect(main).not.toHaveTextContent(EMPTY_FILTER)
  })
})

describe("Tripulación: filtro sin personas (TC-21)", () => {
  it("TC-21 sin ausentes en los datos, los filtros dicen «Todos (34)» y «Ausentes (0)», y «Ausentes (0)» muestra «No hay tripulantes en este estado.» sin región viva y «0 tripulantes»", async () => {
    const real = await loadRealCrew()
    data.overrides.getShiftCrew = () =>
      Promise.resolve({
        ...real,
        members: real.members.filter(({ status }) => status !== "ausente"),
      })
    const user = userEvent.setup()

    const main = await findMain()

    const group = await within(main).findByRole("group", {
      name: FILTER_GROUP,
    })
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => normalize(button.textContent))
    ).toEqual([
      "Todos (34)",
      "De guardia (12)",
      "En vuelo (10)",
      "Programados (8)",
      "En descanso (4)",
      "Ausentes (0)",
    ])

    await user.click(
      within(group).getByRole("button", { name: "Ausentes (0)" })
    )

    await waitFor(() =>
      expect(
        within(group).getByRole("button", { name: "Ausentes (0)" })
      ).toHaveAttribute("aria-pressed", "true")
    )
    const message = await waitFor(() => getByFullText(main, EMPTY_FILTER))
    expectNoLiveRegion(message)
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
    expect(main).not.toHaveTextContent("Ningún tripulante coincide")
    await waitFor(() =>
      expect(normalize(resultsStatuses(main)[0]?.textContent ?? null)).toBe(
        "0 tripulantes"
      )
    )
    expect(within(main).getAllByRole("status")).toHaveLength(1)
  })
})

describe("Tripulación: protección de la ruta (TC-22, regresión)", () => {
  it.each([
    { role: ROLES.TRIPULANTE, home: PATHS.tripulante.inicio },
    { role: ROLES.SUPER_ADMIN, home: PATHS.superAdmin.inicio },
  ])(
    "TC-22 un $role que abre /supervisor/tripulacion termina en $home y getShiftCrew no se llama",
    async ({ role, home }) => {
      useAuthStore.getState().setMockRole(role)

      const router = renderRoute(PATHS.superVisor.tripulacion)

      await waitFor(() => expect(router.state.location.pathname).toBe(home))
      await screen.findByRole("main")
      expect(data.calls.map(({ name }) => name)).not.toContain("getShiftCrew")
    }
  )
})
