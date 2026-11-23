import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"

import { errorBody } from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { findToast, queryToast } from "../utils/toasts"
import {
  ACTIVITY_EVENTS,
  advance,
  advanceToWarning,
  countLogout,
  expectBackAtLogin,
  expectSessionOpen,
  findWarning,
  IDLE_TOAST,
  openScreen,
  queryWarning,
  SESSION_CASES,
  installBrowserDialog,
  installIdleClock,
  WARNING_TEXT,
} from "./idleTestUtils"

// Spec docs/specs/cierre-por-inactividad.md (IN-01..IN-04 e IN-08..IN-10).
// Aviso a los 4:30 (270 000 ms) y cierre a los 5:00 (300 000 ms) sin actividad, contados
// desde la actividad de referencia de openScreen. Las pestañas (IN-06), el segundo plano
// (IN-07) y los avisos en vivo (IN-05) van en sus propios archivos.

installIdleClock()
installBrowserDialog()

const setupUser = () =>
  userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

const ADMIN = SESSION_CASES[2]

const descriptionOf = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")

describe("IN-01: aviso a los 4:30 y cierre a los 5:00", () => {
  it.each(SESSION_CASES)(
    "IN-01: con sesión real de $label, el aviso con la cuenta atrás aparece a los 4:30 sin actividad, y no antes",
    async (session) => {
      countLogout()
      const router = await openScreen(session)

      await advance(265_000)
      expect(queryWarning(), "a los 4:25 aún no hay aviso").toBeNull()

      await advance(6_000)
      const warning = await findWarning()
      expect(warning).toHaveAccessibleDescription(
        expect.stringContaining(WARNING_TEXT)
      )
      expect(
        within(warning).getByRole("button", { name: "Seguir conectado" })
      ).toBeInTheDocument()
      expect(
        within(warning).getByRole("button", { name: "Cerrar sesión" })
      ).toBeInTheDocument()
      expectSessionOpen(router, session.path)
    }
  )

  it.each(SESSION_CASES)(
    "IN-01: con sesión real de $label, a los 5:00 sin actividad llama una vez a POST /logout, vuelve al login y avisa con el toast de inactividad",
    async (session) => {
      const logout = countLogout()
      const router = await openScreen(session)

      await advance(295_000)
      expectSessionOpen(router, session.path)
      expect(logout.calls).toBe(0)

      await advance(6_000)
      await waitFor(() => expect(logout.calls).toBe(1))
      await expectBackAtLogin(router)
      await findToast(IDLE_TOAST)
    }
  )
})

describe("IN-02: la actividad antes de los 4:30 reinicia el contador", () => {
  it.each(ACTIVITY_EVENTS)(
    "IN-02: $type a los 3:20 reinicia el contador: no hay aviso ni cierre a los 5:00 del inicio, y el aviso sale 4:30 después de la actividad",
    async ({ fire }) => {
      const logout = countLogout()
      const router = await openScreen()

      await advance(200_000)
      fire()

      // 6:40 desde el inicio, 3:20 desde la actividad.
      await advance(200_000)
      expect(queryWarning()).toBeNull()
      expectSessionOpen(router, ADMIN.path)
      expect(logout.calls).toBe(0)

      // 4:31 desde la actividad: el contador sigue funcionando.
      await advance(71_000)
      await findWarning()
    }
  )
})

describe("IN-03: «Seguir conectado» (o Escape) cierra el aviso y reinicia el contador", () => {
  it("IN-03: «Seguir conectado» cierra el aviso y el contador vuelve a empezar", async () => {
    const user = setupUser()
    const logout = countLogout()
    const router = await openScreen()
    const warning = await advanceToWarning()

    await user.click(
      within(warning).getByRole("button", { name: "Seguir conectado" })
    )

    await waitFor(() => expect(queryWarning()).toBeNull())
    // Pasan los 5:00 del inicio sin cierre ni aviso: 4:25 desde la decisión.
    await advance(265_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
    // 4:31 desde la decisión: vuelve a avisar.
    await advance(6_000)
    await findWarning()
  })

  it("IN-03: Escape equivale a «Seguir conectado»: cierra el aviso y reinicia el contador", async () => {
    const user = setupUser()
    const logout = countLogout()
    const router = await openScreen()
    await advanceToWarning()

    await user.keyboard("{Escape}")

    await waitFor(() => expect(queryWarning()).toBeNull())
    await advance(265_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
    await advance(6_000)
    await findWarning()
  })

  it("IN-03: la X del diálogo equivale a «Seguir conectado»", async () => {
    const user = setupUser()
    const logout = countLogout()
    const router = await openScreen()
    const warning = await advanceToWarning()

    await user.click(
      within(warning).getByRole("button", { name: "Cerrar ventana" })
    )

    await waitFor(() => expect(queryWarning()).toBeNull())
    // Pasan los 5:00 del inicio sin cierre.
    await advance(40_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
  })

  it("IN-03: pulsar el fondo del diálogo equivale a «Seguir conectado»", async () => {
    const user = setupUser()
    const logout = countLogout()
    const router = await openScreen()
    const warning = await advanceToWarning()

    // El fondo de un <dialog> modal es el propio <dialog> (padding 0).
    await user.click(warning.closest("dialog") ?? warning)

    await waitFor(() => expect(queryWarning()).toBeNull())
    await advance(40_000)
    expect(queryWarning()).toBeNull()
    expectSessionOpen(router, ADMIN.path)
    expect(logout.calls).toBe(0)
  })

  it("IN-03: con el aviso abierto, mover el ratón, pulsar teclas fuera de los botones, la rueda o el scroll no lo cierran ni reinician el contador", async () => {
    const logout = countLogout()
    const router = await openScreen()
    await advanceToWarning()

    await advance(4_000)
    for (const { fire } of ACTIVITY_EVENTS) fire()
    await advance(1_000)
    expect(queryWarning(), "el aviso sigue abierto").not.toBeNull()

    // 5:01 desde la última actividad anterior al aviso: se cierra igual.
    await advance(25_000)
    await waitFor(() => expect(logout.calls).toBe(1))
    await expectBackAtLogin(router)
  })
})

describe("IN-04: «Cerrar sesión» en el aviso", () => {
  it("IN-04: «Cerrar sesión» cierra la sesión enseguida (POST /logout y login), sin el toast de inactividad", async () => {
    const user = setupUser()
    const logout = countLogout()
    const router = await openScreen()
    const warning = await advanceToWarning()

    await user.click(
      within(warning).getByRole("button", { name: "Cerrar sesión" })
    )

    await waitFor(() => expect(logout.calls).toBe(1))
    await expectBackAtLogin(router)
    // Sonner pinta los toasts tras un setTimeout.
    await advance(1_000)
    expect(queryToast(IDLE_TOAST)).toBeNull()
    // El contador ya no corre: pasar los 5:00 no llama otra vez al backend.
    await advance(60_000)
    expect(logout.calls).toBe(1)
  })
})

describe("IN-08: cuentas demo y fallo del backend", () => {
  it.each(SESSION_CASES)(
    "IN-08: la cuenta demo de $label también se cierra a los 5:00, sin llamar a POST /logout",
    async (session) => {
      const logout = countLogout()
      const router = await openScreen(session, "demo")

      await advance(301_000)

      await expectBackAtLogin(router)
      await findToast(IDLE_TOAST)
      // Margen para que un POST lanzado sin await llegue a contarse.
      await advance(1_000)
      expect(logout.calls).toBe(0)
    }
  )

  it.each([
    {
      label: "500",
      respond: () =>
        HttpResponse.json(errorBody("Error interno"), { status: 500 }),
    },
    { label: "error de red", respond: () => HttpResponse.error() },
  ])(
    "IN-08: si POST /logout falla ($label), la sesión local se cierra igual",
    async ({ respond }) => {
      const logout = countLogout(respond)
      const router = await openScreen()

      await advance(301_000)

      await waitFor(() => expect(logout.calls).toBe(1))
      await expectBackAtLogin(router)
      await findToast(IDLE_TOAST)
    }
  )
})

describe("IN-09: sin sesión no corre el contador", () => {
  it("IN-09: en /login sin sesión no aparece el aviso ni se llama a POST /logout aunque pasen 5:00", async () => {
    const logout = countLogout()
    const router = renderRoute(PATHS.login)
    await screen.findByRole("combobox", { name: /rol \(dev\)/i })

    await advance(301_000)

    expect(queryWarning()).toBeNull()
    expect(logout.calls).toBe(0)
    expect(queryToast(IDLE_TOAST)).toBeNull()
    expect(router.state.location.pathname).toBe(PATHS.login)
  })

  it("IN-09: tras el cierre por inactividad, el contador no sigue corriendo en el login", async () => {
    const logout = countLogout()
    const router = await openScreen()
    await advance(301_000)
    await waitFor(() => expect(logout.calls).toBe(1))
    await expectBackAtLogin(router)

    await advance(301_000)

    expect(queryWarning()).toBeNull()
    expect(logout.calls).toBe(1)
  })
})

describe("IN-10: accesibilidad del aviso", () => {
  it("IN-10: el aviso es un alertdialog «¿Sigues ahí?» con la frase de la descripción y el foco en «Seguir conectado»", async () => {
    await openScreen()
    const warning = await advanceToWarning()

    expect(warning).toHaveAccessibleDescription(
      expect.stringContaining(WARNING_TEXT)
    )
    expect(
      within(warning).getByRole("button", { name: "Seguir conectado" })
    ).toHaveFocus()
  })

  it("IN-10: se anuncia una vez: la descripción no cambia con la cuenta atrás, que se ve en pantalla fuera de regiones vivas", async () => {
    await openScreen()
    const warning = await advanceToWarning()
    const description = descriptionOf(warning)
    const textAtOpen = warning.textContent

    await advance(10_000)

    expect(descriptionOf(warning)).toBe(description)
    expect(warning.textContent, "la cuenta atrás avanza").not.toBe(textAtOpen)
    // Abrió a los 4:30 y se miró a los 4:31: ahora quedan unos 19 s. textContent une los
    // nodos sin espacios («0:19Seguir conectado»), así que no se usa \b.
    // Margen amplio (15-20) por la deriva del reloj con shouldAdvanceTime en un CI cargado.
    expect(warning).toHaveTextContent(/(?<!\d)(1[5-9]|20)(?!\d)/)
    const liveRegions = warning.querySelectorAll(
      '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], [role="marquee"]'
    )
    expect(liveRegions).toHaveLength(0)
    expect(warning.getAttribute("aria-live") ?? "off").toBe("off")
  })

  it("IN-10: al cerrarlo con «Seguir conectado», el foco vuelve a donde estaba", async () => {
    const user = setupUser()
    await openScreen()
    const skipLink = screen.getByRole("link", {
      name: "Saltar al contenido principal",
    })
    act(() => skipLink.focus())
    const warning = await advanceToWarning()

    await user.click(
      within(warning).getByRole("button", { name: "Seguir conectado" })
    )

    await waitFor(() => expect(queryWarning()).toBeNull())
    expect(skipLink).toHaveFocus()
  })
})
