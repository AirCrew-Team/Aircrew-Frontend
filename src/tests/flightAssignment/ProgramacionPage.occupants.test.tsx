import { waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ELIGIBLE_COUNT,
  findFullText,
  findPanelHeading,
  fixClock,
  openIneligible,
  openSlot,
  panelButton,
  renderProgramacion,
  restoreClock,
  selectDay,
  slotRow,
} from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md, PG-10 y «Revisión de
// código (2026-11-17)»): PG-10 dinámico de verdad. Tras asignar a un TCP en un puesto TCP de un
// vuelo, esa persona ya no aparece en otro puesto TCP vacío del mismo vuelo.
// MUTA el estado en memoria (sin reinicio): va en un archivo propio, fuera de la cadena
// PG-06 → PG-09 de AV-4021 (que solo tiene vacío el TCP 3). Usa AV-8430 de hoy + 6 (lunes 23),
// el primero del día y sin nadie asignado (Jefe de Cabina y TCP 1 a 3 vacíos).
// El nombre se lee de la lista: el test no fija a quién elige.

vi.setConfig({ testTimeout: 20_000 })

beforeEach(fixClock)
afterEach(restoreClock)

const MONDAY = 6

// Nombres de los elegibles del puesto, en orden, a partir de «Asignar a {nombre} como {puesto}».
const eligibleNames = (row: HTMLElement, slot: string) =>
  within(row)
    .queryAllByRole("button", { name: /^Asignar a .+ como .+$/ })
    .map((button) =>
      (button.getAttribute("aria-label") ?? "")
        .replace(/^Asignar a /, "")
        .replace(` como ${slot}`, "")
    )

describe("Programación: PG-10 dinámico en AV-8430 (revisión 2026-11-17)", () => {
  it("PG-10 (dinámico) tras asignar a un TCP en el TCP 1, ya no aparece en la lista del TCP 2 del mismo vuelo (ni en «No cumplen»), tampoco al volver a abrirla", async () => {
    const { user } = await renderProgramacion()
    await selectDay(user, MONDAY, "AV-8430")
    await findPanelHeading("AV-8430 · Bogotá (BOG) → Medellín (MDE)")
    expect(slotRow("Asignar TCP 2")).toHaveTextContent("Sin asignar")

    // Ancla de que el test muerde: los elegibles del TCP 2 antes de asignar.
    const before = await openSlot(user, "TCP 2")
    await findFullText(before.row, ELIGIBLE_COUNT)
    const tcp2Before = eligibleNames(before.row, "TCP 2")

    // Abrir el TCP 1 cierra el TCP 2. Se asigna a su primer elegible.
    const tcp1 = await openSlot(user, "TCP 1")
    await findFullText(tcp1.row, ELIGIBLE_COUNT)
    const [name] = eligibleNames(tcp1.row, "TCP 1")
    expect(name, "el TCP 1 tiene al menos un elegible").toBeTruthy()
    expect(
      tcp2Before,
      `${name} también cumplía las reglas en el TCP 2 antes de asignarlo`
    ).toContain(name)
    await user.click(
      within(tcp1.row).getByRole("button", {
        name: `Asignar a ${name} como TCP 1`,
      })
    )
    await waitFor(() => {
      const change = panelButton("Cambiar TCP 1")
      expect(change).toHaveFocus()
      expect(change.closest("li")).toHaveTextContent(name)
    })

    const { row } = await openSlot(user, "TCP 2")
    // En cuanto se ve la lista: nunca con quien ya ocupa otro puesto del vuelo.
    await findFullText(row, ELIGIBLE_COUNT)
    expect(
      eligibleNames(row, "TCP 2"),
      `${name} ya ocupa el TCP 1: no sale entre los elegibles del TCP 2 al abrir la lista`
    ).not.toContain(name)
    // Y con la consulta de candidatos ya resuelta (deja pasar los 400 ms de latencia).
    await waitFor(() =>
      expect(eligibleNames(row, "TCP 2")).toHaveLength(tcp2Before.length - 1)
    )
    expect(eligibleNames(row, "TCP 2")).not.toContain(name)
    const { region } = await openIneligible(user, row)
    expect(region).not.toHaveTextContent(name)
    expect(row).not.toHaveTextContent(name)
  })
})
