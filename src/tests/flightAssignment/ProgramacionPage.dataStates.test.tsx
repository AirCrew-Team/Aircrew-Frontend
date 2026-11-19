import { act, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PlannedFlight } from "@/modules/shared/flightAssignment/types/flightAssignment.types"

import { queryAllToasts } from "../utils/toasts"
import {
  activePanel,
  alertsIn,
  DAYS,
  dayButton,
  dayGroup,
  findDayButtons,
  findFullText,
  findListSection,
  findTabFor,
  fixClock,
  openSlot,
  openSunday,
  panelButton,
  renderProgramacion,
  restoreClock,
  SATURDAY,
  selectDay,
  slotRow,
  statusesIn,
  SUNDAY,
  tabFor,
} from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md), PG-13: estados de
// carga y error por bloque, acción en curso y acción fallida, con funciones sustituidas.
// Solo se sustituyen funciones que no resuelven o que fallan: ningún test muta los datos.

vi.setConfig({ testTimeout: 15_000 })

type DataFn = (...args: unknown[]) => unknown

// Cada función de flightAssignment.data.ts se envuelve: registra su nombre y argumentos y,
// si hay override, lo usa en lugar de la real. El test no importa el módulo, así compila
// aunque aún no exista (la factory solo corre cuando la página lo importa).
const data = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
  // Las funciones reales, para los overrides que parten de ellas.
  real: {} as Record<string, DataFn>,
}))

vi.mock(
  "@/modules/shared/flightAssignment/data/flightAssignment.data",
  async () => {
    const actual: Record<string, unknown> = await import(
      "@/tests/fixtures/flightAssignment.fixtures"
    )
    return Object.fromEntries(
      Object.entries(actual).map(([name, value]) => {
        if (typeof value !== "function") return [name, value]
        const real = value as DataFn
        data.real[name] = real
        return [
          name,
          (...args: unknown[]) => {
            data.calls.push({ name, args })
            return (data.overrides[name] ?? real)(...args)
          },
        ]
      })
    )
  }
)

beforeEach(fixClock)

afterEach(() => {
  restoreClock()
  data.calls = []
  data.overrides = {}
})

const never = () => new Promise(() => {})
const fail = () => Promise.reject(new Error("servicio caído"))

const SAVE_ERROR = "No se pudo guardar el cambio. Intenta de nuevo."
const SUGGEST_ERROR =
  "La IA no pudo sugerir una tripulación. Intenta de nuevo o asigna a mano."

// El bloque tiene exactamente un role=status (o alert) y es el del texto dado.
const expectSingle = (found: HTMLElement[], text: string, block: string) => {
  expect(found, `${block}: un solo elemento`).toHaveLength(1)
  expect(found[0]).toHaveTextContent(text)
}

describe("Programación: carga y error de los días (PG-13)", () => {
  it("PG-13 mientras cargan los días, el grupo «Día» tiene un solo status «Cargando días…» y la lista de hoy carga igual", async () => {
    data.overrides.getScheduleDays = never

    await renderProgramacion()

    const group = await screen.findByRole("group", { name: "Día" })
    await waitFor(() =>
      expectSingle(statusesIn(group), "Cargando días…", "grupo «Día»")
    )
    expect(alertsIn(group)).toHaveLength(0)
    // La consulta de vuelos no depende de la de días.
    expect(await findTabFor("AV-8402")).toBeInTheDocument()
  })

  it("PG-13 si fallan los días, el grupo «Día» tiene un solo alert «No se pudo cargar la programación.» y la lista de hoy carga igual", async () => {
    data.overrides.getScheduleDays = fail

    await renderProgramacion()

    const group = await screen.findByRole("group", { name: "Día" })
    await waitFor(() =>
      expectSingle(
        alertsIn(group),
        "No se pudo cargar la programación.",
        "grupo «Día»"
      )
    )
    expect(statusesIn(group)).toHaveLength(0)
    expect(await findTabFor("AV-8402")).toBeInTheDocument()
    expect(queryAllToasts()).toHaveLength(0)
  })
})

describe("Programación: carga y error de los vuelos (PG-13)", () => {
  it("PG-13 mientras cargan los vuelos, la section de la lista tiene un solo status «Cargando vuelos…» y los días cargan igual", async () => {
    data.overrides.getDayFlights = never

    await renderProgramacion()

    const section = await findListSection(DAYS[0].heading)
    await waitFor(() =>
      expectSingle(statusesIn(section), "Cargando vuelos…", "lista")
    )
    expect(alertsIn(section)).toHaveLength(0)
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    await findDayButtons()
    await waitFor(() => expect(dayButton(0)).toHaveTextContent(DAYS[0].summary))
  })

  it("PG-13 si fallan los vuelos, la section de la lista tiene un solo alert «No se pudieron cargar los vuelos.» y los días cargan igual", async () => {
    data.overrides.getDayFlights = fail

    await renderProgramacion()

    const section = await findListSection(DAYS[0].heading)
    await waitFor(() =>
      expectSingle(
        alertsIn(section),
        "No se pudieron cargar los vuelos.",
        "lista"
      )
    )
    expect(statusesIn(section)).toHaveLength(0)
    expect(screen.queryAllByRole("tabpanel")).toHaveLength(0)
    await findDayButtons()
    await waitFor(() => expect(dayButton(0)).toHaveTextContent(DAYS[0].summary))
  })
})

describe("Programación: carga y error de los candidatos (PG-13)", () => {
  it("PG-13 mientras cargan los candidatos, el li del puesto abierto tiene un solo status «Cargando candidatos…»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.getSlotCandidates = never

    const { row } = await openSlot(user, "Primer Oficial")

    await waitFor(() =>
      expectSingle(statusesIn(row), "Cargando candidatos…", "puesto abierto")
    )
    expect(alertsIn(row)).toHaveLength(0)
  })

  it("PG-13 si fallan los candidatos, el li del puesto abierto tiene un solo alert «No se pudieron cargar los candidatos.»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.getSlotCandidates = fail

    const { row } = await openSlot(user, "Primer Oficial")

    await waitFor(() =>
      expectSingle(
        alertsIn(row),
        "No se pudieron cargar los candidatos.",
        "puesto abierto"
      )
    )
    expect(statusesIn(row)).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })
})

describe("Programación: acción en curso (PG-08, PG-13)", () => {
  it("PG-08 mientras la IA busca, la ficha tiene un solo status «La IA está buscando…» y todos sus botones están deshabilitados", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.suggestCrew = never

    await user.click(panelButton("Sugerir para 3 puestos"))

    const panel = activePanel()
    await waitFor(() =>
      expectSingle(statusesIn(panel), "La IA está buscando…", "ficha")
    )
    const buttons = within(panel).getAllByRole("button")
    expect(buttons.length, "la ficha tiene botones de acción").toBeGreaterThan(
      5
    )
    for (const button of buttons) expect(button).toBeDisabled()
  })

  it("PG-13 (precisión) mientras se asigna, todos los botones de acción de la ficha están deshabilitados", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    const { row } = await openSlot(user, "Primer Oficial")
    await findFullText(row, "3 cumplen las reglas")
    data.overrides.assignCrew = never

    await user.click(
      within(row).getByRole("button", {
        name: "Asignar a Sebastián Castro como Primer Oficial",
      })
    )

    await waitFor(() =>
      expect(panelButton("Quitar Jefe de Cabina")).toBeDisabled()
    )
    for (const button of within(activePanel()).getAllByRole("button")) {
      expect(button).toBeDisabled()
    }
  })
})

describe("Programación: acción fallida (PG-13)", () => {
  it("PG-13 si falla «Quitar», la ficha muestra un solo alert de guardado, sin toast, el puesto sigue y el foco vuelve a «Quitar Jefe de Cabina»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.unassignCrew = fail

    await user.click(panelButton("Quitar Jefe de Cabina"))

    const panel = activePanel()
    await waitFor(() => expectSingle(alertsIn(panel), SAVE_ERROR, "ficha"))
    await waitFor(() =>
      expect(panelButton("Quitar Jefe de Cabina")).toHaveFocus()
    )
    expect(slotRow("Cambiar Jefe de Cabina")).toHaveTextContent("Lucía Mora")
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("PG-13 si falla «Asignar», la ficha muestra el alert de guardado, sin toast, y el puesto sigue vacío", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    const { row } = await openSlot(user, "Primer Oficial")
    await findFullText(row, "3 cumplen las reglas")
    data.overrides.assignCrew = fail

    await user.click(
      within(row).getByRole("button", {
        name: "Asignar a Sebastián Castro como Primer Oficial",
      })
    )

    const panel = activePanel()
    await waitFor(() => expectSingle(alertsIn(panel), SAVE_ERROR, "ficha"))
    expect(row).toHaveTextContent("Sin asignar")
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("PG-13 si falla la sugerencia, la ficha muestra su alert, sin toast, y el foco vuelve a «Sugerir para 3 puestos»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.suggestCrew = fail

    await user.click(panelButton("Sugerir para 3 puestos"))

    const panel = activePanel()
    await waitFor(() => expectSingle(alertsIn(panel), SUGGEST_ERROR, "ficha"))
    await waitFor(() =>
      expect(panelButton("Sugerir para 3 puestos")).toHaveFocus()
    )
    expect(within(panel).queryByText("La IA está buscando…")).toBeNull()
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("PG-13 (precisión) la alerta se borra con la siguiente acción", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.unassignCrew = fail
    await user.click(panelButton("Quitar Jefe de Cabina"))
    await waitFor(() =>
      expectSingle(alertsIn(activePanel()), SAVE_ERROR, "ficha")
    )
    data.overrides.suggestCrew = never

    await user.click(panelButton("Sugerir para 3 puestos"))

    await waitFor(() =>
      expectSingle(statusesIn(activePanel()), "La IA está buscando…", "ficha")
    )
    expect(alertsIn(activePanel())).toHaveLength(0)
  })

  it("PG-13 (precisión) la alerta se borra al cambiar de vuelo", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.unassignCrew = fail
    await user.click(panelButton("Quitar Jefe de Cabina"))
    await waitFor(() =>
      expectSingle(alertsIn(activePanel()), SAVE_ERROR, "ficha")
    )

    await user.click(tabFor("AV-6150"))
    await waitFor(() =>
      expect(tabFor("AV-6150")).toHaveAttribute("aria-selected", "true")
    )
    expect(alertsIn(activePanel())).toHaveLength(0)
    await user.click(tabFor("AV-4021"))
    await waitFor(() =>
      expect(tabFor("AV-4021")).toHaveAttribute("aria-selected", "true")
    )
    expect(alertsIn(activePanel())).toHaveLength(0)
  })

  it("PG-13 (precisión) la alerta se borra al cambiar de día", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    data.overrides.unassignCrew = fail
    await user.click(panelButton("Quitar Jefe de Cabina"))
    await waitFor(() =>
      expectSingle(alertsIn(activePanel()), SAVE_ERROR, "ficha")
    )

    await selectDay(user, SATURDAY)
    await selectDay(user, SUNDAY, "AV-4021")
    await waitFor(() =>
      expect(tabFor("AV-4021")).toHaveAttribute("aria-selected", "true")
    )

    expect(alertsIn(activePanel())).toHaveLength(0)
    expect(screen.queryByText(SAVE_ERROR)).toBeNull()
    expect(dayGroup()).toBeInTheDocument()
  })
})

// Falla cuando el test lo decide. Así se puede sacar el foco del disparador durante la acción:
// en un navegador, deshabilitar el botón enfocado le quita el foco, pero jsdom no lo hace y,
// sin esto, «el foco vuelve al botón» pasaría aunque nadie lo moviera.
const failLater = () => {
  let rejectNow: (error: Error) => void = () => {}
  return {
    override: () =>
      new Promise((_, reject) => {
        rejectNow = reject
      }),
    fail: () =>
      act(async () => {
        rejectNow(new Error("servicio caído"))
      }),
  }
}

// jsdom no aplica blur() a un botón deshabilitado: el foco se lleva a otro botón, fuera de la ficha.
const moveFocusAway = async () => {
  const elsewhere = dayButton(SATURDAY)
  await act(async () => {
    elsewhere.focus()
  })
  expect(elsewhere, "el foco salió del disparador").toHaveFocus()
}

// AV-4021 de hoy + 5 con todos sus puestos cubiertos y el estado «completa» (sin mutar los datos).
const withCompleteAv4021 = async (...args: unknown[]) => {
  const flights = (await data.real.getDayFlights(...args)) as PlannedFlight[]
  return flights.map((flight): PlannedFlight =>
    flight.flightNumber !== "AV-4021"
      ? flight
      : {
          ...flight,
          status: "completa",
          slots: flight.slots.map((slot, index) =>
            slot.assignee
              ? slot
              : {
                  ...slot,
                  assignee: {
                    crewId: `prueba-${slot.id}`,
                    fullName: `Tripulante de prueba ${index + 1}`,
                    summary:
                      "Habilitado en A320 · 50 h de 90 este mes · descanso cumplido",
                    source: "manual",
                    rationale: null,
                  },
                }
          ),
        }
  )
}

describe("Programación: foco tras una acción fallida (revisión 2026-11-17)", () => {
  it("si falla «Asignar a Sebastián Castro como Primer Oficial», aparece la alerta de guardado, sin toast, y el foco vuelve a ese botón", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    const { row } = await openSlot(user, "Primer Oficial")
    await findFullText(row, "3 cumplen las reglas")
    const action = failLater()
    data.overrides.assignCrew = action.override
    const name = "Asignar a Sebastián Castro como Primer Oficial"

    await user.click(within(row).getByRole("button", { name }))
    await waitFor(() => expect(panelButton(name)).toBeDisabled())
    await moveFocusAway()
    await action.fail()

    await waitFor(() =>
      expectSingle(alertsIn(activePanel()), SAVE_ERROR, "ficha")
    )
    await waitFor(() => expect(panelButton(name)).toHaveFocus())
    expect(row).toHaveTextContent("Sin asignar")
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("si falla «Confirmar tripulación», aparece la alerta «No se pudo guardar el cambio. Intenta de nuevo.», sin toast, y el foco vuelve a «Confirmar tripulación»", async () => {
    data.overrides.getDayFlights = withCompleteAv4021
    const { user } = await renderProgramacion()
    await openSunday(user)
    // Ancla: AV-4021 llega completo, así que se puede confirmar.
    await waitFor(() =>
      expect(tabFor("AV-4021")).toHaveTextContent("Lista para confirmar")
    )
    expect(panelButton("Confirmar tripulación")).toBeEnabled()
    const action = failLater()
    data.overrides.confirmFlightCrew = action.override

    await user.click(panelButton("Confirmar tripulación"))
    await waitFor(() =>
      expect(panelButton("Confirmar tripulación")).toBeDisabled()
    )
    await moveFocusAway()
    await action.fail()

    await waitFor(() =>
      expectSingle(alertsIn(activePanel()), SAVE_ERROR, "ficha")
    )
    await waitFor(() =>
      expect(panelButton("Confirmar tripulación")).toHaveFocus()
    )
    expect(tabFor("AV-4021")).toHaveTextContent("Lista para confirmar")
    expect(queryAllToasts()).toHaveLength(0)
  })
})
