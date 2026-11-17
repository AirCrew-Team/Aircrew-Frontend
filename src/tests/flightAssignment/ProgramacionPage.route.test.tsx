import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import {
  fixClock,
  H1,
  renderProgramacion,
  restoreClock,
} from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md), PG-01: menú,
// h1, cabecera y acceso solo para el supervisor. Sin mutaciones.

beforeEach(fixClock)
afterEach(restoreClock)

describe("Programación: menú y acceso (PG-01)", () => {
  it("PG-01 el menú del supervisor tiene «Programación» justo después de «Inicio»", async () => {
    await renderProgramacion()

    const nav = screen.getAllByRole("navigation")[0]
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent?.trim())
    expect(labels).toEqual(
      expect.arrayContaining([
        "Inicio",
        "Programación",
        "Recomendaciones",
        "Tripulación",
        "Ausencias",
      ])
    )
    expect(labels.indexOf("Programación")).toBe(labels.indexOf("Inicio") + 1)
  })

  it("PG-01 «Programación» del menú lleva a /supervisor/programacion", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    const user = userEvent.setup()
    const router = renderRoute(PATHS.superVisor.inicio)

    const nav = (await screen.findAllByRole("navigation"))[0]
    await user.click(within(nav).getByRole("link", { name: "Programación" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/supervisor/programacion")
    )
    expect(
      await screen.findByRole("heading", { level: 1, name: H1 })
    ).toBeInTheDocument()
  })

  it("PG-01 la ruta muestra un único h1 «Programación»", async () => {
    await renderProgramacion()

    expect(PATHS.superVisor.programacion).toBe("/supervisor/programacion")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("PG-01 la cabecera tiene el antetítulo y la descripción de la spec", async () => {
    const { main } = await renderProgramacion()

    expect(main).toHaveTextContent(
      "Programación de tripulaciones · Base Eldorado · BOG · Horas en UTC"
    )
    expect(
      screen.getByText(
        "Asigna la tripulación de los vuelos que salen de tu base."
      )
    ).toBeInTheDocument()
  })

  it.each([
    { role: ROLES.TRIPULANTE, home: PATHS.tripulante.inicio },
    { role: ROLES.SUPER_ADMIN, home: PATHS.superAdmin.inicio },
  ])(
    "PG-01 con el rol $role, /supervisor/programacion redirige a $home",
    async ({ role, home }) => {
      useAuthStore.getState().setMockRole(role)

      const router = renderRoute(PATHS.superVisor.programacion)

      await waitFor(() => expect(router.state.location.pathname).toBe(home))
      expect(
        screen.queryByRole("heading", { level: 1, name: H1 })
      ).not.toBeInTheDocument()
    }
  )
})
