import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { ROUTE_CASES } from "../utils/routeCases"

describe("ProtectedRoute: protección por rol", () => {
  it.each(ROUTE_CASES.map(({ path }) => path))(
    "CA-02: sin sesión, %s redirige a /login",
    async (path) => {
      useAuthStore.setState({ user: null })

      const router = renderRoute(path)

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(PATHS.login)
      )
    }
  )

  it("CA-03: un tripulante que abre /admin termina en /tripulante", async () => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)

    const router = renderRoute(PATHS.superAdmin.inicio)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
    )
  })

  it("CA-03: un superAdmin que abre /tripulante/mis-vuelos termina en /admin", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)

    const router = renderRoute(PATHS.tripulante.misVuelos)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.superAdmin.inicio)
    )
  })
})
