import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { renderRoute } from "../utils/renderRoute"

// Revisión final de FE-4: con la cuenta demo, el Inicio del tripulante usa solo los datos
// de ejemplo (próximo vuelo, reemplazos, certificaciones y estado) y no llama al backend.

const loadingStatuses = (main: HTMLElement) =>
  within(main)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

describe("Inicio del tripulante con la cuenta demo", () => {
  it("muestra los bloques de ejemplo sin ninguna petición", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(
        within(main).getByRole("region", { name: "Asignación de reemplazo" })
      ).toBeInTheDocument()
    )
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
    expect(main).toHaveTextContent("Itinerario Confirmado")

    expect(requests).toEqual([])
  })
})
