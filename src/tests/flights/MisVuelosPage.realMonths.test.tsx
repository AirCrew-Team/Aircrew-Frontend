import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  mockMetrics,
  mockMyAbsences,
  mockMyAssignments,
} from "../mocks/crewFlightsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"

// FE-6 (docs/specs/cierre-pendientes.md, D7): con la sesión real el selector «Mes del
// roster» ya no muestra los meses fijos de 2024 de los datos de ejemplo, sino los cuatro
// meses anteriores, el actual (marcado «(Actual)», el valor inicial) y el siguiente,
// calculados con la fecha local de hoy. Con la cuenta demo sigue el listado fijo (MV-07).

const LAZY = { timeout: 3000 }

// 31 de enero a las 23:30 hora local: en UTC ya es 1 de febrero en América, así que un
// cálculo en UTC marcaría febrero como el mes actual. También cruza de año.
const TODAY = new Date(2026, 0, 31, 23, 30)

const REAL_MONTHS = [
  { value: "2025-09", text: "Septiembre 2025" },
  { value: "2025-10", text: "Octubre 2025" },
  { value: "2025-11", text: "Noviembre 2025" },
  { value: "2025-12", text: "Diciembre 2025" },
  { value: "2026-01", text: "Enero 2026 (Actual)" },
  { value: "2026-02", text: "Febrero 2026" },
]

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const monthSelect = (main: HTMLElement) =>
  within(main).getByRole<HTMLSelectElement>("combobox", {
    name: "Mes del roster",
  })

// El status sr-only de resultados es el único status sin clase de carga del explorador.
const resultsStatus = (main: HTMLElement) =>
  Array.from(main.querySelectorAll<HTMLElement>('[role="status"].sr-only'))

// FE-4: la sesión real ya pide sus vuelos, métricas y ausencias; aquí el backend no tiene
// vuelos, para que solo cuenten los meses.
beforeEach(() => {
  mockMyAssignments([])
  mockMetrics()
  mockMyAbsences([])
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("FE-6: meses del roster con la sesión real", () => {
  it("FE-6: el selector tiene los 4 meses anteriores, el actual con «(Actual)» y el siguiente, y empieza en el actual", async () => {
    useAuthStore.getState().setUser(REAL_USERS.crew)

    renderRoute(PATHS.tripulante.misVuelos)
    await screen.findByRole(
      "heading",
      { level: 1, name: "Mis Vuelos Asignados" },
      LAZY
    )
    const main = screen.getByRole("main")
    const select = monthSelect(main)

    const options = Array.from(select.options).map((option) => ({
      value: option.value,
      text: normalize(option.textContent),
    }))
    expect(options).toEqual(REAL_MONTHS)
    expect(select).toHaveValue("2026-01")
    expect(main).not.toHaveTextContent("2024")
  })

  it("FE-6: el status de resultados nombra el mes actual generado", async () => {
    useAuthStore.getState().setUser(REAL_USERS.crew)

    renderRoute(PATHS.tripulante.misVuelos)
    await screen.findByRole(
      "heading",
      { level: 1, name: "Mis Vuelos Asignados" },
      LAZY
    )
    const main = screen.getByRole("main")

    await waitFor(() =>
      expect(
        resultsStatus(main).map((status) => normalize(status.textContent))
      ).toContain("0 vuelos en Próximos Vuelos, Enero 2026")
    )
  })
})
