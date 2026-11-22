import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Recomendaciones de reemplazo (spec docs/specs/recomendaciones-supervisor.md): cola de una
// sola solicitud (RS-09) y estados de carga y error de la cola y de los candidatos (RS-10).

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de recommendations.data.ts se envuelve: registra su nombre y argumentos y,
// si hay override, lo usa en lugar de la real. Se guardan las reales para derivar overrides
// de los datos simulados. El test no importa el módulo, así compila aunque aún no exista.
const data = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
  real: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/recommendations/data/recommendations.data",
  async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return Object.fromEntries(
      Object.entries(actual).map(([name, value]) => {
        if (typeof value !== "function") return [name, value]
        const real = value as DataFn
        data.real[name] = real
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

const H1 = "Recomendaciones de Reemplazo"
const never = () => new Promise(() => {})
const fail = () => Promise.reject(new Error("servicio caído"))

const renderPage = async () => {
  renderRoute(PATHS.superVisor.solicitudesReemplazo)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return { user: userEvent.setup(), main: screen.getByRole("main") }
}

const activePanel = () => {
  const panels = screen.getAllByRole("tabpanel")
  expect(panels, "un único tabpanel visible").toHaveLength(1)
  return panels[0]
}

const FLIGHTS = ["AV-9344", "AV-8120", "AV-7741", "AV-6612", "AV-5023"]

const expectFullQueue = async () => {
  expect(
    await screen.findByRole("heading", { level: 2, name: "Pendientes (5)" })
  ).toBeInTheDocument()
  const tabs = screen.getAllByRole("tab")
  expect(tabs).toHaveLength(FLIGHTS.length)
  FLIGHTS.forEach((flight, index) =>
    expect(tabs[index]).toHaveTextContent(flight)
  )
}

describe("Recomendaciones: datos de la pantalla", () => {
  it("RS-10 la cola sale de getPendingReplacementRequests y los candidatos se piden con el id DISP-2025-0982", async () => {
    await renderPage()

    // Ancla positiva: la cola y los candidatos reales están en pantalla.
    await expectFullQueue()
    expect(
      await screen.findByRole("article", { name: "Juan Pablo Navarro" })
    ).toBeInTheDocument()
    expect(data.calls.map(({ name }) => name)).toContain(
      "getPendingReplacementRequests"
    )
    expect(data.calls).toContainEqual({
      name: "getRecommendedCandidates",
      args: ["DISP-2025-0982"],
    })
  })
})

describe("Recomendaciones: estados de la cola (RS-10)", () => {
  it("RS-10 mientras carga la cola se ve «Cargando solicitudes…» con role=status", async () => {
    data.overrides.getPendingReplacementRequests = never

    const { main } = await renderPage()

    expect(await screen.findByText("Cargando solicitudes…")).toHaveAttribute(
      "role",
      "status"
    )
    expect(within(main).getAllByRole("status")).toHaveLength(1)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
  })

  it("RS-10 si falla la cola se ve «No se pudieron cargar las solicitudes.» con role=alert", async () => {
    data.overrides.getPendingReplacementRequests = fail

    const { main } = await renderPage()

    expect(
      await screen.findByText("No se pudieron cargar las solicitudes.")
    ).toHaveAttribute("role", "alert")
    expect(within(main).getAllByRole("alert")).toHaveLength(1)
    expect(within(main).queryAllByRole("status")).toHaveLength(0)
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    expect(
      screen.getByRole("heading", { level: 1, name: H1 })
    ).toBeInTheDocument()
  })
})

describe("Recomendaciones: estados de los candidatos (RS-10)", () => {
  it("RS-10 mientras cargan los candidatos se ve «Cargando candidatos…» (status) dentro del tabpanel y la cola sigue", async () => {
    data.overrides.getRecommendedCandidates = never

    const { main } = await renderPage()

    await expectFullQueue()
    const status = await within(activePanel()).findByText(
      "Cargando candidatos…"
    )
    expect(status).toHaveAttribute("role", "status")
    expect(within(main).getAllByRole("status")).toHaveLength(1)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expect(within(activePanel()).queryAllByRole("article")).toHaveLength(0)
  })

  it("RS-10 si fallan los candidatos se ve «No se pudieron cargar los candidatos.» (alert) dentro del tabpanel y la cola sigue", async () => {
    data.overrides.getRecommendedCandidates = fail

    const { main } = await renderPage()

    await expectFullQueue()
    const alert = await within(activePanel()).findByText(
      "No se pudieron cargar los candidatos."
    )
    expect(alert).toHaveAttribute("role", "alert")
    expect(within(main).getAllByRole("alert")).toHaveLength(1)
    expect(within(main).queryAllByRole("status")).toHaveLength(0)
    expect(within(activePanel()).queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      "AV-9344"
    )
  })

  // Pendiente menor de la spec: con la API real la IA puede no devolver candidatos.
  it("RS-13 sin candidatos se ve «Ningún tripulante cumple los requisitos para esta solicitud.» (sin región viva) y se pueden pedir nuevas sugerencias", async () => {
    data.overrides.getRecommendedCandidates = () => Promise.resolve([])

    const { main } = await renderPage()

    await expectFullQueue()
    const panel = activePanel()
    expect(
      await within(panel).findByText(
        "Ningún tripulante cumple los requisitos para esta solicitud."
      )
    ).not.toHaveAttribute("role")
    expect(within(panel).queryAllByRole("article")).toHaveLength(0)
    expect(within(panel).queryByText("Ordenados por afinidad")).toBeNull()
    expect(
      within(panel).getByRole("button", { name: "Pedir nuevas sugerencias" })
    ).toBeInTheDocument()
    expect(within(main).queryAllByRole("status")).toHaveLength(0)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
  })
})

describe("Recomendaciones: cola de una sola solicitud (RS-09)", () => {
  const onlyFirstRequest = () => {
    data.overrides.getPendingReplacementRequests = () => {
      const real = data.real.getPendingReplacementRequests
      if (!real) throw new Error("falta getPendingReplacementRequests real")
      return Promise.resolve(real() as unknown[]).then((list) =>
        list.slice(0, 1)
      )
    }
  }

  const confirmAssignment = async (
    user: ReturnType<typeof userEvent.setup>
  ) => {
    const juan = await screen.findByRole("article", {
      name: "Juan Pablo Navarro",
    })
    await user.click(
      within(juan).getByRole("button", { name: "Confirmar asignación" })
    )
    const dialog = await screen.findByRole("alertdialog", {
      name: "Confirmar asignación",
    })
    await user.click(within(dialog).getByRole("button", { name: "Asignar" }))
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  }

  it("RS-09 con una sola solicitud, tras «Asignar» se ve «No hay solicitudes pendientes.»", async () => {
    onlyFirstRequest()
    const { user } = await renderPage()

    // Ancla positiva: la cola tiene una sola solicitud.
    expect(
      await screen.findByRole("heading", { level: 2, name: "Pendientes (1)" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("tab")).toHaveLength(1)

    await confirmAssignment(user)

    await findToast("Juan Pablo Navarro asignado al vuelo AV-9344")
    expect(
      await screen.findByText("No hay solicitudes pendientes.")
    ).toBeVisible()
    expect(
      screen.getByRole("heading", { level: 1, name: H1 })
    ).toBeInTheDocument()
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    expect(
      screen.queryByRole("button", { name: "Confirmar asignación" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Solicitud DISP-2025-0982")
    ).not.toBeInTheDocument()
  })

  it("RS-09 con una sola solicitud, tras «Asignar» el foco va a main#contenido", async () => {
    onlyFirstRequest()
    const { user, main } = await renderPage()

    expect(main).toHaveAttribute("id", "contenido")
    await screen.findByRole("heading", { level: 2, name: "Pendientes (1)" })
    await confirmAssignment(user)

    await screen.findByText("No hay solicitudes pendientes.")
    await waitFor(() => expect(main).toHaveFocus())
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(main).toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
  })

  // Decisión del orquestador tras la revisión: si todas las que quedan están en recálculo,
  // queda seleccionada la primera de la cola con su aviso, nunca una pantalla en blanco.
  it("RS-12 con una sola solicitud, tras «Pedir sugerencias» sigue seleccionada con el aviso de recálculo y el foco en su tab", async () => {
    onlyFirstRequest()
    const { user } = await renderPage()

    const juan = await screen.findByRole("article", {
      name: "Juan Pablo Navarro",
    })
    expect(juan).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Pedir nuevas sugerencias" })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Pedir nuevas sugerencias",
    })
    await user.click(
      within(dialog).getByRole("button", { name: "Pedir sugerencias" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )

    const tab = screen.getByRole("tab", { selected: true })
    expect(tab).toHaveTextContent("AV-9344")
    expect(tab).toHaveTextContent("Recalculando sugerencias")
    expect(
      within(activePanel()).getByText(
        "La IA está recalculando las sugerencias de esta solicitud."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Solicitud DISP-2025-0982")).toBeInTheDocument()
    await waitFor(() => expect(tab).toHaveFocus())
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(tab).toHaveFocus()
  })
})
