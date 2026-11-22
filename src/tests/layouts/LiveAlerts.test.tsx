import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { connectAlerts } from "@/lib/alertsStream"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { mockAbsencesList } from "../mocks/absencesApi"
import { API_URL, API_USERS } from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// Conexión SSE simulada: guarda los manejadores para disparar eventos desde el test.
const stream = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  close: vi.fn(),
}))

vi.mock("@/lib/alertsStream", () => ({
  connectAlerts: vi.fn(() => ({
    on: (name: string, handler: (payload: unknown) => void) =>
      stream.handlers.set(name, handler),
    close: stream.close,
  })),
}))

const NOTIFICATIONS_URL = `${API_URL}/api/notification/notifications`
const REPORTED = "EMP-004 no podrá volar AV-9344 (incapacidad)."
const VERIFIED = "Tu certificado 2775981 fue verificado."
const SCREEN = PATHS.superVisor.solicitudesReemplazo

const emit = (name: string, payload: object) =>
  act(() => {
    const handler = stream.handlers.get(name)
    expect(handler, `debe escuchar «${name}»`).toBeDefined()
    handler?.(payload)
  })

// Campana del backend: devuelve `items` y registra si se marcaron todas como leídas.
const mockBell = (items: { message: string; read?: boolean }[]) => {
  const state = { readAll: 0, items }
  server.use(
    http.get(NOTIFICATIONS_URL, () =>
      HttpResponse.json({
        items: state.items.map((item, index) => ({
          id: `n-${index}`,
          type: "absence:reported",
          data: {},
          read: Boolean(item.read),
          read_at: item.read ? "2026-11-19T19:31:00.000Z" : null,
          created_at: new Date().toISOString(),
          message: item.message,
        })),
        unread_count: state.items.filter((item) => !item.read).length,
      })
    ),
    http.post(`${NOTIFICATIONS_URL}/read-all`, () => {
      state.readAll += 1
      const updated = state.items.filter((item) => !item.read).length
      state.items = state.items.map((item) => ({ ...item, read: true }))
      return HttpResponse.json({ updated })
    })
  )
  return state
}

// Sesión real de supervisor (cookie), como tras el login. La pantalla de prueba es
// Recomendaciones: su cola (GET /api/crew/absences) responde vacía con MSW.
const loginAsSupervisor = () => {
  mockAbsencesList([])
  useAuthStore.getState().setUser({
    id: API_USERS.supervisor.id,
    displayName: "Sara Gómez",
    fullName: "Sara Gómez Ruiz",
    position: "Supervisor",
    role: ROLES.SUPER_VISOR,
  })
}

describe("Avisos en vivo (SSE) y campana", () => {
  it("con sesión real de supervisor se conecta (la cookie viaja sola)", async () => {
    vi.mocked(connectAlerts).mockClear()
    loginAsSupervisor()
    renderRoute(SCREEN)

    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
  })

  it("con una cuenta demo (sin sesión en el backend) no se conecta", async () => {
    vi.mocked(connectAlerts).mockClear()
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    renderRoute(SCREEN)
    await screen.findByRole("main")

    expect(connectAlerts).not.toHaveBeenCalled()
  })

  it("absence:reported muestra el toast y la campana trae la alerta guardada; al cerrarla quedan leídas", async () => {
    const bell = mockBell([])
    loginAsSupervisor()
    renderRoute(SCREEN)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())

    // El backend ya la guardó cuando llega en vivo.
    bell.items = [{ message: REPORTED }]
    await emit("absence:reported", { message: REPORTED })

    await findToast(REPORTED)
    const button = await screen.findByRole("button", {
      name: "Notificaciones (1 sin leer)",
    })

    const user = userEvent.setup()
    await user.click(button)
    const list = await screen.findByRole("list", {
      name: "Notificaciones recientes",
    })
    expect(within(list).getByText(REPORTED)).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(bell.readAll).toBe(1))
    await screen.findByRole("button", { name: "Notificaciones" })
  })

  it("al entrar, la campana muestra lo que llegó mientras no estaba conectado", async () => {
    mockBell([{ message: REPORTED }, { message: "Otra ya leída.", read: true }])
    loginAsSupervisor()
    renderRoute(SCREEN)

    await screen.findByRole("button", { name: "Notificaciones (1 sin leer)" })
  })

  it("el tripulante recibe el aviso de certificado verificado", async () => {
    vi.mocked(connectAlerts).mockClear()
    const bell = mockBell([])
    useAuthStore.getState().setUser({
      id: API_USERS.crew.id,
      displayName: "Luis Pérez",
      fullName: "Luis Pérez Mora",
      position: "Copiloto",
      role: ROLES.TRIPULANTE,
    })
    renderRoute(PATHS.tripulante.inicio)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())

    bell.items = [{ message: VERIFIED }]
    await emit("certification:verified", { message: VERIFIED })

    await findToast(VERIFIED)
    await screen.findByRole("button", { name: "Notificaciones (1 sin leer)" })
  })

  it("el super_admin no se conecta ni pide la campana", async () => {
    vi.mocked(connectAlerts).mockClear()
    let asked = false
    server.use(
      http.get(NOTIFICATIONS_URL, () => {
        asked = true
        return HttpResponse.json({ items: [], unread_count: 0 })
      })
    )
    useAuthStore.getState().setUser({
      id: API_USERS.superAdmin.id,
      displayName: "Admin Real",
      fullName: "Admin Real",
      position: "Super Admin",
      role: ROLES.SUPER_ADMIN,
    })
    renderRoute(PATHS.superAdmin.inicio)
    await screen.findByRole("main")

    expect(connectAlerts).not.toHaveBeenCalled()
    expect(asked).toBe(false)
  })

  it("auth:expired cierra la sesión y lleva al login", async () => {
    loginAsSupervisor()
    const router = renderRoute(SCREEN)
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
