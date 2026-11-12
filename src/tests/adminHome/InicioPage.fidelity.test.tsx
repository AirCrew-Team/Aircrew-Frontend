import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Protección de la extracción a modules/shared/opsHome (spec inicio-supervisor):
// lo que el test principal del Admin no comprueba y depende de props de los compartidos.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

const H1 = "Admin AirCrew, Bienvenido a AirCrew"

describe("Inicio del super admin: fidelidad tras la extracción", () => {
  it("la bienvenida conserva la barra decorativa del reloj", async () => {
    renderRoute(PATHS.superAdmin.inicio)

    await screen.findByRole("heading", { level: 1, name: H1 })
    const welcome = screen.getByRole("region", { name: H1 })
    expect(welcome.querySelector('[aria-hidden="true"].h-1')).not.toBeNull()
  })

  it("la foto muestra «Pista activa» y «QNH local» como pares dt/dd", async () => {
    renderRoute(PATHS.superAdmin.inicio)

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Operaciones Normales • Base Central Bogotá Eldorado",
    })
    const hero = heading.closest("section") as HTMLElement
    const terms = Array.from(
      hero.querySelectorAll("dt"),
      (dt) => dt.textContent
    )
    const values = Array.from(
      hero.querySelectorAll("dd"),
      (dd) => dd.textContent
    )
    expect(terms).toEqual(["Pista activa", "QNH local"])
    expect(values).toEqual(["RWY 13R", "1022 hPa"])
    expect(within(hero).getByText("RWY 13R")).toBeInTheDocument()
  })
})
