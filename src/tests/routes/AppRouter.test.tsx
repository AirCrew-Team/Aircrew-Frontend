import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { ROUTE_CASES } from "../utils/routeCases"

describe("AppRouter: rutas por rol", () => {
  it.each(ROUTE_CASES)(
    "CA-01 y CA-08: $path, con un $role, muestra un único h1 «$section»",
    async ({ path, role, section }) => {
      useAuthStore.getState().setMockRole(role)

      const router = renderRoute(path)

      const heading = await screen.findByRole("heading", { level: 1 })
      expect(heading).toHaveTextContent(section)
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
      expect(router.state.location.pathname).toBe(path)
    }
  )
})
