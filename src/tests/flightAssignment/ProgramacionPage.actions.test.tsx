import { act, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast, queryAllToasts, toastDescription } from "../utils/toasts"
import {
  activePanel,
  ACTION_BUTTONS,
  dayGroup,
  expectEligible,
  expectNoLiveRegion,
  filterButton,
  findFullText,
  fixClock,
  innermostWithText,
  openIneligible,
  openSlot,
  openSunday,
  panelButton,
  queryPanelButtons,
  rationaleFor,
  renderProgramacion,
  restoreClock,
  slotRow,
  summaryFor,
  SUNDAY,
  tabFor,
  tabNumbers,
} from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md): la cadena de
// acciones sobre AV-4021 con los datos simulados reales, EN ORDEN. El estado en memoria se
// comparte entre los tests de este archivo y no tiene reinicio: cada test vuelve a montar la
// página (QueryClient nuevo) y parte de lo que dejó el anterior.
//   PG-06 asignar a Sebastián Castro → PG-10 (dinámico) → PG-07 quitarlo → PG-08 sugerir con
//   la IA → PG-09 confirmar → el Inicio dice 9 por completar.
// Si un test falla, los siguientes fallan en cadena: revisar siempre el primero.

vi.setConfig({ testTimeout: 20_000 })

beforeEach(fixClock)
afterEach(restoreClock)

// Registra si alguno de los textos aparece en el documento mientras está activo.
const watchTexts = (texts: string[]) => {
  const seen = new Set<string>()
  const check = () => {
    for (const text of texts)
      if (document.body.textContent?.includes(text)) seen.add(text)
  }
  const observer = new MutationObserver(check)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  return {
    seen,
    stop: () => observer.disconnect(),
  }
}

const wait = (ms: number) =>
  act(() => new Promise((resolve) => setTimeout(resolve, ms)))

describe("Programación: cadena de acciones sobre AV-4021 (PG-06 → PG-09)", () => {
  it("PG-06 asignar a Sebastián Castro llena el Primer Oficial, cierra la lista, pone el foco en «Cambiar Primer Oficial» y pasa a 4 de 6", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    const { row } = await openSlot(user, "Primer Oficial")
    await findFullText(row, "3 cumplen las reglas")
    // Tras la carga inicial, ningún refetch debe mostrar «Cargando…» (solo con isPending).
    const loading = watchTexts(["Cargando días…", "Cargando vuelos…"])

    await user.click(
      within(row).getByRole("button", {
        name: "Asignar a Sebastián Castro como Primer Oficial",
      })
    )

    // El foco llega cuando el puesto ya se ve actualizado.
    await waitFor(() => {
      const change = panelButton("Cambiar Primer Oficial")
      expect(change).toHaveFocus()
      expect(change.closest("li")).toHaveTextContent("Sebastián Castro")
    })
    const filled = slotRow("Cambiar Primer Oficial")
    expect(filled).toHaveTextContent(summaryFor("A320", 48))
    expect(within(filled).queryByText("Sin asignar")).toBeNull()
    expect(filled, "asignación manual").not.toHaveTextContent(
      "Sugerido por la IA"
    )
    expect(filled).not.toHaveTextContent(/cumplen? las reglas/)
    expect(
      queryPanelButtons(/^Ocultar candidatos de /),
      "la lista se cierra"
    ).toHaveLength(0)
    expect(
      queryPanelButtons(/^Asignar a /),
      "sin candidatos a la vista"
    ).toHaveLength(0)

    const panel = activePanel()
    await waitFor(() => expect(panel).toHaveTextContent("4 de 6 puestos"))
    await waitFor(() => expect(tabFor("AV-4021")).toHaveTextContent("4 de 6"))
    expect(tabFor("AV-4021")).toHaveTextContent("Incompleta")
    expect(
      within(panel).getByRole("button", { name: "Sugerir para 2 puestos" })
    ).toBeInTheDocument()
    innermostWithText(
      panel,
      "Faltan 2 puestos. Completa la tripulación para confirmarla y avisar a cada tripulante."
    )

    // Deja pasar el refetch de los días (400 ms) antes de cerrar la vigilancia.
    await wait(700)
    loading.stop()
    expect(
      [...loading.seen],
      "sin «Cargando…» durante el refetch tras la acción"
    ).toEqual([])
    expect(queryAllToasts(), "asignar no muestra toast").toHaveLength(0)
  })

  // Ancla de la cadena: el rango ya lo saca del Capitán, así que esto no prueba la exclusión
  // por ocupante. La exclusión dinámica de verdad está en ProgramacionPage.occupants.test.tsx.
  it("(cadena) tras asignar a Sebastián Castro, no aparece en las listas de los otros puestos de AV-4021", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    // Ancla: viene asignado del test anterior.
    expect(slotRow("Cambiar Primer Oficial")).toHaveTextContent(
      "Sebastián Castro"
    )

    const { row } = await openSlot(user, "Capitán")
    await findFullText(row, "2 cumplen las reglas")
    expectEligible(row, "Capitán", ["Andrés Valencia", "Ricardo Salazar"])
    const { region } = await openIneligible(user, row)

    expect(region).toHaveTextContent("Jorge Medina — Sin habilitación en A320")
    expect(row).not.toHaveTextContent("Sebastián Castro")
  })

  it("PG-07 «Quitar Primer Oficial» vacía el puesto y el foco va a «Asignar Primer Oficial»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    expect(slotRow("Cambiar Primer Oficial")).toHaveTextContent(
      "Sebastián Castro"
    )

    await user.click(panelButton("Quitar Primer Oficial"))

    await waitFor(() => {
      const assign = panelButton("Asignar Primer Oficial")
      expect(assign).toHaveFocus()
      expect(assign.closest("li")).toHaveTextContent("Sin asignar")
    })
    const row = slotRow("Asignar Primer Oficial")
    expect(row).not.toHaveTextContent("Sebastián Castro")
    expect(panelButton("Asignar Primer Oficial")).toHaveAttribute(
      "aria-expanded",
      "false"
    )
    const panel = activePanel()
    await waitFor(() => expect(panel).toHaveTextContent("3 de 6 puestos"))
    await waitFor(() => expect(tabFor("AV-4021")).toHaveTextContent("3 de 6"))
    expect(
      within(panel).getByRole("button", { name: "Sugerir para 3 puestos" })
    ).toBeInTheDocument()
    expect(queryAllToasts(), "quitar no muestra toast").toHaveLength(0)
  })

  it("PG-08 «Sugerir para 3 puestos» muestra «La IA está buscando…», llena los 3 puestos con su explicación, muestra el toast y enfoca «Cambiar Capitán»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    expect(slotRow("Asignar Primer Oficial")).toHaveTextContent("Sin asignar")

    await user.click(panelButton("Sugerir para 3 puestos"))

    const searching = await within(activePanel()).findByText(
      "La IA está buscando…"
    )
    expect(
      searching.closest('[role="status"]'),
      "«La IA está buscando…» es un role=status"
    ).not.toBeNull()

    const toast = await findToast("La IA sugirió 3 tripulantes para AV-4021")
    expect(toast).toBeInTheDocument()
    await waitFor(() => expect(panelButton("Cambiar Capitán")).toHaveFocus())
    expect(within(activePanel()).queryByText("La IA está buscando…")).toBeNull()

    const suggested = [
      { slot: "Capitán", name: "Andrés Valencia", hours: 62 },
      { slot: "Primer Oficial", name: "Sebastián Castro", hours: 48 },
      { slot: "TCP 3", name: "Daniela Torres", hours: 40 },
    ]
    for (const { slot, name, hours } of suggested) {
      const row = slotRow(`Cambiar ${slot}`)
      expect(row, slot).toHaveTextContent(name)
      expect(row, slot).toHaveTextContent(summaryFor("A320", hours))
      expect(row, slot).toHaveTextContent("Sugerido por la IA")
      expect(row, slot).toHaveTextContent(rationaleFor(hours))
    }
    const panel = activePanel()
    expect(
      within(panel).getAllByText("Sugerido por la IA"),
      "solo los 3 puestos sugeridos llevan la etiqueta"
    ).toHaveLength(3)
    expect(slotRow("Cambiar Jefe de Cabina")).toHaveTextContent("Lucía Mora")
    expect(slotRow("Cambiar Jefe de Cabina")).not.toHaveTextContent(
      "Sugerido por la IA"
    )

    await waitFor(() =>
      expect(tabFor("AV-4021")).toHaveTextContent("Lista para confirmar")
    )
    expect(panel).toHaveTextContent("6 de 6 puestos")
    // Sin puestos vacíos no hay tarjeta de IA.
    expect(within(panel).queryByText("Sugerir tripulación")).toBeNull()
    expect(queryPanelButtons(/^Sugerir para /)).toHaveLength(0)
    innermostWithText(
      panel,
      "Tripulación completa. Al confirmar se avisará a los 6 tripulantes."
    )
  })

  it("PG-09 con todo cubierto «Confirmar tripulación» está habilitado; al confirmar: toast, texto persistente con el foco, solo lectura, «Confirmada» y contadores", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    // La lista filtrada no se recalcula tras la acción: AV-4021 sigue en «Por completar».
    await user.click(filterButton("Por completar (3)"))
    await waitFor(() =>
      expect(tabNumbers()).toEqual(["AV-4021", "AV-6150", "AV-9012"])
    )
    const confirm = panelButton("Confirmar tripulación")
    expect(confirm).toBeEnabled()

    await user.click(confirm)

    const toast = await findToast("Tripulación confirmada para AV-4021")
    expect(toastDescription(toast)).toBe("Se avisó a los 6 tripulantes.")
    const done = await findFullText(
      activePanel(),
      "Tripulación confirmada. Se avisó a los 6 tripulantes."
    )
    await waitFor(() => expect(done).toHaveFocus())
    expect(done).toHaveAttribute("tabindex", "-1")
    expectNoLiveRegion(done)

    // Solo lectura.
    expect(queryPanelButtons(ACTION_BUTTONS)).toHaveLength(0)
    expect(within(activePanel()).queryByText("Sugerir tripulación")).toBeNull()

    // La lista sigue igual (con el filtro), AV-4021 pasa a «Confirmada» y los contadores bajan.
    await waitFor(() =>
      expect(tabFor("AV-4021")).toHaveTextContent("Confirmada")
    )
    expect(tabFor("AV-4021")).not.toHaveTextContent(/\d+ de \d+/)
    expect(tabNumbers()).toEqual(["AV-4021", "AV-6150", "AV-9012"])
    await waitFor(() =>
      expect(filterButton("Por completar (2)")).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    )
    expect(filterButton("Todos (6)")).toBeInTheDocument()
    expect(filterButton("Confirmados (4)")).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(dayGroup()).getAllByRole("button")[SUNDAY]
      ).toHaveTextContent("6 vuelos · 2 por completar")
    )

    // El Inicio sigue a la mutación (consulta ["assignment", "days"] invalidada).
    const nav = screen.getAllByRole("navigation")[0]
    await user.click(within(nav).getByRole("link", { name: "Inicio" }))
    const card = (
      await screen.findByRole("heading", { level: 2, name: "Programación" })
    ).closest("article") as HTMLElement
    expect(await within(card).findByText("9 por completar")).toBeInTheDocument()
  })

  it("PG-09 / PG-14 al volver a montar el Inicio, la tarjeta dice «9 por completar» y «9 de 38»", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    renderRoute(PATHS.superVisor.inicio)

    const card = (
      await screen.findByRole("heading", { level: 2, name: "Programación" })
    ).closest("article") as HTMLElement
    expect(await within(card).findByText("9 por completar")).toBeInTheDocument()
    expect(within(card).getByText("Vuelos por completar")).toBeInTheDocument()
    expect(within(card).getByText("9 de 38")).toBeInTheDocument()
  })
})
