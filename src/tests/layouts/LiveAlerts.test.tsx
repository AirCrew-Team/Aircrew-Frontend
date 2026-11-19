import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { connectAlerts } from "@/lib/socket"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Socket simulado: guarda los manejadores para disparar eventos desde el test.
const socket = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  disconnect: vi.fn(),
}))

vi.mock("@/lib/socket", () => ({
  connectAlerts: vi.fn(() => ({
    on: (name: string, handler: (payload: unknown) => void) =>
      socket.handlers.set(name, handler),
    disconnect: socket.disconnect,
  })),
}))

const REPORTED = "EMP-004 no podrá volar AV-9344 (incapacidad)."

const emit = (name: string, payload: object) =>
  act(() => {
    const handler = socket.handlers.get(name)
    expect(handler, `debe escuchar «${name}»`).toBeDefined()
    handler?.(payload)
  })

// Sesión real de supervisor: con token, como tras el login.
const loginAsSupervisor = () => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
  useAuthStore.setState({ token: "token-de-prueba" })
}

describe("Alertas en vivo del supervisor", () => {
  it("con sesión de supervisor se conecta con su token", async () => {
    loginAsSupervisor()
    renderRoute(PATHS.superVisor.inicio)

    await waitFor(() =>
      expect(connectAlerts).toHaveBeenCalledWith("token-de-prueba")
    )
  })

  it("sin token (sesión simulada) o con otro rol no se conecta", async () => {
    vi.mocked(connectAlerts).mockClear()
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    renderRoute(PATHS.superVisor.inicio)
    await screen.findByRole("main")

    expect(connectAlerts).not.toHaveBeenCalled()
  })

  it("absence:reported muestra el toast y la campana dice «1 sin leer» con la alerta", async () => {
    loginAsSupervisor()
    renderRoute(PATHS.superVisor.inicio)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())

    await emit("absence:reported", {
      message: REPORTED,
      sent_at: "2026-11-19T19:30:00.000Z",
    })

    await findToast(REPORTED)
    const bell = screen.getByRole("button", {
      name: "Notificaciones (1 sin leer)",
    })

    await userEvent.setup().click(bell)
    const list = await screen.findByRole("list", {
      name: "Alertas de esta sesión",
    })
    expect(within(list).getByText(REPORTED)).toBeInTheDocument()
  })

  it("auth:expired cierra la sesión y lleva al login", async () => {
    loginAsSupervisor()
    const router = renderRoute(PATHS.superVisor.inicio)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())

    await emit("auth:expired", {
      message: "Tu sesión venció. Inicia sesión de nuevo.",
    })

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
    expect(useAuthStore.getState().user).toBeNull()
  })
})
