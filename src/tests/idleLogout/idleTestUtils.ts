import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { createMemoryRouter } from "react-router"
import { afterEach, beforeEach, expect, onTestFinished, vi } from "vitest"

import { ROLES, type AuthUser, type Role } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { mockAbsencesList } from "../mocks/absencesApi"
import { AUTH_URLS } from "../mocks/authApi"
import { mockMyCertification } from "../mocks/crewFlightsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Utilidades de la spec cierre-por-inactividad (IN-01..IN-10).
// Tiempos del contrato: aviso a los 4:30 (270 000 ms) y cierre a los 5:00 (300 000 ms).

export const WARNING_NAME = "¿Sigues ahí?"
export const WARNING_TEXT =
  "Tu sesión se cerrará en 30 segundos por inactividad."
export const IDLE_TOAST = "Tu sesión se cerró por inactividad."
export const CHANNEL_NAME = "aircrew-session"

type Router = ReturnType<typeof createMemoryRouter>

// --- Reloj ---

// Solo se falsean los temporizadores y Date: setImmediate y queueMicrotask siguen reales
// (React, MSW y BroadcastChannel de Node los usan). shouldAdvanceTime hace que el reloj
// falso avance con el real, para que waitFor/findBy (que usan setTimeout/setInterval)
// no se cuelguen. Por eso el reloj deriva unos milisegundos con el tiempo real: los
// tests dejan márgenes de unos segundos alrededor de 4:30 y 5:00.
export const installIdleClock = () => {
  beforeEach(() => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

// Deja correr `ms` del reloj falso (temporizadores incluidos) dentro de act.
export const advance = async (ms: number) => {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

// --- Actividad de la persona ---

// Cada evento se despacha como lo hace el navegador: los que burbujean, sobre body (llegan
// a document y a window); scroll de la página, sobre document con bubbles (llega a window).
export const ACTIVITY_EVENTS = [
  { type: "pointermove", fire: () => fireEvent.pointerMove(document.body) },
  { type: "pointerdown", fire: () => fireEvent.pointerDown(document.body) },
  {
    type: "keydown",
    fire: () => fireEvent.keyDown(document.body, { key: "a", code: "KeyA" }),
  },
  { type: "wheel", fire: () => fireEvent.wheel(document.body) },
  {
    type: "scroll",
    fire: () => fireEvent(document, new Event("scroll", { bubbles: true })),
  },
  { type: "touchstart", fire: () => fireEvent.touchStart(document.body) },
] as const

// Actividad de referencia (mover el ratón): fija el inicio del contador en el test.
export const moveMouse = () => fireEvent.pointerMove(document.body)

// --- Aviso ---

export const queryWarning = () =>
  screen.queryByRole("alertdialog", { name: WARNING_NAME })

export const findWarning = () =>
  screen.findByRole("alertdialog", { name: WARNING_NAME })

// --- Backend ---

// POST /api/admin/auth/logout contado. Por defecto 204, como el handler de server.ts.
export const countLogout = (
  respond: () => Response = () => new HttpResponse(null, { status: 204 })
) => {
  const state = { calls: 0 }
  server.use(
    http.post(AUTH_URLS.logout, () => {
      state.calls += 1
      return respond()
    })
  )
  return state
}

// --- Sesiones y pantallas ---

// Una pantalla ligera por rol con sesión real (sus endpoints quedan simulados) y su h1.
export interface SessionCase {
  label: string
  role: Role
  user: AuthUser
  path: string
  heading: string
  mockBackend: () => void
}

export const SESSION_CASES: SessionCase[] = [
  {
    label: "tripulante",
    role: ROLES.TRIPULANTE,
    user: REAL_USERS.crew,
    path: PATHS.tripulante.certificaciones,
    heading: "Certificaciones y Licencias",
    mockBackend: () => {
      mockMyCertification()
    },
  },
  {
    label: "supervisor",
    role: ROLES.SUPER_VISOR,
    user: REAL_USERS.supervisor,
    path: PATHS.superVisor.solicitudesReemplazo,
    heading: "Recomendaciones de Reemplazo",
    mockBackend: () => {
      mockAbsencesList([])
    },
  },
  {
    label: "admin",
    role: ROLES.SUPER_ADMIN,
    user: REAL_USERS.admin,
    path: PATHS.superAdmin.reportes,
    heading: "Reportes",
    mockBackend: () => {},
  },
]

// Pone la sesión (real con setUser o demo con setMockRole), monta la pantalla, espera su
// h1 y marca una actividad de referencia: desde ahí cuentan los 4:30 y los 5:00.
export const openScreen = async (
  session: SessionCase = SESSION_CASES[2],
  kind: "real" | "demo" = "real"
): Promise<Router> => {
  if (kind === "real") {
    session.mockBackend()
    useAuthStore.getState().setUser(session.user)
  } else {
    useAuthStore.getState().setMockRole(session.role)
  }
  const router = renderRoute(session.path)
  await screen.findByRole("heading", { level: 1, name: session.heading })
  moveMouse()
  return router
}

// Aviso a los 4:30 desde la última actividad (con margen por la deriva del reloj).
export const advanceToWarning = async () => {
  await advance(271_000)
  return findWarning()
}

export const expectSessionOpen = (router: Router, path: string) => {
  expect(useAuthStore.getState().user, "la sesión sigue abierta").not.toBeNull()
  expect(router.state.location.pathname).toBe(path)
}

export const expectBackAtLogin = async (router: Router) => {
  await waitFor(() =>
    expect(useAuthStore.getState().user, "la sesión se cerró").toBeNull()
  )
  await waitFor(() => expect(router.state.location.pathname).toBe(PATHS.login))
}

// --- <dialog> modal como en el navegador ---

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// El shim de setup.ts solo pone `open`. Aquí, como en el navegador:
// - showModal() enfoca el elemento con [autofocus] o, si no hay, el primer enfocable
//   (la X «Cerrar ventana» del Dialog propio) y recuerda el foco previo;
// - close() devuelve el foco al elemento que lo tenía antes de abrir;
// - Escape dispara `cancel` (cancelable) sobre el diálogo modal abierto y, si nadie lo
//   cancela, lo cierra. jsdom no hace nada de esto.
export const installBrowserDialog = () => {
  beforeEach(() => {
    const previousFocus = new Map<HTMLDialogElement, Element | null>()
    const showModal = vi
      .spyOn(HTMLDialogElement.prototype, "showModal")
      .mockImplementation(function (this: HTMLDialogElement) {
        previousFocus.set(this, document.activeElement)
        this.open = true
        const target =
          this.querySelector<HTMLElement>("[autofocus]") ??
          this.querySelector<HTMLElement>(FOCUSABLE)
        target?.focus()
      })
    const close = vi
      .spyOn(HTMLDialogElement.prototype, "close")
      .mockImplementation(function (this: HTMLDialogElement) {
        if (!this.open) return
        this.open = false
        const previous = previousFocus.get(this)
        previousFocus.delete(this)
        if (previous instanceof HTMLElement && previous.isConnected) {
          previous.focus()
        }
        this.dispatchEvent(new Event("close"))
      })
    // Como en el navegador, `cancel` es la acción por defecto de Escape: ocurre al acabar
    // el despacho aunque alguien pare la propagación, y no si alguien hace preventDefault.
    // Por eso se escucha en captura y se decide después del despacho.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      queueMicrotask(() => {
        if (event.defaultPrevented) return
        const dialog = [...previousFocus.keys()].reverse().find((d) => d.open)
        if (!dialog) return
        const cancel = new Event("cancel", { cancelable: true })
        if (dialog.dispatchEvent(cancel)) dialog.close()
      })
    }
    window.addEventListener("keydown", onKeyDown, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      showModal.mockRestore()
      close.mockRestore()
    }
  })
}

// --- Pestaña en segundo plano ---

export const setVisibility = (state: "hidden" | "visible") => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  })
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => state === "hidden",
  })
  fireEvent(document, new Event("visibilitychange"))
}

export const installVisibilityReset = () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState")
    Reflect.deleteProperty(document, "hidden")
  })
}

// --- Otra pestaña (BroadcastChannel) ---

export type SessionMessage = {
  type: "activity" | "stay" | "logout" | "signout"
}

// El BroadcastChannel de Node (global en el entorno jsdom de Vitest) entrega los mensajes
// entre instancias del mismo proceso, por el bucle de eventos real, nunca al emisor.
// Simula otra pestaña: `received` guarda lo que publica la app y `post` publica hacia
// ella y espera a que se entregue (un testigo, otra instancia, lo recibe a la vez).
export const openOtherTab = () => {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  const witness = new BroadcastChannel(CHANNEL_NAME)
  const received: SessionMessage[] = []
  const witnessed: SessionMessage[] = []
  channel.onmessage = (event: MessageEvent<SessionMessage>) =>
    received.push(event.data)
  witness.onmessage = (event: MessageEvent<SessionMessage>) =>
    witnessed.push(event.data)
  onTestFinished(() => {
    channel.close()
    witness.close()
  })
  const post = async (message: SessionMessage) => {
    const before = witnessed.length
    channel.postMessage(message)
    await waitFor(() => expect(witnessed.slice(before)).toContainEqual(message))
  }
  return { received, post }
}
