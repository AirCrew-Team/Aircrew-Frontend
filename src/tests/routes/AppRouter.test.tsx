import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { ROUTE_CASES } from "../utils/routeCases"

describe("AppRouter: rutas por rol", () => {
  it.each(ROUTE_CASES)(
    "CA-01, CA-08 y HT-29: $path, con un $role, muestra un único h1 de la sección «$section»",
    async ({ path, role, section, heading }) => {
      useAuthStore.getState().setMockRole(role)

      const router = renderRoute(path)

      const h1 = await screen.findByRole("heading", { level: 1 })
      expect(h1).toHaveTextContent(heading ?? section)
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
      expect(router.state.location.pathname).toBe(path)
    }
  )
})
