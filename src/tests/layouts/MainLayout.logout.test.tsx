import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

describe("CA-16: cerrar sesión", () => {
  // LG-08: el store arranca sin sesión. Sin ella, logout() pasaría en falso.
  beforeEach(() => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  })

  it("CA-16: logout() del store pone user en null", () => {
    useAuthStore.getState().logout()

    expect(useAuthStore.getState().user).toBeNull()
  })

  it("CA-16: «Cerrar sesión» en el menú de perfil limpia la sesión y lleva a /login", async () => {
    const user = userEvent.setup()
    const router = renderRoute(PATHS.tripulante.inicio)

    await user.click(
      await screen.findByRole("button", { name: /menú de perfil/i })
    )
    await user.click(
      await screen.findByRole("menuitem", { name: "Cerrar sesión" })
    )

    await waitFor(() => expect(useAuthStore.getState().user).toBeNull())
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.login)
    )
  })

  it("CA-16: en /login sin sesión, el selector «Rol (dev)» permite entrar como superVisor", async () => {
    useAuthStore.setState({ user: null })
    const user = userEvent.setup()
    const router = renderRoute(PATHS.login)

    const roleSelect = await screen.findByRole("combobox", {
      name: /rol \(dev\)/i,
    })
    await user.selectOptions(roleSelect, ROLES.SUPER_VISOR)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.superVisor.inicio)
    )
  })
})
