import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { renderRoute } from "../utils/renderRoute"

// Revisión final de FE-4: con la cuenta demo, Certificaciones usa solo los datos de ejemplo
// y no llama al backend (ni certifications/me ni nada más).

const LAZY = { timeout: 3000 }

const loadingStatuses = (main: HTMLElement) =>
  within(main)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

describe("Certificaciones con la cuenta demo", () => {
  it("muestra las licencias de ejemplo sin ninguna petición", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    renderRoute(PATHS.tripulante.certificaciones)

    await screen.findByRole(
      "heading",
      { level: 1, name: "Certificaciones y Licencias" },
      LAZY
    )
    const main = screen.getByRole("main")
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
    await waitFor(() =>
      expect(main).toHaveTextContent("Licencia ATP (Airline Transport Pilot)")
    )

    expect(requests).toEqual([])
  })
})
