import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

describe("I5: foco al cambiar de ruta y enlace para saltar al contenido", () => {
  // LG-08: el store arranca sin sesión. Sin ella, el primer test pasaría en falso
  // con el <main> del Login.
  beforeEach(() => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  })

  it("I5 y LG-10: en la carga inicial de /tripulante (con la sesión puesta) el foco no está en main", async () => {
    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")

    expect(main).not.toHaveFocus()
  })

  it("I5: al pulsar «Mis Vuelos» en el navbar, el foco pasa a main", async () => {
    const user = userEvent.setup()
    const router = renderRoute(PATHS.tripulante.inicio)

    // En jsdom el nav de escritorio siempre está en el DOM y el panel móvil está cerrado.
    const nav = await screen.findByRole("navigation", {
      name: "Navegación principal",
    })
    await user.click(within(nav).getByRole("link", { name: "Mis Vuelos" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.tripulante.misVuelos)
    )
    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus())
  })

  it("I5: existe el enlace «Saltar al contenido principal» hacia #contenido, y main tiene id «contenido»", async () => {
    renderRoute(PATHS.tripulante.inicio)

    const skipLink = await screen.findByRole("link", {
      name: "Saltar al contenido principal",
    })

    expect(skipLink).toHaveAttribute("href", "#contenido")
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenido")
  })
})
