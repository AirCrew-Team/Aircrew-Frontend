import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  activePanel,
  ACTION_BUTTONS,
  ANY_A320_SUMMARY,
  cabinOf,
  candidateItem,
  controlled,
  DAYS,
  dayButton,
  dayGroup,
  ELIGIBLE_COUNT,
  expectEligible,
  expectNoLiveRegion,
  filterButton,
  findDayButtons,
  findFullText,
  findListHeading,
  findPanelHeading,
  findTabFor,
  fixClock,
  innermostWithText,
  LIMIT_BUTTON,
  limitButton,
  normalize,
  openIneligible,
  openSlot,
  openSunday,
  panelButton,
  queryPanelButtons,
  renderProgramacion,
  restoreClock,
  SATURDAY,
  selectDay,
  selectedFlight,
  slotRow,
  summaryFor,
  SUNDAY,
  SUNDAY_FLIGHTS,
  SUNDAY_NUMBERS,
  tabFor,
  tabNumbers,
  tabs,
  TODAY_FLIGHTS,
  valueFor,
  type User,
} from "./programacionTestUtils"

// Programación del supervisor (spec docs/specs/programacion-supervisor.md): selector de día,
// lista, ficha y candidatos con los datos simulados reales (PG-02…PG-05, PG-10 estático,
// PG-11 y PG-12). Este archivo NO muta: el estado en memoria de los datos se comparte entre
// los tests del archivo y no tiene reinicio. La cadena de acciones está en
// ProgramacionPage.actions.test.tsx.

// Varias cargas seguidas de 400 ms por test (días, vuelos y candidatos).
vi.setConfig({ testTimeout: 15_000 })

beforeEach(fixClock)
afterEach(restoreClock)

// Muestra el sexto vuelo del domingo («Ver 1 más») y selecciona AV-9012.
const openAV9012 = async (user: User) => {
  await openSunday(user)
  await user.click(limitButton("Ver 1 más"))
  await user.click(await findTabFor("AV-9012"))
  await findPanelHeading("AV-9012 · Bogotá (BOG) → Madrid (MAD)")
}

describe("Programación: selector de día (PG-02)", () => {
  it("PG-02 el grupo «Día» tiene 7 botones de hoy a hoy + 6, cada uno con su día, su fecha y su resumen", async () => {
    await renderProgramacion()

    await findDayButtons()
    await waitFor(() => expect(dayButton(0)).toHaveTextContent(DAYS[0].summary))
    DAYS.forEach(({ weekday, date, summary }, index) => {
      const button = dayButton(index)
      expect(button, `día ${index}: ${weekday}`).toHaveTextContent(weekday)
      expect(button, `día ${index}: ${date}`).toHaveTextContent(date)
      expect(button, `día ${index}: ${summary}`).toHaveTextContent(summary)
    })
  })

  it("PG-02 solo el primero dice «Hoy» y está pulsado por defecto", async () => {
    await renderProgramacion()

    await findDayButtons()
    await waitFor(() => expect(dayButton(0)).toHaveTextContent(DAYS[0].summary))
    const buttons = within(dayGroup()).getAllByRole("button")
    expect(buttons[0]).toHaveTextContent("Hoy · mar")
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true")
    buttons.slice(1).forEach((button, index) => {
      expect(button, `día ${index + 1}`).toHaveAttribute(
        "aria-pressed",
        "false"
      )
      expect(button, `día ${index + 1}`).not.toHaveTextContent("Hoy")
    })
  })

  it("PG-02 por defecto la lista es la de hoy: h2 «Vuelos del martes 17» y sus 5 vuelos", async () => {
    await renderProgramacion()

    expect(await findListHeading(DAYS[0].heading)).toBeInTheDocument()
    await findTabFor(TODAY_FLIGHTS[0])
    expect(tabNumbers()).toEqual(TODAY_FLIGHTS)
  })

  it("PG-02 al elegir el domingo cambian el botón pulsado, el h2 y la lista", async () => {
    const { user } = await renderProgramacion()
    await findTabFor(TODAY_FLIGHTS[0])

    await selectDay(user, SUNDAY, "AV-8410")

    const buttons = within(dayGroup()).getAllByRole("button")
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false")
    expect(buttons[SUNDAY]).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: (name) => normalize(name).startsWith(DAYS[0].heading),
      })
    ).not.toBeInTheDocument()
    await waitFor(() =>
      expect(tabNumbers()).toEqual(SUNDAY_NUMBERS.slice(0, 5))
    )
  })

  it("PG-02 (precisión) cambiar de día reinicia el filtro, el corte y la selección", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    // Se cambia todo en el domingo: corte abierto, otro vuelo y otro filtro.
    await user.click(limitButton("Ver 1 más"))
    await user.click(await findTabFor("AV-9012"))
    await waitFor(() => expect(selectedFlight()).toEqual(["AV-9012"]))
    await user.click(filterButton("Confirmados (3)"))
    await waitFor(() =>
      expect(filterButton("Confirmados (3)")).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    )

    await selectDay(user, SATURDAY)
    await selectDay(user, SUNDAY, "AV-4021")

    await waitFor(() =>
      expect(filterButton("Todos (6)")).toHaveAttribute("aria-pressed", "true")
    )
    expect(filterButton("Confirmados (3)")).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(tabNumbers()).toEqual(SUNDAY_NUMBERS.slice(0, 5))
    expect(limitButton("Ver 1 más")).toBeInTheDocument()
    expect(selectedFlight()).toEqual(["AV-4021"])
  })
})

describe("Programación: lista del domingo 22 (PG-03)", () => {
  it("PG-03 el h2 es «Vuelos del domingo 22» y la lista es un tablist vertical", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    expect(await findListHeading(DAYS[SUNDAY].heading)).toBeInTheDocument()
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    )
  })

  it("PG-03 se ven los 5 primeros vuelos en orden de salida, «Ver 1 más» fuera del tablist y «Mostrando 5 de 6» sin región viva", async () => {
    const { user, main } = await renderProgramacion()
    await openSunday(user)

    expect(tabNumbers()).toEqual(SUNDAY_NUMBERS.slice(0, 5))
    const more = limitButton("Ver 1 más")
    expect(screen.getByRole("tablist")).not.toContainElement(more)
    expectNoLiveRegion(innermostWithText(main, "Mostrando 5 de 6"))
  })

  it("PG-03 «Ver 1 más» muestra los 6 y pasa a «Mostrar menos» con el foco; «Mostrar menos» vuelve a 5", async () => {
    const { user, main } = await renderProgramacion()
    await openSunday(user)

    await user.click(limitButton("Ver 1 más"))
    await waitFor(() => expect(tabNumbers()).toEqual(SUNDAY_NUMBERS))
    expect(limitButton("Mostrar menos"), "foco tras «Ver 1 más»").toHaveFocus()
    innermostWithText(main, "Mostrando 6 de 6")

    await user.click(limitButton("Mostrar menos"))
    await waitFor(() =>
      expect(tabNumbers()).toEqual(SUNDAY_NUMBERS.slice(0, 5))
    )
    expect(limitButton("Ver 1 más"), "foco tras «Mostrar menos»").toHaveFocus()
  })

  // Precisión «Selección, filtros y corte»: nunca hay ficha sin su pestaña. Si el corte deja
  // fuera al seleccionado, se selecciona el primero visible (AV-8410, confirmado), no el primero
  // por completar (AV-4021) ni se queda AV-9012 sin pestaña.
  it("PG-03 (precisión) con AV-9012 seleccionado, «Mostrar menos» deja los 5 primeros, selecciona el primero visible con un solo tabpanel y el foco sigue en el botón del corte", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)
    await user.click(limitButton("Ver 1 más"))
    await user.click(await findTabFor("AV-9012"))
    await waitFor(() => expect(selectedFlight()).toEqual(["AV-9012"]))
    await findPanelHeading("AV-9012 · Bogotá (BOG) → Madrid (MAD)")

    await user.click(limitButton("Mostrar menos"))

    await waitFor(() =>
      expect(tabNumbers()).toEqual(SUNDAY_NUMBERS.slice(0, 5))
    )
    await waitFor(() => expect(selectedFlight()).toEqual(["AV-8410"]))
    expect(selectedFlight(), "el seleccionado es el primero visible").toEqual([
      tabNumbers()[0],
    ])
    const panel = activePanel()
    expect(
      within(panel).getByRole("heading", {
        level: 2,
        name: "AV-8410 · Bogotá (BOG) → Medellín (MDE)",
      })
    ).toBeInTheDocument()
    const selectedTab = tabFor("AV-8410")
    expect(selectedTab, "la pestaña controla la ficha").toHaveAttribute(
      "aria-controls",
      panel.id
    )
    expect(panel, "la ficha la nombra su pestaña").toHaveAttribute(
      "aria-labelledby",
      selectedTab.id
    )
    expect(
      limitButton("Ver 1 más"),
      "foco en el botón del corte tras «Mostrar menos»"
    ).toHaveFocus()
  })

  it.each(SUNDAY_FLIGHTS)(
    "PG-03 la pestaña de $flight muestra «$label», la ruta y horas, el avión y su cobertura",
    async ({ flight, label, route, aircraft, coverage }) => {
      const { user } = await renderProgramacion()
      await openSunday(user)
      await user.click(limitButton("Ver 1 más"))

      const tab = await findTabFor(flight)
      expect(tab).toHaveTextContent(route)
      expect(tab).toHaveTextContent(aircraft)
      if (label === "Sin asignar") {
        expect(within(tab).getByText("Sin asignar")).toBeInTheDocument()
      } else {
        expect(tab).toHaveTextContent(label)
      }
      if (coverage) {
        expect(tab).toHaveTextContent(coverage)
      } else {
        expect(
          tab,
          "una confirmada no lleva barra «a de t»"
        ).not.toHaveTextContent(/\d+ de \d+/)
      }
    }
  )

  it("PG-03 los filtros «Estado de los vuelos» cuentan 6/3/3 y «Todos» está pulsado", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    expect(filterButton("Todos (6)")).toHaveAttribute("aria-pressed", "true")
    expect(filterButton("Por completar (3)")).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(filterButton("Confirmados (3)")).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("PG-03 «Por completar (3)» deja AV-4021, AV-6150 y AV-9012, sin «Ver más» ni «Mostrando»", async () => {
    const { user, main } = await renderProgramacion()
    await openSunday(user)

    await user.click(filterButton("Por completar (3)"))

    await waitFor(() =>
      expect(tabNumbers()).toEqual(["AV-4021", "AV-6150", "AV-9012"])
    )
    expect(filterButton("Por completar (3)")).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(filterButton("Todos (6)")).toHaveAttribute("aria-pressed", "false")
    expect(screen.queryByRole("button", { name: LIMIT_BUTTON })).toBeNull()
    expect(main).not.toHaveTextContent("Mostrando")
    expect(selectedFlight()).toEqual(["AV-4021"])
  })

  it("PG-03 «Confirmados (3)» deja AV-8410, AV-2290 y AV-5530 y, como saca a AV-4021, selecciona el primero visible", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    await user.click(filterButton("Confirmados (3)"))

    await waitFor(() =>
      expect(tabNumbers()).toEqual(["AV-8410", "AV-2290", "AV-5530"])
    )
    await waitFor(() => expect(selectedFlight()).toEqual(["AV-8410"]))
    expect(
      await findPanelHeading("AV-8410 · Bogotá (BOG) → Medellín (MDE)")
    ).toBeInTheDocument()
  })
})

describe("Programación: ficha de AV-4021 (PG-04)", () => {
  it("PG-04 por defecto se selecciona el primer vuelo por completar (AV-4021)", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    expect(selectedFlight()).toEqual(["AV-4021"])
    for (const flight of SUNDAY_NUMBERS.slice(0, 5).filter(
      (number) => number !== "AV-4021"
    )) {
      expect(tabFor(flight)).toHaveAttribute("aria-selected", "false")
    }
  })

  it("PG-04 (precisión) hoy, sin vuelos por completar, se selecciona el primero (AV-8402)", async () => {
    await renderProgramacion()

    await findTabFor("AV-8402")
    await waitFor(() => expect(selectedFlight()).toEqual(["AV-8402"]))
    expect(
      await findPanelHeading("AV-8402 · Bogotá (BOG) → Medellín (MDE)")
    ).toBeInTheDocument()
  })

  it("PG-04 el encabezado tiene el antetítulo, el h2, las horas con la duración y «3 de 6 puestos»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const panel = activePanel()
    expect(panel).toHaveTextContent("Domingo 22 nov · Horas en UTC")
    expect(
      within(panel).getByRole("heading", {
        level: 2,
        name: "AV-4021 · Bogotá (BOG) → Cartagena (CTG)",
      })
    ).toBeInTheDocument()
    expect(panel).toHaveTextContent(
      "Sale 14:20 · Llega 15:45 · 1 h 25 min · Nacional"
    )
    expect(panel).toHaveTextContent("3 de 6 puestos")
  })

  it("PG-04 los datos dicen Aeronave, Capacidad y Tripulación mínima", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const panel = activePanel()
    expect(valueFor(panel, "Aeronave")).toBe("Airbus A320neo · HK-5370")
    expect(valueFor(panel, "Capacidad")).toBe("186 sillas")
    expect(valueFor(panel, "Tripulación mínima")).toBe("2 pilotos + 4 TCP")
  })

  it("PG-04 la tarjeta de la IA tiene su título, su texto y «Sugerir para 3 puestos»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const panel = activePanel()
    expect(within(panel).getByText("Sugerir tripulación")).toBeInTheDocument()
    expect(
      within(panel).getByText(
        "La IA propone a alguien para cada puesto vacío entre quienes cumplen las reglas, y explica por qué. Tú decides."
      )
    ).toBeInTheDocument()
    expect(
      within(panel).getByRole("button", { name: "Sugerir para 3 puestos" })
    ).toBeEnabled()
  })

  it("PG-04 «Cabina de mando» tiene Capitán y Primer Oficial vacíos, en ese orden", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const cockpit = cabinOf(activePanel(), "Cabina de mando")
    const rows = Array.from(cockpit.querySelectorAll("li"))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent("Capitán")
    expect(rows[1]).toHaveTextContent("Primer Oficial")
    for (const [index, slot] of ["Capitán", "Primer Oficial"].entries()) {
      expect(within(rows[index]).getByText("Sin asignar")).toBeInTheDocument()
      const button = within(rows[index]).getByRole("button", {
        name: `Asignar ${slot}`,
      })
      expect(button).toHaveAttribute("aria-expanded", "false")
      expect(button).not.toHaveAttribute("aria-controls")
    }
  })

  it("PG-04 «Cabina de pasajeros» tiene Jefe de Cabina Lucía Mora, TCP 1 Paula Cárdenas, TCP 2 Natalia Reyes y TCP 3 vacío", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const cabin = cabinOf(activePanel(), "Cabina de pasajeros")
    const rows = Array.from(cabin.querySelectorAll("li"))
    expect(rows).toHaveLength(4)
    const covered = [
      { slot: "Jefe de Cabina", name: "Lucía Mora", initials: "LM" },
      { slot: "TCP 1", name: "Paula Cárdenas", initials: "PC" },
      { slot: "TCP 2", name: "Natalia Reyes", initials: "NR" },
    ]
    covered.forEach(({ slot, name, initials }, index) => {
      const row = rows[index]
      expect(row).toHaveTextContent(slot)
      expect(within(row).getByText(name)).toBeInTheDocument()
      expect(within(row).getByText(initials)).toBeInTheDocument()
      expect(row).toHaveTextContent(ANY_A320_SUMMARY)
      expect(
        within(row).getByRole("button", { name: `Cambiar ${slot}` })
      ).toBeInTheDocument()
      expect(
        within(row).getByRole("button", { name: `Quitar ${slot}` })
      ).toBeInTheDocument()
      expect(within(row).queryByText("Sin asignar")).toBeNull()
    })
    expect(rows[3]).toHaveTextContent("TCP 3")
    expect(within(rows[3]).getByText("Sin asignar")).toBeInTheDocument()
    expect(
      within(rows[3]).getByRole("button", { name: "Asignar TCP 3" })
    ).toBeInTheDocument()
  })

  it("PG-04 la barra dice «Faltan 3 puestos…» y «Confirmar tripulación» está deshabilitado", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const panel = activePanel()
    innermostWithText(
      panel,
      "Faltan 3 puestos. Completa la tripulación para confirmarla y avisar a cada tripulante."
    )
    expect(
      within(panel).getByRole("button", { name: "Confirmar tripulación" })
    ).toBeDisabled()
  })
})

// Candidatos fijados en las precisiones para AV-4021 (horas del mes antes del vuelo).
const AV4021_CANDIDATES = [
  {
    slot: "Capitán",
    eligible: [
      { name: "Andrés Valencia", hours: 62 },
      { name: "Ricardo Salazar", hours: 70 },
    ],
    ineligible: ["Jorge Medina — Sin habilitación en A320"],
  },
  {
    slot: "Primer Oficial",
    eligible: [
      { name: "Sebastián Castro", hours: 48 },
      { name: "Mateo Morales", hours: 71 },
      { name: "Valentina Ortiz", hours: 80 },
    ],
    ineligible: [
      "Simón Echeverri — Descanso mínimo hasta 15:10",
      "Diego Pardo — Certificado médico vencido",
      "Tomás Rincón — Ausente ese día",
    ],
  },
  {
    slot: "TCP 3",
    eligible: [
      { name: "Daniela Torres", hours: 40 },
      { name: "Camilo Herrera", hours: 55 },
    ],
    ineligible: ["Laura Gómez — De vacaciones"],
  },
]

describe("Programación: candidatos (PG-05)", () => {
  it("PG-05 «Asignar Primer Oficial» pasa a «Ocultar candidatos de Primer Oficial» con aria-expanded y aria-controls", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const { toggle } = await openSlot(user, "Primer Oficial")

    expect(
      queryPanelButtons(/^Asignar Primer Oficial$/),
      "el botón cambia de nombre al abrirse"
    ).toHaveLength(0)
    expect(controlled(toggle)).toBeInTheDocument()
  })

  it.each(AV4021_CANDIDATES)(
    "PG-05 $slot: «{n} cumplen las reglas» y los elegibles en orden (más margen primero), cada uno con su resumen",
    async ({ slot, eligible }) => {
      const { user } = await renderProgramacion()
      await openSunday(user)

      const { row } = await openSlot(user, slot)

      expect(
        await findFullText(row, `${eligible.length} cumplen las reglas`)
      ).toBeInTheDocument()
      expectEligible(
        row,
        slot,
        eligible.map(({ name }) => name)
      )
      for (const { name, hours } of eligible) {
        const item = candidateItem(row, name, slot)
        expect(item).toHaveTextContent(name)
        expect(item).toHaveTextContent(summaryFor("A320", hours))
      }
    }
  )

  it("PG-05 Primer Oficial: «No cumplen las reglas (n)» despliega los motivos exactos", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const { row } = await openSlot(user, "Primer Oficial")
    await findFullText(row, "3 cumplen las reglas")
    // Cerrado: los motivos no se ven (ausentes o dentro de un [hidden]).
    for (const reason of AV4021_CANDIDATES[1].ineligible) {
      const [, text] = reason.split(" — ")
      const matches = Array.from(row.querySelectorAll<HTMLElement>("*")).filter(
        (element) => normalize(element.textContent).includes(text)
      )
      const shown = matches
        .filter(
          (element) =>
            !matches.some(
              (other) => other !== element && element.contains(other)
            )
        )
        .filter((element) => !element.closest("[hidden]"))
      expect(shown, `«${text}» no se ve con la lista cerrada`).toHaveLength(0)
    }

    // El número exacto depende del pool: la spec fija a 3 de ellos, no el total.
    const toggle = within(row).getByRole("button", {
      name: /^No cumplen las reglas \(\d+\)$/,
    })
    const { region } = await openIneligible(user, row)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    for (const reason of AV4021_CANDIDATES[1].ineligible) {
      expect(region).toHaveTextContent(reason)
    }
  })

  it.each([AV4021_CANDIDATES[0], AV4021_CANDIDATES[2]])(
    "PG-05 $slot: los que no cumplen incluyen $ineligible",
    async ({ slot, ineligible }) => {
      const { user } = await renderProgramacion()
      await openSunday(user)

      const { row } = await openSlot(user, slot)
      const { region } = await openIneligible(user, row)

      for (const reason of ineligible) expect(region).toHaveTextContent(reason)
    }
  )

  it("PG-05 «Ocultar candidatos de Primer Oficial» cierra la lista y vuelve a «Asignar Primer Oficial» sin aria-controls", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const { toggle } = await openSlot(user, "Primer Oficial")
    await user.click(toggle)

    const button = await waitFor(() => panelButton("Asignar Primer Oficial"))
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).not.toHaveAttribute("aria-controls")
    expect(
      within(slotRow("Asignar Primer Oficial")).queryAllByRole("button", {
        name: /^Asignar a /,
      })
    ).toHaveLength(0)
  })

  it("PG-05 (precisión) abrir otro puesto cierra el anterior: solo un puesto abierto a la vez", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const first = await openSlot(user, "Primer Oficial")
    await findFullText(first.row, "3 cumplen las reglas")
    await openSlot(user, "Capitán")

    await waitFor(() =>
      expect(panelButton("Asignar Primer Oficial")).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    )
    expect(
      queryPanelButtons(/^Ocultar candidatos de /),
      "un solo puesto abierto"
    ).toHaveLength(1)
  })

  it("PG-05 «Cambiar Jefe de Cabina» abre los candidatos igual que «Asignar»", async () => {
    const { user } = await renderProgramacion()
    await openSunday(user)

    const { row } = await openSlot(user, "Jefe de Cabina", "Cambiar")

    expect(await findFullText(row, ELIGIBLE_COUNT)).toBeInTheDocument()
  })
})

describe("Programación: cruces y exclusión en el mismo vuelo (PG-10)", () => {
  it("PG-10 en AV-9012, Juliana Pérez (asignada a AV-6150) no cumple en TCP 1 por «Ya asignado a AV-6150, que se cruza en horario»", async () => {
    const { user } = await renderProgramacion()
    await openAV9012(user)

    const { row } = await openSlot(user, "TCP 1")
    await findFullText(row, ELIGIBLE_COUNT)
    expect(
      within(row).queryByRole("button", {
        name: "Asignar a Juliana Pérez como TCP 1",
      })
    ).toBeNull()
    const { region } = await openIneligible(user, row)
    expect(region).toHaveTextContent(
      "Juliana Pérez — Ya asignado a AV-6150, que se cruza en horario"
    )
  })

  it.each([
    { slot: "TCP 3", verb: "Asignar" as const },
    { slot: "TCP 1", verb: "Cambiar" as const },
  ])(
    "PG-10 en AV-4021, «$verb $slot» no lista a quien ya ocupa un puesto del vuelo (Lucía Mora, Paula Cárdenas, Natalia Reyes)",
    async ({ slot, verb }) => {
      const { user } = await renderProgramacion()
      await openSunday(user)

      const { row } = await openSlot(user, slot, verb)
      await findFullText(row, ELIGIBLE_COUNT)
      const { region } = await openIneligible(user, row)

      // Ancla: las dos listas están desplegadas.
      expect(region).toHaveTextContent(" — ")
      for (const name of ["Lucía Mora", "Paula Cárdenas", "Natalia Reyes"]) {
        expect(
          within(row).queryAllByRole("button", { name: new RegExp(name) }),
          `${name} no es candidata`
        ).toHaveLength(0)
        expect(
          region,
          `${name} no sale entre quienes no cumplen`
        ).not.toHaveTextContent(name)
      }
    }
  )
})

describe("Programación: AV-9012, internacional de más de 8 h (PG-11)", () => {
  it("PG-11 la ficha dice «Llega 08:40 (+1)», «10 h 35 min», «Internacional» y «0 de 8 puestos»", async () => {
    const { user } = await renderProgramacion()
    await openAV9012(user)

    const panel = activePanel()
    expect(panel).toHaveTextContent("Domingo 22 nov · Horas en UTC")
    expect(panel).toHaveTextContent(
      "Sale 22:05 · Llega 08:40 (+1) · 10 h 35 min · Internacional"
    )
    expect(panel).toHaveTextContent("0 de 8 puestos")
    expect(valueFor(panel, "Aeronave")).toBe("Boeing 787-8 · HK-5280")
    expect(valueFor(panel, "Capacidad")).toBe("250 sillas")
    expect(valueFor(panel, "Tripulación mínima")).toBe("3 pilotos + 5 TCP")
    expect(
      within(panel).getByRole("button", { name: "Sugerir para 8 puestos" })
    ).toBeInTheDocument()
    expect(panel).toHaveTextContent("Faltan 8 puestos.")
  })

  it("PG-11 tiene Capitán, Primer Oficial y Piloto de relevo en cabina de mando, y Jefe de Cabina y TCP 1 a TCP 4 en pasajeros", async () => {
    const { user } = await renderProgramacion()
    await openAV9012(user)

    const panel = activePanel()
    const expected = {
      "Cabina de mando": ["Capitán", "Primer Oficial", "Piloto de relevo"],
      "Cabina de pasajeros": [
        "Jefe de Cabina",
        "TCP 1",
        "TCP 2",
        "TCP 3",
        "TCP 4",
      ],
    }
    for (const [cabinTitle, slots] of Object.entries(expected)) {
      const cabin = cabinOf(panel, cabinTitle)
      const buttons = within(cabin).getAllByRole("button", {
        name: /^Asignar /,
      })
      expect(buttons, cabinTitle).toHaveLength(slots.length)
      buttons.forEach((button, index) =>
        expect(button).toHaveAccessibleName(`Asignar ${slots[index]}`)
      )
    }
  })

  it("PG-11 en el Primer Oficial, Valentina Ortiz no cumple por «Sin inglés OACI nivel 4 (vuelo internacional)» y los elegibles están habilitados en 787", async () => {
    const { user } = await renderProgramacion()
    await openAV9012(user)

    const { row } = await openSlot(user, "Primer Oficial")
    await findFullText(row, ELIGIBLE_COUNT)
    const eligible = within(row).getAllByRole("button", {
      name: /^Asignar a .+ como Primer Oficial$/,
    })
    for (const button of eligible) {
      expect(button.closest("li")).toHaveTextContent(
        /Habilitado en 787 · \d+ h de 90 este mes · descanso cumplido/
      )
    }
    const { region } = await openIneligible(user, row)
    expect(region).toHaveTextContent(
      "Valentina Ortiz — Sin inglés OACI nivel 4 (vuelo internacional)"
    )
  })

  it("PG-11 en la lista, AV-9012 lleva la etiqueta «Sin asignar»", async () => {
    const { user } = await renderProgramacion()
    await openAV9012(user)

    expect(
      within(tabFor("AV-9012")).getByText("Sin asignar")
    ).toBeInTheDocument()
    expect(tabs()).toHaveLength(6)
  })
})

describe("Programación: tripulación confirmada, solo lectura (PG-12)", () => {
  it.each([
    {
      flight: "AV-8410",
      title: "AV-8410 · Bogotá (BOG) → Medellín (MDE)",
      day: SUNDAY,
    },
    {
      flight: "AV-8402",
      title: "AV-8402 · Bogotá (BOG) → Medellín (MDE)",
      day: 0,
    },
  ])(
    "PG-12 la ficha de $flight no tiene Asignar, Cambiar, Quitar, tarjeta de IA ni «Confirmar tripulación»",
    async ({ flight, title, day }) => {
      const { user } = await renderProgramacion()
      if (day === SUNDAY) {
        await openSunday(user)
        await user.click(tabFor(flight))
      } else {
        await findTabFor(flight)
      }
      await findPanelHeading(title)

      const panel = activePanel()
      // Ancla positiva: la ficha está montada con sus 6 puestos cubiertos.
      expect(
        within(panel).getByRole("heading", {
          level: 3,
          name: "Cabina de mando",
        })
      ).toBeInTheDocument()
      expect(
        within(panel).getByRole("heading", {
          level: 3,
          name: "Cabina de pasajeros",
        })
      ).toBeInTheDocument()
      // AV-8410 tiene 6 puestos (tabla de la spec); el avión de AV-8402 no está fijado.
      if (flight === "AV-8410") {
        expect(panel.querySelectorAll("li")).toHaveLength(6)
      } else {
        expect(panel.querySelectorAll("li").length).toBeGreaterThanOrEqual(6)
      }
      expect(within(panel).queryByText("Sin asignar")).toBeNull()

      expect(queryPanelButtons(ACTION_BUTTONS)).toHaveLength(0)
      expect(within(panel).queryByText("Sugerir tripulación")).toBeNull()
      expect(panel).not.toHaveTextContent(/Faltan \d+ puestos?\./)
      expect(panel).not.toHaveTextContent("Tripulación completa.")
      expect(tabFor(flight)).toHaveTextContent("Confirmada")
    }
  )
})
