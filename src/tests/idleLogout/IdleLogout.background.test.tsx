import { waitFor } from "@testing-library/react"
import { describe, expect, it, onTestFinished, vi } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import { findToast } from "../utils/toasts"
import {
  advance,
  countLogout,
  expectBackAtLogin,
  expectSessionOpen,
  findWarning,
  IDLE_TOAST,
  openScreen,
  queryWarning,
  SESSION_CASES,
  setVisibility,
  installBrowserDialog,
  installIdleClock,
  installVisibilityReset,
} from "./idleTestUtils"

// IN-07 (docs/specs/cierre-por-inactividad.md): el navegador ralentiza los temporizadores
// de una pestaña en segundo plano. Se simula moviendo solo el reloj del sistema
// (vi.setSystemTime): los temporizadores pendientes se desplazan con él y no vencen, así
// que solo pasa si el vencimiento se calcula con la hora de la última actividad (Date.now)
// al volver (visibilitychange).

installIdleClock()
installBrowserDialog()
installVisibilityReset()

const ADMIN = SESSION_CASES[2]

// Registra si el aviso llegó a verse en algún momento.
const watchWarning = () => {
  let seen = false
  const observer = new MutationObserver(() => {
    if (queryWarning()) seen = true
  })
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  })
  onTestFinished(() => observer.disconnect())
  return () => seen
}

describe("IN-07: pestaña en segundo plano", () => {
  it("IN-07: el cierre ocurre en el propio visibilitychange, sin esperar a ningún temporizador", async () => {
    // Sesión demo: el cierre no espera ningún POST, así que es síncrono.
    await openScreen(SESSION_CASES[2], "demo")
    await advance(60_000)

    setVisibility("hidden")
    vi.setSystemTime(Date.now() + 250_000)
    setVisibility("visible")

    expect(
      useAuthStore.getState().user,
      "cerrada en el mismo visibilitychange"
    ).toBeNull()
  })

  it("IN-07: al volver a primer plano después de los 5:00 la sesión se cierra enseguida, sin mostrar el aviso", async () => {
    const logout = countLogout()
    const router = await openScreen()
    const warningSeen = watchWarning()
    await advance(60_000)

    setVisibility("hidden")
    // 5:10 desde la última actividad sin que corra ningún temporizador.
    vi.setSystemTime(Date.now() + 250_000)
    setVisibility("visible")

    await expectBackAtLogin(router)
    await waitFor(() => expect(logout.calls).toBe(1))
    await findToast(IDLE_TOAST)
    expect(warningSeen(), "el aviso no debe llegar a verse").toBe(false)
  })

  it("IN-07: al volver antes de los 4:30 la sesión sigue abierta y el aviso sale 4:30 después de la última actividad", async () => {
    const logout = countLogout()
    const router = await openScreen()

    setVisibility("hidden")
    // 3:20 desde la última actividad sin que corra ningún temporizador.
    vi.setSystemTime(Date.now() + 200_000)
    setVisibility("visible")

    await advance(1_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
    // 4:31 desde la última actividad (los temporizadores desplazados no llegarían).
    await advance(70_000)
    await findWarning()
  })
})
