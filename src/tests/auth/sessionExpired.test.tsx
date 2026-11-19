import { act, screen, waitFor } from "@testing-library/react"
import { isAxiosError } from "axios"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

// Registra el interceptor de 401 de apiClient (F6), aunque las rutas ya lo importen.
import "@/App/actions/auth/auth.actions"
import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import apiClient from "@/service/api-client"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL, API_USERS, errorBody } from "../mocks/authApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast, queryAllToasts } from "../utils/toasts"

// Spec login-real, LR-08 con el router real: con sesión iniciada, un 401 en una
// petición que no es de sesión lleva al Login con un único toast de sesión vencida.
// El interceptor solo cierra la sesión del store; la redirección la hace ProtectedRoute.

const EXPIRED_TEXT = "Tu sesión venció. Inicia sesión de nuevo."
const OTHER_PATH = "/api/crew/cualquier-cosa"

// Deja pasar unos ciclos para que se apliquen respuestas y toasts pendientes.
const settle = (ms = 100) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))

describe("LR-08: sesión vencida durante el uso (con el router)", () => {
  it("LR-08: con un supervisor real en /supervisor/ausencias, un 401 de otra petición lleva a /login con el toast «Tu sesión venció. Inicia sesión de nuevo.» una sola vez", async () => {
    server.use(
      http.get(`${API_URL}${OTHER_PATH}`, () =>
        HttpResponse.json(errorBody("Token vencido"), { status: 401 })
      )
    )
    // Sesión real ya confirmada: SessionGate no pide /auth/me.
    useAuthStore.getState().setUser({
      id: API_USERS.supervisor.id,
      displayName: "Sara Gómez",
      fullName: "Sara Gómez Ruiz",
      position: "Supervisor",
      role: ROLES.SUPER_VISOR,
    })

    const router = renderRoute(PATHS.superVisor.ausencias)
    // El 401 llega con la página ya montada (si no, competiría con la carga de la ruta).
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ausencias" })
    ).toBeInTheDocument()

    const error = await act(() =>
      apiClient.get(OTHER_PATH).catch((e: unknown) => e)
    )
    expect(
      isAxiosError(error) && error.response?.status,
      "la petición se relanza con su 401"
    ).toBe(401)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: "ready",
    })
    const toast = await findToast(EXPIRED_TEXT)
    expect(toast).toHaveAttribute("data-type", "error")
    await settle()
    expect(queryAllToasts(), "un solo toast").toHaveLength(1)
    expect(router.state.location.pathname).toBe(PATHS.login)
  })
})
