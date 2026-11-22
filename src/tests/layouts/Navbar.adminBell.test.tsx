import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// FE-5, D11 (docs/specs/cierre-pendientes.md): el super_admin no tiene notificaciones, así
// que el navbar no monta la campana para él. Los otros dos roles la siguen teniendo.
// Se busca dentro del header: el Toaster también se llama «Notificaciones» (es una
// región, no un botón).

const HOME: Record<Role, string> = {
  [ROLES.TRIPULANTE]: PATHS.tripulante.inicio,
  [ROLES.SUPER_VISOR]: PATHS.superVisor.inicio,
  [ROLES.SUPER_ADMIN]: PATHS.superAdmin.inicio,
}

const renderAs = async (role: Role) => {
  useAuthStore.getState().setMockRole(role)
  renderRoute(HOME[role])
  const header = await screen.findByRole("banner")
  // Ancla: el navbar ya está pintado (el menú de perfil siempre está).
  await within(header).findByRole("button", { name: /^Menú de perfil/ })
  return header
}

describe("D11: campana del navbar según el rol", () => {
  it("D11 el super_admin no tiene el botón «Notificaciones» en el navbar", async () => {
    const header = await renderAs(ROLES.SUPER_ADMIN)

    expect(
      within(header).queryByRole("button", { name: /^notificaciones/i })
    ).not.toBeInTheDocument()
  })

  it.each([ROLES.TRIPULANTE, ROLES.SUPER_VISOR])(
    "D11 el rol %s sigue teniendo la campana",
    async (role) => {
      const header = await renderAs(role)

      expect(
        within(header).getByRole("button", { name: /^notificaciones/i })
      ).toBeInTheDocument()
    }
  )
})
