import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { delay, http, HttpResponse } from "msw"
import { describe, expect, it, onTestFinished } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  API_USERS,
  AUTH_URLS,
  errorBody,
  meBody,
  sessionErrorBody,
  type SessionErrorCode,
} from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast, queryAllToasts } from "../utils/toasts"

// Spec login-real, tarea 6 (F5): al montar las rutas se restaura la sesión con
// GET /auth/me. Mientras responde, las rutas protegidas muestran «Cargando tu sesión…».
// Ojo: con StrictMode el efecto puede pedir /auth/me dos veces; no se cuentan exactas.

const LOADING_TEXT = "Cargando tu sesión…"

// Sobrescribe GET /auth/me con `respond` y cuenta las peticiones.
const mockMe = (respond: () => Response | Promise<Response>) => {
  let calls = 0
  server.use(
    http.get(AUTH_URLS.me, () => {
      calls += 1
      return respond()
    })
  )
  return () => calls
}

// Deja pasar unos ciclos para que se apliquen respuestas y toasts pendientes.
const settle = (ms = 100) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))

describe("LR-06: recargar con una sesión válida", () => {
  it("LR-06: /auth/me → 200 supervisor; /supervisor/ausencias muestra «Cargando tu sesión…» y luego Ausencias en la misma ruta, con el usuario restaurado", async () => {
    const meCalls = mockMe(async () => {
      // Breve retraso para que el estado de carga sea observable.
      await delay(150)
      return HttpResponse.json(meBody(API_USERS.supervisor))
    })

    const router = renderRoute(PATHS.superVisor.ausencias)
    const visited: string[] = []
    router.subscribe((state) => visited.push(state.location.pathname))

    const loading = await screen.findByText(LOADING_TEXT)
    expect(
      loading.closest('[role="status"]'),
      "el estado de carga debe ser un role=status"
    ).not.toBeNull()

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ausencias" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(PATHS.superVisor.ausencias)
    expect(visited, "no debe pasar por el Login").not.toContain(PATHS.login)
    expect(meCalls()).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(LOADING_TEXT)).toBeNull()

    // Usuario restaurado desde /auth/me (F3), en el store y en el navbar.
    expect(useAuthStore.getState().user).toMatchObject({
      id: API_USERS.supervisor.id,
      displayName: "Sara Gómez",
      fullName: "Sara Gómez Ruiz",
      position: "Supervisor",
      role: ROLES.SUPER_VISOR,
    })
    expect(
      await screen.findByRole("button", {
        name: "Menú de perfil de Sara Gómez Supervisor",
      })
    ).toBeInTheDocument()
  })
})

describe("LR-07: recargar sin sesión válida", () => {
  it.each([
    {
      // Visita sin cookie: el backend responde 401 con code «auth_required» (FE1-F1).
      label: "401 auth_required",
      respond: () =>
        HttpResponse.json(sessionErrorBody("auth_required"), { status: 401 }),
    },
    {
      label: "500",
      respond: () => HttpResponse.json(errorBody("Error"), { status: 500 }),
    },
    { label: "error de red", respond: () => HttpResponse.error() },
  ])(
    "LR-07: /auth/me → $label; /supervisor/ausencias termina en /login sin toast",
    async ({ respond }) => {
      const meCalls = mockMe(respond)

      const router = renderRoute(PATHS.superVisor.ausencias)

      // Sin esta comprobación el caso pasaría en falso: hoy ProtectedRoute
      // redirige al Login sin preguntar al backend.
      await waitFor(() => expect(meCalls()).toBeGreaterThanOrEqual(1))
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(PATHS.login)
      )
      await settle()

      expect(router.state.location.pathname).toBe(PATHS.login)
      expect(useAuthStore.getState().user).toBeNull()
      expect(queryAllToasts(), "visita nueva: sin toast").toHaveLength(0)
    }
  )
})

describe("F5 (punto de vigilancia 2): respuesta tardía de /auth/me", () => {
  it("F5: un 401 tardío de /auth/me (delay 300 ms) no borra la sesión de un login demo hecho antes", async () => {
    // La respuesta se retiene hasta después del login demo y luego tarda 300 ms:
    // así «antes de la respuesta» no depende de lo rápida que esté la máquina.
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    // Si el test falla antes, la respuesta retenida no queda colgada para el siguiente.
    onTestFinished(() => release())
    let requested = 0
    let responded = 0
    server.use(
      http.get(AUTH_URLS.me, async () => {
        requested += 1
        await gate
        await delay(300)
        responded += 1
        return HttpResponse.json(errorBody("Token vencido"), { status: 401 })
      })
    )
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    await waitFor(() => expect(requested).toBeGreaterThanOrEqual(1))
    await user.type(
      await screen.findByRole("textbox", { name: "Correo" }),
      "supervisor@gmail.com"
    )
    await user.type(
      screen.getByLabelText("Contraseña", { selector: "input" }),
      "1234567"
    )
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }))
    await waitFor(
      () =>
        expect(router.state.location.pathname).toBe(PATHS.superVisor.inicio),
      { timeout: 2000 }
    )
    const demoUser = useAuthStore.getState().user
    expect(demoUser?.role).toBe(ROLES.SUPER_VISOR)

    release()
    await waitFor(() => expect(responded).toBe(requested), { timeout: 2000 })
    await settle()

    expect(useAuthStore.getState().user).toEqual(demoUser)
    expect(router.state.location.pathname).toBe(PATHS.superVisor.inicio)
  })
})

// Spec cierre-pendientes, FE-1 (F1): al recargar con una sesión vencida o anulada,
// /auth/me responde 401 con un code distinto de «auth_required». Además de volver al
// Login, sale un toast de error. Sin cookie (auth_required) o sin respuesta: sin aviso.
const SESSION_ENDED_TEXT =
  "Tu sesión venció o se cerró. Inicia sesión de nuevo."

describe("FE1-F1: recargar con una sesión vencida o anulada", () => {
  it.each<SessionErrorCode>([
    "session_revoked",
    "token_expired",
    "invalid_token",
  ])(
    "FE1-F1: /auth/me → 401 «%s»; /supervisor/ausencias termina en /login con un único toast de error «Tu sesión venció o se cerró. Inicia sesión de nuevo.»",
    async (code) => {
      const meCalls = mockMe(() =>
        HttpResponse.json(sessionErrorBody(code), { status: 401 })
      )

      const router = renderRoute(PATHS.superVisor.ausencias)

      await waitFor(() => expect(meCalls()).toBeGreaterThanOrEqual(1))
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(PATHS.login)
      )
      const toast = await findToast(SESSION_ENDED_TEXT)
      expect(toast).toHaveAttribute("data-type", "error")
      await settle()

      // Un solo aviso aunque StrictMode pida /auth/me dos veces.
      expect(queryAllToasts(), "un solo toast").toHaveLength(1)
      expect(router.state.location.pathname).toBe(PATHS.login)
      expect(useAuthStore.getState()).toMatchObject({
        user: null,
        status: "ready",
      })
    }
  )

  // Anclas en verde: hoy ya no hay toast. Con el toast de arriba prueban que el aviso
  // depende del code y no de cualquier fallo.
  it.each([
    {
      label: "401 auth_required (visita sin cookie)",
      respond: () =>
        HttpResponse.json(sessionErrorBody("auth_required"), { status: 401 }),
    },
    { label: "error de red", respond: () => HttpResponse.error() },
  ])(
    "FE1-F1: /auth/me → $label; termina en /login sin toast",
    async ({ respond }) => {
      const meCalls = mockMe(respond)

      const router = renderRoute(PATHS.superVisor.ausencias)

      await waitFor(() => expect(meCalls()).toBeGreaterThanOrEqual(1))
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(PATHS.login)
      )
      await settle()

      expect(useAuthStore.getState().user).toBeNull()
      expect(queryAllToasts(), "sin toast").toHaveLength(0)
    }
  )
})
