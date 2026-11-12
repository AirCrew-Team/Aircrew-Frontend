import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Decisión del orquestador (spec inicio-supervisor, Tarjeta 1): solo Ausencias va en rojo;
// Solicitudes de Reemplazo no, para no pintar la tasa de resolución como una alerta.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

const findArticle = async (title: string) =>
  (await screen.findByRole("heading", { level: 2, name: title })).closest(
    "article"
  ) as HTMLElement

describe("Inicio del supervisor: tarjetas en rojo", () => {
  it("Ausencias pinta en rojo su distintivo; Solicitudes de Reemplazo no", async () => {
    renderRoute(PATHS.superVisor.inicio)

    const absences = await findArticle("Ausencias")
    const absencesBadge = await within(absences).findByText("3 abiertas")
    expect(absencesBadge).toHaveClass("bg-error-container")

    const requests = await findArticle("Solicitudes de Reemplazo")
    const requestsBadge = await within(requests).findByText("5 por aprobar")
    expect(requestsBadge).not.toHaveClass("bg-error-container")
    expect(within(requests).getByText("85.7% Resuelto")).not.toHaveClass(
      "text-destructive"
    )
  })
})
