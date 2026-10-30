import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { ROUTE_CASES } from "../utils/routeCases"

describe("CA-23: título del documento por página", () => {
  it.each(ROUTE_CASES)(
    "CA-23: $path define el título «$section | AirCrew»",
    async ({ path, role, section }) => {
      useAuthStore.getState().setMockRole(role)

      renderRoute(path)

      await waitFor(() => expect(document.title).toBe(`${section} | AirCrew`))
    }
  )

  it("CA-23: la 404 define el título «Página no encontrada | AirCrew»", async () => {
    renderRoute("/ruta-que-no-existe")

    await waitFor(() =>
      expect(document.title).toBe("Página no encontrada | AirCrew")
    )
  })

  it("CA-23: /login define el título «Iniciar sesión | AirCrew»", async () => {
    useAuthStore.setState({ user: null })

    renderRoute(PATHS.login)

    await waitFor(() => expect(document.title).toBe("Iniciar sesión | AirCrew"))
  })
})
