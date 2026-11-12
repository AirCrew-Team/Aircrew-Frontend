import { act, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// AssignmentStatus se sustituye por un bloque que cuenta sus renders.
// Si el tic del reloj volviera a renderizar la página o un contenedor común, la cuenta subiría.
const assignment = vi.hoisted(() => ({ renders: 0 }))

vi.mock("@/modules/home/components/AssignmentStatus", () => ({
  default: () => {
    assignment.renders += 1
    return <p>Estado de asignación (simulado)</p>
  },
}))

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

afterEach(() => {
  vi.useRealTimers()
  assignment.renders = 0
})

describe("Inicio del tripulante: aislamiento del reloj", () => {
  it("HT-08: durante 3 tics del reloj, el bloque hermano AssignmentStatus no vuelve a renderizarse", async () => {
    // shouldAdvanceTime: los temporizadores falsos también avanzan con el tiempo real,
    // así TanStack Query, React y los findBy de Testing Library siguen funcionando.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date("2026-10-28T09:05:07Z"))

    renderRoute(PATHS.tripulante.inicio)

    await screen.findByText("Estado de asignación (simulado)")
    const main = await screen.findByRole("main")
    // La pantalla termina de cargar: tarjetas con datos y sin bloques en «Cargando».
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await waitFor(() => expect(main.querySelector("time")).not.toBeNull())
    await waitFor(() =>
      expect(
        screen
          .queryAllByRole("status")
          .filter((element) => /^cargando/i.test(element.textContent ?? ""))
      ).toHaveLength(0)
    )

    const time = main.querySelector("time") as HTMLTimeElement
    const timeBefore = time.textContent
    const rendersBefore = assignment.renders
    expect(rendersBefore).toBeGreaterThan(0)

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    // El reloj sí avanzó: el test no pasa por un reloj detenido.
    expect(main.querySelector("time")?.textContent).not.toBe(timeBefore)
    expect(assignment.renders).toBe(rendersBefore)
  })
})
