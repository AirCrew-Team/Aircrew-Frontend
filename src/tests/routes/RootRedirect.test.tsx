import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

describe("RootRedirect y 404", () => {
  it.each(Object.values(ROLES))(
    "CA-04: / con sesión de %s lleva al inicio de su rol",
    async (role) => {
      useAuthStore.getState().setMockRole(role)

      const router = renderRoute(PATHS.root)

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(PATHS[role].inicio)
      )
    }
  )

  it("CA-04: / sin sesión lleva a /login", async () => {
    useAuthStore.setState({ user: null })

    const router = renderRoute(PATHS.root)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
  })

  it("CA-05: una ruta inexistente muestra «Página no encontrada» y el enlace «Volver al inicio»", async () => {
    renderRoute("/ruta-que-no-existe")

    expect(
      await screen.findByRole("heading", { name: "Página no encontrada" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Volver al inicio" })
    ).toHaveAttribute("href", PATHS.root)
  })
})
