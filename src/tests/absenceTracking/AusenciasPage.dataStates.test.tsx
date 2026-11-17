import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Ausencias del Supervisor (spec docs/specs/ausencias-supervisor.md): estados de carga (AS-02),
// error (AS-03) y turno sin ausencias (AS-04), con la función de datos sustituida.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de absenceTracking.data.ts se envuelve: registra su nombre y argumentos y,
// si hay override, lo usa en lugar de la real. El test no importa el módulo, así compila
// aunque aún no exista.
const data = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/absenceTracking/data/absenceTracking.data",
  async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
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
  }
)

afterEach(() => {
  data.calls = []
  data.overrides = {}
})

const H1 = "Ausencias"
const LOADING = "Cargando ausencias…"
const ERROR = "No se pudieron cargar las ausencias."
const EMPTY = "No hay ausencias reportadas en el turno."
const SEARCH = "Buscar vuelo o tripulante"
const COLUMNS = [
  "Por aprobar (7)",
  "Esperando confirmación (1)",
  "Cubiertas (2)",
]

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

// Ni columnas (section con nombre = región) ni buscador.
const expectNoBoard = (main: HTMLElement) => {
  expect(within(main).queryAllByRole("region"), "sin columnas").toHaveLength(0)
  expect(
    within(main).queryAllByRole("heading", { level: 2 }),
    "sin h2 de columnas"
  ).toHaveLength(0)
  expect(within(main).queryByRole("searchbox"), "sin buscador").toBeNull()
  expect(main).not.toHaveTextContent("Sin ausencias en este estado.")
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

const findMain = async () => {
  renderRoute(PATHS.superVisor.ausencias)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return screen.getByRole("main")
}

describe("Ausencias: datos de la pantalla", () => {
  it("AS-02 a AS-04 (ancla): sin override, el tablero sale de getAbsenceTracking", async () => {
    const main = await findMain()

    for (const name of COLUMNS) {
      expect(
        await within(main).findByRole("region", { name })
      ).toBeInTheDocument()
    }
    expect(data.calls.map(({ name }) => name)).toContain("getAbsenceTracking")
  })
})

describe("Ausencias: estados de carga, error y vacío", () => {
  it("AS-02 mientras carga hay un solo role=status «Cargando ausencias…», el status de resultados montado y vacío, y no hay columnas ni buscador", async () => {
    data.overrides.getAbsenceTracking = never

    const main = await findMain()

    await waitFor(() => expect(statusesWithText(main, LOADING)).toHaveLength(1))
    expect(screen.getAllByText(LOADING)).toHaveLength(1)
    expectEmptyResultsStatus(main)
    expect(within(main).getAllByRole("status")).toHaveLength(2)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expectNoBoard(main)
    expect(data.calls.map(({ name }) => name)).toContain("getAbsenceTracking")
  })

  it("AS-03 si getAbsenceTracking falla hay un solo role=alert «No se pudieron cargar las ausencias.», sin columnas ni buscador, y el status de resultados montado y vacío", async () => {
    data.overrides.getAbsenceTracking = fail

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

  it("AS-04 con lista vacía se ve «No hay ausencias reportadas en el turno.» sin región viva, sin carga, sin alert, sin columnas ni buscador, y el status de resultados montado y vacío", async () => {
    data.overrides.getAbsenceTracking = () => Promise.resolve([])

    const main = await findMain()

    const empty = await waitFor(() => getByFullText(main, EMPTY))
    expect(empty).not.toHaveAttribute("role")
    expect(empty.closest(LIVE_REGION), "sin región viva").toBeNull()
    expect(screen.queryByText(LOADING)).toBeNull()
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expectEmptyResultsStatus(main)
    expectNoBoard(main)
    expect(main).not.toHaveTextContent("Ninguna ausencia coincide")
    expect(screen.queryByRole("searchbox", { name: SEARCH })).toBeNull()
  })
})

// AS-21: turno con muchas ausencias, generadas a partir de las reales de cada estado.
const manyAbsences = async () => {
  const actual = await vi.importActual<{
    getAbsenceTracking: () => Promise<{ status: string }[]>
  }>("@/modules/absenceTracking/data/absenceTracking.data")
  const real = await actual.getAbsenceTracking()
  const copies = (status: string, count: number) => {
    const model = real.find((absence) => absence.status === status)
    return Array.from({ length: count }, (_, index) => ({
      ...model,
      id: `${status}-${index + 1}`,
      flightNumber: `AV-${status === "por_aprobar" ? 1 : status === "cubierta" ? 3 : 2}${String(index + 1).padStart(3, "0")}`,
    }))
  }
  return [
    ...copies("por_aprobar", 23),
    ...copies("esperando_confirmacion", 12),
    ...copies("cubierta", 3),
  ]
}

const articlesIn = (region: HTMLElement) =>
  within(region).queryAllByRole("article")

describe("Ausencias: límite de tarjetas con muchas ausencias (AS-21)", () => {
  it("AS-21 con 23 / 12 / 3: Por aprobar muestra 5 y «Ver 10 más», luego 15 y «Ver 8 más», luego 23 y «Mostrar menos»; Esperando 5 y «Ver 7 más»; Cubiertas 3 sin botón; status «38 ausencias»", async () => {
    const generated = await manyAbsences()
    data.overrides.getAbsenceTracking = () => Promise.resolve(generated)
    const user = userEvent.setup()

    const main = await findMain()

    const pending = await within(main).findByRole("region", {
      name: "Por aprobar (23)",
    })
    const waiting = within(main).getByRole("region", {
      name: "Esperando confirmación (12)",
    })
    const covered = within(main).getByRole("region", { name: "Cubiertas (3)" })
    expect(normalize(resultsStatuses(main)[0].textContent)).toBe("38 ausencias")

    expect(articlesIn(pending)).toHaveLength(5)
    getByFullText(pending, "Mostrando 5 de 23")
    await user.click(
      within(pending).getByRole("button", { name: "Ver 10 más de Por aprobar" })
    )
    await waitFor(() => expect(articlesIn(pending)).toHaveLength(15))
    getByFullText(pending, "Mostrando 15 de 23")
    const more = within(pending).getByRole("button", {
      name: "Ver 8 más de Por aprobar",
    })
    expect(more).toHaveFocus()
    await user.click(more)
    await waitFor(() => expect(articlesIn(pending)).toHaveLength(23))
    getByFullText(pending, "Mostrando 23 de 23")
    expect(
      within(pending).getByRole("button", {
        name: "Mostrar menos de Por aprobar",
      })
    ).toHaveFocus()
    expect(
      articlesIn(pending).map((article) =>
        normalize(
          within(article).getByRole("heading", { level: 3 }).textContent
        )
      )
    ).toEqual(generated.slice(0, 23).map(({ flightNumber }) => flightNumber))

    expect(articlesIn(waiting)).toHaveLength(5)
    getByFullText(waiting, "Mostrando 5 de 12")
    expect(
      within(waiting).getByRole("button", {
        name: "Ver 7 más de Esperando confirmación",
      })
    ).toBeInTheDocument()

    expect(articlesIn(covered)).toHaveLength(3)
    expect(
      within(covered).queryByRole("button", { name: /más de|menos de/ })
    ).toBeNull()
    expect(covered).not.toHaveTextContent("Mostrando")
  })
})
