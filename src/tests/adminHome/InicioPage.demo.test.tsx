import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { renderRoute } from "../utils/renderRoute"

// Inicio del admin con la cuenta demo (revisión final):
// - no sale ninguna petición: tests/utils/server.ts responde en cero los indicadores del
//   Inicio, así que una petición de más no fallaría; por eso se escuchan las peticiones;
// - el resumen de guardias de ejemplo conserva su cifra de demoras (la sesión real ya no
//   la muestra, InicioPage.realCards.test.tsx).

const H1 = "Admin AirCrew, Bienvenido a AirCrew"

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

const openHome = async () => {
  renderRoute(PATHS.superAdmin.inicio)
  await screen.findByRole("heading", { level: 1, name: H1 })
  // Último bloque con datos: para entonces todas las consultas del Inicio ya salieron.
  return screen.findByRole("heading", {
    level: 2,
    name: "Sistema de suplencias en guardia listo",
  })
}

describe("Inicio del admin (cuenta demo)", () => {
  it("no hace ninguna petición al backend", async () => {
    const requests = recordRequests()

    await openHome()
    await screen.findByText("34 tripulantes registrados")

    expect(requests).toEqual([])
  })

  it("el resumen de guardias de ejemplo muestra las demoras por dotación", async () => {
    const heading = await openHome()

    expect(heading.closest("section")).toHaveTextContent(
      "3 tripulantes en Standby para el bloque vespertino • 0 demoras operativas atribuibles a dotación técnica."
    )
  })
})
