import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_USERS, AUTH_URLS, errorBody } from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec login-real, tarea 7 (F7): «Cerrar sesión» llama a POST /auth/logout, también con
// sesión demo, y limpia la sesión aunque la llamada falle.
// Hoy «Cerrar sesión» ya limpia el store y lleva a /login: lo nuevo es la petición, por
// eso todos los casos cuentan las llamadas al handler.

const REAL_SUPERVISOR: AuthUser = {
  id: API_USERS.supervisor.id,
  displayName: "Sara Gómez",
  fullName: "Sara Gómez Ruiz",
  position: "Supervisor",
  role: ROLES.SUPER_VISOR,
}

const mockLogout = (respond: () => Response) => {
  let calls = 0
  server.use(
    http.post(AUTH_URLS.logout, () => {
      calls += 1
      return respond()
    })
  )
  return () => calls
}

const logoutFromProfileMenu = async (
  user: ReturnType<typeof userEvent.setup>
) => {
  await user.click(
    await screen.findByRole("button", { name: /menú de perfil/i })
  )
  await user.click(
    await screen.findByRole("menuitem", { name: "Cerrar sesión" })
  )
}

describe("LR-09: cerrar sesión", () => {
  it("LR-09: con sesión real y logout → 204, «Cerrar sesión» llama a POST /auth/logout y termina en /login sin usuario", async () => {
    const calls = mockLogout(() => new HttpResponse(null, { status: 204 }))
    useAuthStore.getState().setUser(REAL_SUPERVISOR)
    const user = userEvent.setup()
    const router = renderRoute(PATHS.superVisor.inicio)

    await logoutFromProfileMenu(user)

    await waitFor(() => expect(calls()).toBe(1))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("LR-09: si el logout responde 500, igual limpia la sesión y termina en /login", async () => {
    const calls = mockLogout(() =>
      HttpResponse.json(errorBody("Error"), { status: 500 })
    )
    useAuthStore.getState().setUser(REAL_SUPERVISOR)
    const user = userEvent.setup()
    const router = renderRoute(PATHS.superVisor.inicio)

    await logoutFromProfileMenu(user)

    await waitFor(() => expect(calls()).toBe(1))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("LR-09: con sesión demo (setMockRole) también se llama a POST /auth/logout", async () => {
    const calls = mockLogout(() => new HttpResponse(null, { status: 204 }))
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    const user = userEvent.setup()
    const router = renderRoute(PATHS.tripulante.inicio)

    await logoutFromProfileMenu(user)

    await waitFor(() => expect(calls()).toBe(1))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
    expect(useAuthStore.getState().user).toBeNull()
  })
})
