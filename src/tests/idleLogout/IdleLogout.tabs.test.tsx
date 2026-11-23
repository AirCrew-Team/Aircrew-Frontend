import { waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { findToast } from "../utils/toasts"
import {
  advance,
  advanceToWarning,
  countLogout,
  expectBackAtLogin,
  expectSessionOpen,
  findWarning,
  IDLE_TOAST,
  moveMouse,
  openOtherTab,
  openScreen,
  queryWarning,
  SESSION_CASES,
  installBrowserDialog,
  installIdleClock,
} from "./idleTestUtils"

// IN-06 (docs/specs/cierre-por-inactividad.md): varias pestañas coordinadas con
// BroadcastChannel("aircrew-session") y los mensajes { type: "activity" | "stay" |
// "logout" }. La «otra pestaña» es un BroadcastChannel abierto por el test: el de Node,
// global en el entorno jsdom de Vitest, entrega entre instancias del mismo proceso.

installIdleClock()
installBrowserDialog()

const ADMIN = SESSION_CASES[2]

describe("IN-06: varias pestañas", () => {
  it("IN-06: la actividad en otra pestaña reinicia el contador de esta", async () => {
    const logout = countLogout()
    const other = openOtherTab()
    const router = await openScreen()

    await advance(200_000)
    await other.post({ type: "activity" })

    // 6:40 desde la actividad de esta pestaña, 3:20 desde la de la otra.
    await advance(200_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
    // 4:31 desde la actividad de la otra pestaña.
    await advance(71_000)
    await findWarning()
  })

  it("IN-06: la actividad en esta pestaña se publica para las demás", async () => {
    const other = openOtherTab()
    await openScreen()
    // Fuera de cualquier límite de frecuencia de la actividad de referencia.
    await advance(60_000)
    other.received.length = 0

    moveMouse()

    await waitFor(() =>
      expect(other.received).toContainEqual(
        expect.objectContaining({ type: "activity" })
      )
    )
  })

  it("IN-06: «Seguir conectado» en otra pestaña cierra el aviso en esta y reinicia su contador", async () => {
    const logout = countLogout()
    const other = openOtherTab()
    const router = await openScreen()
    await advanceToWarning()

    await other.post({ type: "stay" })

    await waitFor(() => expect(queryWarning()).toBeNull())
    // Pasan los 5:00 del inicio sin cierre.
    await advance(40_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
  })

  it("IN-06: «Seguir conectado» en esta pestaña se publica para las demás", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const other = openOtherTab()
    await openScreen()
    const warning = await advanceToWarning()

    await user.click(
      within(warning).getByRole("button", { name: "Seguir conectado" })
    )

    await waitFor(() =>
      expect(other.received).toContainEqual(
        expect.objectContaining({ type: "stay" })
      )
    )
  })

  it("IN-06: el cierre en otra pestaña cierra la sesión local de esta, con el toast y sin llamar a POST /logout", async () => {
    const logout = countLogout()
    const other = openOtherTab()
    const router = await openScreen()
    await advance(60_000)

    await other.post({ type: "logout" })

    await expectBackAtLogin(router)
    await findToast(IDLE_TOAST)
    // Margen para que un POST lanzado sin await llegue a contarse.
    await advance(1_000)
    expect(logout.calls).toBe(0)
  })

  it("IN-06: la pestaña que detecta el vencimiento publica el cierre y llama a POST /logout una sola vez", async () => {
    const logout = countLogout()
    const other = openOtherTab()
    const router = await openScreen()

    await advance(301_000)

    await waitFor(() =>
      expect(other.received).toContainEqual(
        expect.objectContaining({ type: "logout" })
      )
    )
    await expectBackAtLogin(router)
    await advance(1_000)
    expect(logout.calls).toBe(1)
  })
})
