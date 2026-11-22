import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { connectAlerts } from "@/lib/alertsStream"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { mockAbsencesList } from "../mocks/absencesApi"
import { API_URL, API_USERS, errorBody } from "../mocks/authApi"
import {
  CREW_URLS,
  mockMetrics,
  mockMyAbsences,
  mockMyAssignments,
  mockMyCertification,
  mockNextAssignment,
} from "../mocks/crewFlightsApi"
import { crewMemberHandler } from "../mocks/profileApi"
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
const REPLACEMENT = "Te asignaron como reemplazo en el vuelo DL2201."
const SLOT_VACATED =
  "Puesto vacante en DL1102 (JFK → LAX): se eliminó la cuenta del tripulante."
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

// Sesión real de tripulante. El backend del Inicio (FE-4) responde sin vuelos ni
// reemplazos y con la certificación de ejemplo.
const loginAsCrew = () => {
  server.use(crewMemberHandler())
  mockMyAssignments([])
  mockMyCertification()
  useAuthStore.getState().setUser({
    id: API_USERS.crew.id,
    displayName: "Luis Pérez",
    fullName: "Luis Pérez Mora",
    position: "Copiloto",
    role: ROLES.TRIPULANTE,
  })
}

// GET /assignments/me/next (próximo vuelo del Inicio, clave ["flights", "next"]): 404 y
// cuenta las peticiones.
const countNextFlight = () => {
  const state = { calls: 0 }
  server.use(
    http.get(CREW_URLS.next, () => {
      state.calls += 1
      return HttpResponse.json(
        errorBody("No tienes vuelos próximos asignados."),
        { status: 404 }
      )
    })
  )
  return state
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
    loginAsCrew()
    mockNextAssignment(null)
    renderRoute(PATHS.tripulante.inicio)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())

    bell.items = [{ message: VERIFIED }]
    await emit("certification:verified", { message: VERIFIED })

    await findToast(VERIFIED)
    await screen.findByRole("button", { name: "Notificaciones (1 sin leer)" })
  })

  it("assignment:replacement vuelve a pedir el próximo vuelo del Inicio (clave flights)", async () => {
    vi.mocked(connectAlerts).mockClear()
    loginAsCrew()
    const nextFlight = countNextFlight()
    renderRoute(PATHS.tripulante.inicio)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
    await waitFor(() => expect(nextFlight.calls).toBe(1))

    await emit("assignment:replacement", { message: REPLACEMENT })

    await findToast(REPLACEMENT)
    await waitFor(() => expect(nextFlight.calls).toBe(2))
  })

  it("assignment:replacement vuelve a pedir las listas y las métricas de Mis Vuelos", async () => {
    vi.mocked(connectAlerts).mockClear()
    loginAsCrew()
    const assignments = mockMyAssignments([])
    const metrics = mockMetrics()
    mockMyAbsences([])
    renderRoute(PATHS.tripulante.misVuelos)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
    const upcoming = () =>
      assignments.filter((query) => query.startsWith("status=upcoming"))
    const completed = () =>
      assignments.filter((query) => query.startsWith("status=completed"))
    await waitFor(() => {
      expect(upcoming()).toHaveLength(1)
      expect(completed()).toHaveLength(1)
      expect(metrics).toHaveLength(1)
    })

    await emit("assignment:replacement", { message: REPLACEMENT })

    await findToast(REPLACEMENT)
    await waitFor(() => {
      expect(upcoming()).toHaveLength(2)
      expect(completed()).toHaveLength(2)
      expect(metrics).toHaveLength(2)
    })
  })

  // EU-01 (docs/specs/eliminar-usuarios.md): al eliminar la cuenta de un tripulante, su
  // puesto en los vuelos futuros queda vacante y el supervisor recibe el aviso en vivo.
  it("flight:slot_vacated avisa con un toast, trae la alerta a la campana y vuelve a pedir Programación (clave assignment)", async () => {
    vi.mocked(connectAlerts).mockClear()
    const bell = mockBell([])
    const days = { calls: 0 }
    server.use(
      http.get(`${API_URL}/api/admin/bases/me`, () =>
        HttpResponse.json(
          {
            error: { message: "No tienes una base asignada.", code: "no_base" },
          },
          { status: 404 }
        )
      ),
      http.get(`${API_URL}/api/recommendation/schedule/days`, () => {
        days.calls += 1
        return HttpResponse.json([])
      }),
      http.get(`${API_URL}/api/recommendation/schedule`, () =>
        HttpResponse.json([])
      )
    )
    loginAsSupervisor()
    renderRoute(PATHS.superVisor.programacion)
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
    await waitFor(() => expect(days.calls).toBe(1))

    bell.items = [{ message: SLOT_VACATED }]
    await emit("flight:slot_vacated", {
      type: "flight:slot_vacated",
      message: SLOT_VACATED,
      id: "n-1",
      flight_id: "f-1102",
      flight_number: "DL1102",
      origin: "JFK",
      destination: "LAX",
      departure_at: "2026-11-25T14:00:00.000Z",
      slot_id: "s-1",
      role: "Copiloto",
      sent_at: "2026-11-22T15:00:00.000Z",
    })

    await findToast(SLOT_VACATED)
    await screen.findByRole("button", { name: "Notificaciones (1 sin leer)" })
    await waitFor(() => expect(days.calls).toBe(2))
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
