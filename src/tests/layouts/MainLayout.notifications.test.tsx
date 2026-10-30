import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"

import { renderRoute } from "../utils/renderRoute"

describe("CA-12: indicador de notificaciones sin leer", () => {
  it("CA-12: sin notificaciones, el botón se llama exactamente «Notificaciones» (sin «sin leer»)", async () => {
    renderRoute(PATHS.tripulante.inicio)

    const button = await screen.findByRole("button", {
      name: /^notificaciones/i,
    })

    expect(button).toHaveAccessibleName("Notificaciones")
  })
})
