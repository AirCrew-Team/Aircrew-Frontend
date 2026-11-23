import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { delay, http, HttpResponse } from "msw"
import { describe, expect, it, onTestFinished, vi } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import { AUTH_URLS } from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { queryAllToasts } from "../utils/toasts"
import {
  advance,
  advanceToWarning,
  countLogout,
  expectBackAtLogin,
  IDLE_TOAST,
  openOtherTab,
  openScreen,
  SESSION_CASES,
  installBrowserDialog,
  installIdleClock,
} from "./idleTestUtils"

// Arreglos de la revisión de código (spec cierre-por-inactividad):
// - un cierre de sesión deliberado («Cerrar sesión» del aviso o del navbar) se publica como
//   { type: "signout" }: las demás pestañas cierran en local, sin POST ni toast de
//   inactividad, y ya no vencen después por su cuenta;
// - al montarse, una pestaña publica { type: "activity" }: las demás se sincronizan y no
//   cierran una sesión recién abierta;
// - Escape en el aviso no sale del aviso (no cierra un popup de Base UI que haya debajo);
// - si la sesión ya se cerró por otra vía mientras esperaba el POST, no hay toast de
//   inactividad.

installIdleClock()
installBrowserDialog()

const ADMIN = SESSION_CASES[2]

describe("Cierre deliberado entre pestañas", () => {
  it('«Cerrar sesión» del aviso publica { type: "signout" }', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    countLogout()
    const other = openOtherTab()
    await openScreen()
    const warning = await advanceToWarning()

    await user.click(
      within(warning).getByRole("button", { name: "Cerrar sesión" })
    )

    await waitFor(() =>
      expect(other.received).toContainEqual({ type: "signout" })
    )
  })

  it('«Cerrar sesión» del navbar publica { type: "signout" }', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    countLogout()
    const other = openOtherTab()
    await openScreen()

    await user.click(
      screen.getByRole("button", { name: /^Menú de perfil de / })
    )
    await user.click(
      await screen.findByRole("menuitem", { name: "Cerrar sesión" })
    )

    await waitFor(() =>
      expect(other.received).toContainEqual({ type: "signout" })
    )
  })

  it("un signout de otra pestaña cierra la sesión local sin POST ni toast de inactividad", async () => {
    const logout = countLogout()
    const other = openOtherTab()
    const router = await openScreen()
    await advance(60_000)

    await other.post({ type: "signout" })

    await expectBackAtLogin(router)
    await advance(1_000)
    expect(logout.calls).toBe(0)
    expect(
      queryAllToasts().filter((toast) =>
        toast.textContent?.includes(IDLE_TOAST)
      )
    ).toHaveLength(0)
  })
})

describe("Sincronización al abrir una pestaña", () => {
  it('al montarse, la pestaña publica { type: "activity" } sin que la persona haga nada', async () => {
    const other = openOtherTab()
    ADMIN.mockBackend()
    useAuthStore.getState().setUser(ADMIN.user)
    renderRoute(ADMIN.path)
    await screen.findByRole("heading", { level: 1, name: ADMIN.heading })

    await waitFor(() =>
      expect(other.received).toContainEqual({ type: "activity" })
    )
  })
})

describe("Escape en el aviso", () => {
  it("Escape cierra el aviso sin propagarse al documento (no cierra un popup de debajo)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await openScreen()
    await advanceToWarning()
    const reachedDocument: string[] = []
    const listener = (event: KeyboardEvent) => reachedDocument.push(event.key)
    document.addEventListener("keydown", listener)
    onTestFinished(() => document.removeEventListener("keydown", listener))

    await user.keyboard("{Escape}")

    expect(reachedDocument).not.toContain("Escape")
  })
})

describe("Cierre ya hecho por otra vía", () => {
  it("si la sesión se cierra mientras espera el POST, no sale el toast de inactividad", async () => {
    server.use(
      http.post(AUTH_URLS.logout, async () => {
        // Mientras tanto, otro mecanismo (p. ej. el 401 global) cierra la sesión.
        useAuthStore.getState().logout()
        await delay(10)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const router = await openScreen()

    await advance(301_000)

    await expectBackAtLogin(router)
    await advance(1_000)
    expect(
      queryAllToasts().filter((toast) =>
        toast.textContent?.includes(IDLE_TOAST)
      )
    ).toHaveLength(0)
  })
})
