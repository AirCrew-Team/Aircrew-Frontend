import { act, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { connectAlerts } from "@/lib/alertsStream"

import { ABSENCES_URL } from "../mocks/absencesApi"
import { server } from "../utils/server"
import {
  advance,
  countLogout,
  expectSessionOpen,
  findWarning,
  openScreen,
  SESSION_CASES,
  installBrowserDialog,
  installIdleClock,
} from "./idleTestUtils"

// IN-05 (docs/specs/cierre-por-inactividad.md): los avisos en vivo (SSE) y las recargas
// de datos que provocan no cuentan como actividad. Conexión SSE simulada como en
// src/tests/layouts/LiveAlerts.test.tsx.

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

installIdleClock()
installBrowserDialog()

const SUPERVISOR = SESSION_CASES[1]

// Cola de Recomendaciones (GET /api/crew/absences) vacía, contando las peticiones.
const countAbsences = () => {
  const state = { calls: 0 }
  server.use(
    http.get(ABSENCES_URL, () => {
      state.calls += 1
      return HttpResponse.json([])
    })
  )
  return state
}

describe("IN-05: lo que no es actividad de la persona", () => {
  it("IN-05: un aviso en vivo (SSE) a los 3:20 y la recarga de datos que provoca no reinician el contador", async () => {
    const logout = countLogout()
    const absences = countAbsences()
    const router = await openScreen({ ...SUPERVISOR, mockBackend: () => {} })
    await waitFor(() => expect(connectAlerts).toHaveBeenCalled())
    await waitFor(() => expect(absences.calls).toBeGreaterThan(0))
    await advance(200_000)
    const callsBefore = absences.calls

    act(() => {
      const handler = stream.handlers.get("absence:reported")
      expect(handler, "debe escuchar «absence:reported»").toBeDefined()
      handler?.({ message: "EMP-004 no podrá volar AV-9344 (incapacidad)." })
    })
    // La cola se recarga por el aviso.
    await waitFor(() => expect(absences.calls).toBeGreaterThan(callsBefore))

    // 4:31 desde la última actividad de la persona.
    await advance(71_000)
    await findWarning()
    expectSessionOpen(router, SUPERVISOR.path)
    expect(logout.calls).toBe(0)
  })
})
