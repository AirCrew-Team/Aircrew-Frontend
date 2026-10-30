import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Ruta fijada por el contrato de la spec configuracion-perfil (PATHS.configuracion).
const CONFIGURACION_PATH = "/configuracion"

describe("CP-04: «Configuración» del menú de perfil", () => {
  it.each(Object.values(ROLES))(
    "CP-04: con un %s, elegir «Configuración» en el menú de perfil lleva a /configuracion y cierra el menú",
    async (role) => {
      useAuthStore.getState().setMockRole(role)
      const user = userEvent.setup()
      const router = renderRoute(HOME_PATH_BY_ROLE[role])

      await user.click(
        await screen.findByRole("button", { name: /menú de perfil/i })
      )
      await user.click(
        await screen.findByRole("menuitem", { name: "Configuración" })
      )

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(CONFIGURACION_PATH)
      )
      await waitFor(() =>
        expect(
          screen.queryByRole("menuitem", { name: "Configuración" })
        ).not.toBeInTheDocument()
      )
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    }
  )

  // Mismo patrón de foco al navegar que I5 (MainLayout.focus.test.tsx). Base UI devuelve
  // el foco al trigger al cerrar el menú, después del efecto de foco de MainLayout.
  it.each(Object.values(ROLES))(
    "CP-04 / I5: con un %s, tras elegir «Configuración» en el menú de perfil el foco termina en main",
    async (role) => {
      useAuthStore.getState().setMockRole(role)
      const user = userEvent.setup()
      const router = renderRoute(HOME_PATH_BY_ROLE[role])

      await user.click(
        await screen.findByRole("button", { name: /menú de perfil/i })
      )
      await user.click(
        await screen.findByRole("menuitem", { name: "Configuración" })
      )

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(CONFIGURACION_PATH)
      )
      // Esperar a que el menú termine de cerrarse: es cuando Base UI restaura el foco.
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
      )
      await waitFor(() => expect(screen.getByRole("main")).toHaveFocus())
    }
  )

  it("no regresión: si el menú de perfil se cierra con Escape (sin navegar), el foco vuelve al botón del menú", async () => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    const user = userEvent.setup()
    const router = renderRoute(PATHS.tripulante.inicio)

    const trigger = await screen.findByRole("button", {
      name: /menú de perfil/i,
    })
    await user.click(trigger)
    await screen.findByRole("menuitem", { name: "Configuración" })

    await user.keyboard("{Escape}")

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
  })
})
