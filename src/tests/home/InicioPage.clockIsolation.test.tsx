import { act, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"

import { renderRoute } from "../utils/renderRoute"

// AvailabilitySelector se sustituye por un bloque que cuenta sus renders.
// Si el tic del reloj volviera a renderizar la página o un contenedor común, la cuenta subiría.
const availability = vi.hoisted(() => ({ renders: 0 }))

vi.mock("@/modules/home/components/AvailabilitySelector", () => ({
  default: () => {
    availability.renders += 1
    return <p>Selector de disponibilidad (simulado)</p>
  },
}))

afterEach(() => {
  vi.useRealTimers()
  availability.renders = 0
})

describe("Inicio del tripulante: aislamiento del reloj", () => {
  it("HT-08: durante 3 tics del reloj, el bloque hermano AvailabilitySelector no vuelve a renderizarse", async () => {
    // shouldAdvanceTime: los temporizadores falsos también avanzan con el tiempo real,
    // así TanStack Query, React y los findBy de Testing Library siguen funcionando.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date("2026-10-28T09:05:07Z"))

    renderRoute(PATHS.tripulante.inicio)

    await screen.findByText("Selector de disponibilidad (simulado)")
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
    const rendersBefore = availability.renders
    expect(rendersBefore).toBeGreaterThan(0)

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    // El reloj sí avanzó: el test no pasa por un reloj detenido.
    expect(main.querySelector("time")?.textContent).not.toBe(timeBefore)
    expect(availability.renders).toBe(rendersBefore)
  })
})
