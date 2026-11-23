import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { renderRoute } from "../utils/renderRoute"

// Revisión final de FE-4: con la cuenta demo, Mis Vuelos usa solo los datos de ejemplo
// (vuelos, métricas y ausencias) y no llama al backend, tampoco al cambiar de pestaña o
// de mes.

const LAZY = { timeout: 3000 }

const loadingStatuses = (main: HTMLElement) =>
  within(main)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

describe("Mis Vuelos con la cuenta demo", () => {
  it("muestra los vuelos y las métricas de ejemplo sin ninguna petición", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)

    await screen.findByRole(
      "heading",
      { level: 1, name: "Mis Vuelos Asignados" },
      LAZY
    )
    const main = screen.getByRole("main")
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
    await waitFor(() => expect(main).toHaveTextContent("AV-9344"))
    expect(main).toHaveTextContent("45h 00m")

    await user.click(
      screen.getByRole("tab", { name: /^Historial de Vuelos Anteriores/ })
    )
    await user.selectOptions(
      within(main).getByRole("combobox", { name: "Mes del roster" }),
      "2024-09"
    )
    await waitFor(() => expect(main).toHaveTextContent("AV-9221"))

    expect(requests).toEqual([])
  })
})
