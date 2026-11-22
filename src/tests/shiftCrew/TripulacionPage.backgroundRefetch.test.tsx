import { act, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { connectAlerts } from "@/lib/alertsStream"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec docs/specs/cierre-pendientes.md, FE-2 (F4): una recarga en segundo plano que falla
// (p. ej. por las invalidaciones de los avisos en vivo) no cambia el tablero por el error
// de carga: con datos ya cargados, se siguen mostrando. El error solo sale sin datos.

// Conexión SSE simulada (como en LiveAlerts.test.tsx): guarda los manejadores para
// disparar eventos desde el test.
const stream = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
}))

vi.mock("@/lib/alertsStream", () => ({
  connectAlerts: vi.fn(() => ({
    on: (name: string, handler: (payload: unknown) => void) =>
      stream.handlers.set(name, handler),
    close: () => {},
  })),
}))

const BASE_ME_URL = `${API_URL}/api/admin/bases/me`
const SHIFT_CREW_URL = `${API_URL}/api/crew/shift-crew`

const JFK_BASE = {
  unit: "Delta Air Lines",
  hq_code: "ATL",
  base_name: "Base JFK",
  city: "New York",
  iata: "JFK",
  icao: "KJFK",
  operational_condition: "normal",
}

const GUARD = "Grace Holloway"

const MEMBERS = [
  {
    id: "sc-1",
    employee_code: "SC-1",
    full_name: GUARD,
    position: "Primer Oficial",
    rank: "Primer Oficial",
    phone: "+1 212 555 0101",
    radio_channel: "CH-04 OPS JFK (131.85)",
    expiring_certification: null,
    status: "standby",
    location: "Standby Hotel (JFK)",
    minutes_to_ramp: 20,
    guard_until: "2026-11-22T22:00:00.000Z",
    replacement_blocker: null,
  },
]

const H1 = "Tripulación"
const LOADING = "Cargando tripulación…"
const ERROR = "No se pudo cargar la tripulación del turno."
const LIST = "Tripulantes del turno"

// Deja que la respuesta fallida llegue a la consulta y a la pantalla.
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))

describe("FE-2 (F4): recarga fallida en Tripulación", () => {
  it("F4: si la recarga en segundo plano falla, la tripulación ya cargada se sigue viendo y no aparece el error de carga", async () => {
    const state = { fail: false, requests: 0 }
    server.use(
      http.get(BASE_ME_URL, () => HttpResponse.json(JFK_BASE)),
      http.get(SHIFT_CREW_URL, () => {
        state.requests += 1
        return state.fail
          ? HttpResponse.json({ error: "Error interno" }, { status: 500 })
          : HttpResponse.json({ base: "JFK", shift: "day", members: MEMBERS })
      })
    )
    useAuthStore.getState().setUser(REAL_USERS.supervisor)
    renderRoute(PATHS.superVisor.tripulacion)
    await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")
    await within(main).findByRole("article", { name: GUARD })
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
    const loaded = state.requests

    // El backend empieza a fallar y un aviso en vivo invalida ["crew"].
    state.fail = true
    act(() => {
      const handler = stream.handlers.get("absence:reported")
      expect(handler, "debe escuchar «absence:reported»").toBeDefined()
      handler?.({ message: "EMP-004 no podrá volar DL-1234." })
    })
    await waitFor(() => expect(state.requests).toBeGreaterThan(loaded))
    await settle()

    expect(within(main).queryByText(ERROR)).toBeNull()
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expect(within(main).queryByText(LOADING)).toBeNull()
    const list = within(main).getByRole("list", { name: LIST })
    expect(
      within(list).getByRole("article", { name: GUARD })
    ).toBeInTheDocument()
  })

  it("F4: sin datos (la primera carga falla) sí se muestra el error de carga", async () => {
    server.use(
      http.get(BASE_ME_URL, () => HttpResponse.json(JFK_BASE)),
      http.get(SHIFT_CREW_URL, () =>
        HttpResponse.json({ error: "Error interno" }, { status: 500 })
      )
    )
    useAuthStore.getState().setUser(REAL_USERS.supervisor)
    renderRoute(PATHS.superVisor.tripulacion)
    await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")

    const alert = await within(main).findByRole("alert")
    expect(alert).toHaveTextContent(ERROR)
    expect(within(main).queryByRole("list", { name: LIST })).toBeNull()
  })
})
