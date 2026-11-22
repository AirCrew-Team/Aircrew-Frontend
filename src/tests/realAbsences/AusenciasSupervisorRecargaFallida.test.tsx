import { act, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { connectAlerts } from "@/lib/alertsStream"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  ABSENCES_URL,
  absenceError,
  COVERED_ABSENCE,
  mockAbsencesListError,
  REPORTED_ABSENCE,
} from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec docs/specs/cierre-pendientes.md, FE-2 (F4): una recarga en segundo plano que falla
// (p. ej. por las invalidaciones de los avisos en vivo) no cambia el tablero de Ausencias
// por el error de carga: con datos ya cargados, se siguen mostrando. El error solo sale
// sin datos.

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

const H1 = "Ausencias"
const LOADING = "Cargando ausencias…"
const ERROR = "No se pudieron cargar las ausencias."

// Deja que la respuesta fallida llegue a la consulta y a la pantalla.
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))

describe("FE-2 (F4): recarga fallida en Ausencias", () => {
  it("F4: si la recarga en segundo plano falla, las ausencias ya cargadas se siguen viendo y no aparece el error de carga", async () => {
    const state = { fail: false, requests: 0 }
    server.use(
      http.get(ABSENCES_URL, () => {
        state.requests += 1
        return state.fail
          ? absenceError(500, "Error interno")
          : HttpResponse.json([REPORTED_ABSENCE, COVERED_ABSENCE])
      })
    )
    useAuthStore.getState().setUser(REAL_USERS.supervisor)
    renderRoute(PATHS.superVisor.ausencias)
    await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")
    await within(main).findByRole("article", {
      name: REPORTED_ABSENCE.crew_name,
    })
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
    const loaded = state.requests

    // El backend empieza a fallar y un aviso en vivo invalida ["absences"].
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
    for (const name of [
      REPORTED_ABSENCE.crew_name,
      COVERED_ABSENCE.crew_name,
    ]) {
      expect(within(main).getByRole("article", { name }), name).toBeVisible()
    }
  })

  it("F4: sin datos (la primera carga falla) sí se muestra el error de carga", async () => {
    mockAbsencesListError()
    useAuthStore.getState().setUser(REAL_USERS.supervisor)
    renderRoute(PATHS.superVisor.ausencias)
    await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")

    const alert = await within(main).findByRole("alert")
    expect(alert).toHaveTextContent(ERROR)
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
  })
})
