import { waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { findToast } from "../utils/toasts"
import {
  activePanel,
  dayButton,
  DAYS,
  filterButton,
  findDayButtons,
  findPanelHeading,
  fixClock,
  limitButton,
  panelButton,
  renderProgramacion,
  restoreClock,
  SATURDAY,
  selectDay,
  selectedFlight,
  SUNDAY,
  tabFor,
  tabNumbers,
} from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md, «Revisión de código
// (2026-11-17)», Importante 1): la selección por defecto se elige entre los vuelos VISIBLES.
// MUTA el estado en memoria (sin reinicio) con los datos reales de hoy + 4, por eso va en un
// archivo propio: los tests van EN ORDEN y el segundo parte de lo que dejó el primero.
//   Hoy + 4 por orden de salida: AV-8409, AV-2288, AV-4019, AV-5528, AV-9010 | AV-6148.
//   Al confirmar AV-5528, el único por completar es AV-6148, en la posición 6 (fuera del corte).

vi.setConfig({ testTimeout: 20_000 })

beforeEach(fixClock)
afterEach(restoreClock)

const SATURDAY_FLIGHTS = ["AV-8409", "AV-2288", "AV-4019", "AV-5528", "AV-9010"]

describe("Programación: selección por defecto dentro del corte (revisión 2026-11-17)", () => {
  it("(preparación) completar y confirmar AV-5528 deja a AV-6148 como único por completar de hoy + 4", async () => {
    const { user } = await renderProgramacion()
    await findDayButtons()
    await waitFor(() =>
      expect(dayButton(SATURDAY)).toHaveTextContent(DAYS[SATURDAY].summary)
    )
    await selectDay(user, SATURDAY, "AV-5528")
    // Antes de la acción, el primero por completar (AV-5528) es visible y se selecciona.
    await findPanelHeading("AV-5528 · Bogotá (BOG) → Barranquilla (BAQ)")

    await user.click(panelButton("Sugerir para 1 puesto"))
    await findToast("La IA sugirió 1 tripulante para AV-5528")
    await waitFor(() =>
      expect(tabFor("AV-5528")).toHaveTextContent("Lista para confirmar")
    )
    await waitFor(() =>
      expect(panelButton("Confirmar tripulación")).toBeEnabled()
    )
    await user.click(panelButton("Confirmar tripulación"))

    await findToast("Tripulación confirmada para AV-5528")
    await waitFor(() =>
      expect(tabFor("AV-5528")).toHaveTextContent("Confirmada")
    )
    await waitFor(() =>
      expect(dayButton(SATURDAY)).toHaveTextContent(
        "6 vuelos · 1 por completar"
      )
    )
  })

  it("si el primer vuelo por completar queda fuera de los 5 visibles y ningún visible está por completar, se selecciona el primer visible y su ficha corresponde a su pestaña", async () => {
    const { user } = await renderProgramacion()
    await findDayButtons()
    // Ancla: viene del test anterior.
    await waitFor(() =>
      expect(dayButton(SATURDAY)).toHaveTextContent(
        "6 vuelos · 1 por completar"
      )
    )
    // Cambiar de día y volver monta un tablero nuevo, sin selección elegida.
    await selectDay(user, SUNDAY, "AV-4021")
    await selectDay(user, SATURDAY, "AV-8409")

    expect(tabNumbers(), "los 5 primeros, en orden de salida").toEqual(
      SATURDAY_FLIGHTS
    )
    // AV-6148 sigue contando en los filtros y en el corte.
    expect(filterButton("Por completar (1)")).toBeInTheDocument()
    expect(limitButton("Ver 1 más")).toBeInTheDocument()

    await waitFor(() =>
      expect(
        selectedFlight(),
        "una sola pestaña seleccionada, la del primer visible"
      ).toEqual(["AV-8409"])
    )
    const panel = activePanel()
    await findPanelHeading("AV-8409 · Bogotá (BOG) → Medellín (MDE)")
    expect(panel).not.toHaveTextContent("AV-6148")
    const selectedTab = tabFor("AV-8409")
    expect(selectedTab, "la pestaña controla la ficha").toHaveAttribute(
      "aria-controls",
      panel.id
    )
    expect(panel, "la ficha la nombra su pestaña").toHaveAttribute(
      "aria-labelledby",
      selectedTab.id
    )
  })
})
