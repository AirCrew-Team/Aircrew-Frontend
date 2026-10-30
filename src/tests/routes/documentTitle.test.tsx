import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import indexHtml from "../../../index.html?raw"
import { renderRoute } from "../utils/renderRoute"
import { ROUTE_CASES } from "../utils/routeCases"

// TD-01: la pestaña dice siempre «AirCrew». El título sale solo de index.html,
// y ninguna pantalla monta su propio <title> (si lo hiciera, React lo subiría al <head>).
const expectNoPageTitle = () =>
  expect(document.querySelectorAll("title")).toHaveLength(0)

describe("TD-01: título fijo de la pestaña", () => {
  it("TD-01: index.html declara el título «AirCrew»", () => {
    expect(indexHtml).toContain("<title>AirCrew</title>")
  })

  it.each(ROUTE_CASES)(
    "TD-01: $path ($role) no cambia el título",
    async ({ path, role, section, heading }) => {
      useAuthStore.getState().setMockRole(role)

      renderRoute(path)

      await screen.findByRole("heading", { level: 1, name: heading ?? section })
      expectNoPageTitle()
    }
  )

  it("TD-01: la 404 no cambia el título", async () => {
    renderRoute("/ruta-que-no-existe")

    await screen.findByRole("heading", {
      level: 1,
      name: "Página no encontrada",
    })
    expectNoPageTitle()
  })

  it("TD-01: /login no cambia el título", async () => {
    useAuthStore.setState({ user: null })

    renderRoute(PATHS.login)

    await screen.findByRole("heading", { level: 1 })
    expectNoPageTitle()
  })
})
