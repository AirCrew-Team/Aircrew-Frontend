import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Utilidades de los tests de Programación (spec docs/specs/programacion-supervisor.md).
// No es un *.test: Vitest no lo recoge.

export type User = ReturnType<typeof userEvent.setup>

// Reloj: solo se simula Date (los setTimeout de la latencia de 400 ms son reales).
// 2026-11-17 12:00 local es martes: hoy + 5 es el domingo 22 nov.
export const fixClock = () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0))
}

export const restoreClock = () => {
  vi.useRealTimers()
}

export const normalize = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Los 7 botones del selector de día (precisiones: tablas propias, sin punto).
export const DAYS = [
  {
    weekday: "Hoy · mar",
    date: "17 nov",
    summary: "5 vuelos · listos",
    heading: "Vuelos del martes 17",
  },
  {
    weekday: "mié",
    date: "18 nov",
    summary: "6 vuelos · listos",
    heading: "Vuelos del miércoles 18",
  },
  {
    weekday: "jue",
    date: "19 nov",
    summary: "6 vuelos · listos",
    heading: "Vuelos del jueves 19",
  },
  {
    weekday: "vie",
    date: "20 nov",
    summary: "5 vuelos · 1 por completar",
    heading: "Vuelos del viernes 20",
  },
  {
    weekday: "sáb",
    date: "21 nov",
    summary: "6 vuelos · 2 por completar",
    heading: "Vuelos del sábado 21",
  },
  {
    weekday: "dom",
    date: "22 nov",
    summary: "6 vuelos · 3 por completar",
    heading: "Vuelos del domingo 22",
  },
  {
    weekday: "lun",
    date: "23 nov",
    summary: "4 vuelos · 4 por completar",
    heading: "Vuelos del lunes 23",
  },
] as const

export const SATURDAY = 4
export const SUNDAY = 5

// Hoy: 5 vuelos, todos confirmados.
export const TODAY_FLIGHTS = [
  "AV-8402",
  "AV-2280",
  "AV-4011",
  "AV-5520",
  "AV-6140",
]

// Hoy + 5 (domingo 22), por orden de salida. coverage null = confirmada (sin barra).
export const SUNDAY_FLIGHTS = [
  {
    flight: "AV-8410",
    label: "Confirmada",
    route: "BOG → MDE · 06:10 – 07:05",
    aircraft: "Airbus A320neo · HK-5301",
    coverage: null,
  },
  {
    flight: "AV-2290",
    label: "Confirmada",
    route: "BOG → CLO · 10:30 – 11:35",
    aircraft: "Airbus A320 · HK-5118",
    coverage: null,
  },
  {
    flight: "AV-4021",
    label: "Incompleta",
    route: "BOG → CTG · 14:20 – 15:45",
    aircraft: "Airbus A320neo · HK-5370",
    coverage: "3 de 6",
  },
  {
    flight: "AV-5530",
    label: "Confirmada",
    route: "BOG → BAQ · 16:50 – 18:20",
    aircraft: "Airbus A320neo · HK-5342",
    coverage: null,
  },
  {
    flight: "AV-6150",
    label: "Incompleta",
    route: "BOG → MDE · 19:45 – 20:40",
    aircraft: "Airbus A320 · HK-5112",
    coverage: "5 de 6",
  },
  {
    flight: "AV-9012",
    label: "Sin asignar",
    route: "BOG → MAD · 22:05 – 08:40 (+1)",
    aircraft: "Boeing 787-8 · HK-5280",
    coverage: "0 de 8",
  },
] as const

export const SUNDAY_NUMBERS = SUNDAY_FLIGHTS.map(({ flight }) => flight)

export const summaryFor = (family: string, hours: number) =>
  `Habilitado en ${family} · ${hours} h de 90 este mes · descanso cumplido`

// Sin anclas: se usa con toHaveTextContent sobre la fila (las horas no están fijadas).
export const ANY_A320_SUMMARY =
  /Habilitado en A320 · \d+ h de 90 este mes · descanso cumplido/

export const rationaleFor = (hours: number) =>
  `Cumple todas las reglas y es quien tiene más margen de horas este mes (${hours} h de 90).`

export const H1 = "Programación"

// Monta /supervisor/programacion con la sesión del supervisor y espera el h1.
export const renderProgramacion = async () => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
  const router = renderRoute(PATHS.superVisor.programacion)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return { user: userEvent.setup(), router, main: screen.getByRole("main") }
}

// --- Selector de día ---

export const dayGroup = () => screen.getByRole("group", { name: "Día" })

// Se consulta de nuevo en cada llamada: el grupo puede volver a montar sus botones cuando
// llegan los resúmenes, y una referencia tomada antes quedaría obsoleta.
export const dayButton = (index: number) =>
  within(dayGroup()).getAllByRole("button")[index]

export const findDayButtons = async () => {
  const group = await screen.findByRole("group", { name: "Día" })
  const buttons = within(group).getAllByRole("button")
  expect(buttons, "el grupo «Día» tiene 7 botones").toHaveLength(7)
  return buttons
}

// El h2 de la lista empieza por «Vuelos del {día} {d}» (puede llevar el número de vuelos).
export const findListHeading = (text: string) =>
  screen.findByRole("heading", {
    level: 2,
    name: (name) => normalize(name).startsWith(text),
  })

// La section de la lista de vuelos (bloque de status/alert de la lista).
export const findListSection = async (text: string) => {
  const heading = await findListHeading(text)
  const section = heading.closest("section")
  expect(section, "la lista de vuelos va en una section").not.toBeNull()
  return section as HTMLElement
}

// Elige un día y espera su h2 y su primer vuelo (si se pasa).
export const selectDay = async (
  user: User,
  index: number,
  firstFlight?: string
) => {
  await findDayButtons()
  await user.click(dayButton(index))
  await waitFor(() =>
    expect(dayButton(index)).toHaveAttribute("aria-pressed", "true")
  )
  await findListHeading(DAYS[index].heading)
  if (firstFlight) await findTabFor(firstFlight)
}

// Hoy + 5 con AV-4021 seleccionado por defecto (primer vuelo por completar).
export const openSunday = async (user: User) => {
  await findDayButtons()
  await waitFor(() =>
    expect(dayButton(SUNDAY)).toHaveTextContent(DAYS[SUNDAY].summary)
  )
  await selectDay(user, SUNDAY, "AV-4021")
  await findPanelHeading("AV-4021 · Bogotá (BOG) → Cartagena (CTG)")
}

// --- Lista de vuelos (pestañas verticales, patrón de Recomendaciones) ---

export const tabs = () =>
  within(screen.getByRole("tablist")).getAllByRole("tab")

const flightOf = (tab: HTMLElement) =>
  normalize(tab.textContent).match(/AV-\d+/)?.[0] ?? null

export const tabNumbers = () => tabs().map(flightOf)

// Las pestañas se localizan por su texto: el nombre accesible puede pegar los spans.
export const tabFor = (flight: string) => {
  const tab = tabs().find((candidate) => flightOf(candidate) === flight)
  expect(tab, `debe haber una pestaña de ${flight}`).toBeDefined()
  return tab as HTMLElement
}

export const findTabFor = (flight: string) => waitFor(() => tabFor(flight))

export const selectedFlight = () =>
  tabs()
    .filter((tab) => tab.getAttribute("aria-selected") === "true")
    .map(flightOf)

export const filterGroup = () =>
  screen.getByRole("group", { name: "Estado de los vuelos" })

export const filterButton = (name: string) =>
  within(filterGroup()).getByRole("button", { name })

export const LIMIT_BUTTON = /^(Ver \d+ más|Mostrar menos)$/

export const limitButton = (name: string) =>
  screen.getByRole("button", { name })

// --- Ficha del vuelo seleccionado ---

// El tabpanel visible (Base UI oculta o desmonta los demás).
export const activePanel = () => {
  const panels = screen.getAllByRole("tabpanel")
  expect(panels, "un único tabpanel visible").toHaveLength(1)
  return panels[0]
}

export const findPanelHeading = (title: string) =>
  waitFor(() =>
    within(activePanel()).getByRole("heading", { level: 2, name: title })
  )

export const panelButton = (name: string | RegExp) =>
  within(activePanel()).getByRole("button", { name })

export const queryPanelButtons = (name: RegExp) =>
  within(activePanel()).queryAllByRole("button", { name })

// Fila (li) del puesto, localizada por uno de sus botones («Asignar Capitán», «Cambiar TCP 1»…).
export const slotRow = (buttonName: string) => {
  const row = panelButton(buttonName).closest("li")
  expect(
    row,
    `el botón «${buttonName}» va dentro del li de su puesto`
  ).not.toBeNull()
  return row as HTMLElement
}

// Contenedor de una cabina: el ancestro más cercano del h3 que contiene los puestos (li).
export const cabinOf = (panel: HTMLElement, title: string) => {
  let node: HTMLElement | null = within(panel).getByRole("heading", {
    level: 3,
    name: title,
  })
  while (node && node !== panel && !node.querySelector("li"))
    node = node.parentElement
  expect(node, `la cabina «${title}» tiene sus puestos`).not.toBe(panel)
  return node as HTMLElement
}

// Abre los candidatos de un puesto («Asignar» o «Cambiar») y espera la lista.
export const openSlot = async (
  user: User,
  slot: string,
  verb: "Asignar" | "Cambiar" = "Asignar"
) => {
  const trigger = panelButton(`${verb} ${slot}`)
  const row = trigger.closest("li") as HTMLElement
  expect(row, `«${verb} ${slot}» va dentro del li de su puesto`).not.toBeNull()
  await user.click(trigger)
  const toggle = await waitFor(() =>
    within(row).getByRole("button", { name: `Ocultar candidatos de ${slot}` })
  )
  expect(toggle).toHaveAttribute("aria-expanded", "true")
  return { row, toggle }
}

// Región controlada por un botón abierto (aria-controls → id).
export const controlled = (button: HTMLElement) => {
  const id = button.getAttribute("aria-controls")
  expect(id, "el botón abierto tiene aria-controls").toBeTruthy()
  const region = document.getElementById(id as string)
  expect(region, `existe el elemento #${id}`).not.toBeNull()
  return region as HTMLElement
}

// Botones «Asignar a {nombre} como {puesto}» en orden; comprueba nombres y orden exactos.
export const expectEligible = (
  container: HTMLElement,
  slot: string,
  names: string[]
) => {
  const buttons = within(container).queryAllByRole("button", {
    name: /^Asignar a .+ como .+$/,
  })
  expect(
    buttons.length,
    `${slot}: ${names.length} botones «Asignar a … como ${slot}»`
  ).toBe(names.length)
  buttons.forEach((button, index) =>
    expect(button).toHaveAccessibleName(
      `Asignar a ${names[index]} como ${slot}`
    )
  )
  return buttons
}

// El li del candidato (con su resumen), a partir de su botón «Asignar a …».
export const candidateItem = (
  container: HTMLElement,
  name: string,
  slot: string
) => {
  const button = within(container).getByRole("button", {
    name: `Asignar a ${name} como ${slot}`,
  })
  const item = button.closest("li")
  expect(item, `${name} va en un li de la lista de candidatos`).not.toBeNull()
  return item as HTMLElement
}

// Despliega «No cumplen las reglas ({n})» dentro del puesto y devuelve la región abierta.
export const openIneligible = async (user: User, row: HTMLElement) => {
  const toggle = await within(row).findByRole("button", {
    name: /^No cumplen las reglas \(\d+\)$/,
  })
  expect(toggle).toHaveAttribute("aria-expanded", "false")
  expect(toggle).not.toHaveAttribute("aria-controls")
  await user.click(toggle)
  await waitFor(() => expect(toggle).toHaveAttribute("aria-expanded", "true"))
  return { toggle, region: controlled(toggle) }
}

// Par etiqueta → valor de la ficha: el valor es el hermano siguiente de la etiqueta (dt/dd o similar).
export const valueFor = (container: HTMLElement, term: string) => {
  const label = innermostWithText(container, term)
  return normalize(label.nextElementSibling?.textContent)
}

const fullTextMatches = (container: HTMLElement, text: string | RegExp) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => {
    const full = normalize(element.textContent)
    return typeof text === "string" ? full === text : text.test(full)
  })
  return matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
}

// El elemento más interno cuyo texto completo (normalizado) es `text` (o casa con la regex,
// que debe ir anclada). A diferencia de getByText, admite el texto repartido en spans.
export const innermostWithText = (
  container: HTMLElement,
  text: string | RegExp
) => {
  const innermost = fullTextMatches(container, text)
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

export const queryFullText = (container: HTMLElement, text: string | RegExp) =>
  fullTextMatches(container, text)

export const findFullText = (container: HTMLElement, text: string | RegExp) =>
  waitFor(() => innermostWithText(container, text))

export const ELIGIBLE_COUNT = /^(\d+ cumplen|1 cumple) las reglas$/

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])'

export const expectNoLiveRegion = (element: HTMLElement) => {
  expect(element.closest(LIVE_REGION), "sin región viva").toBeNull()
}

// role=status / role=alert dentro de un bloque.
export const statusesIn = (block: HTMLElement) =>
  within(block).queryAllByRole("status")

export const alertsIn = (block: HTMLElement) =>
  within(block).queryAllByRole("alert")

// Botones de acción de una ficha editable o de solo lectura.
export const ACTION_BUTTONS =
  /^(Asignar|Cambiar|Quitar|Ocultar candidatos|Sugerir|Confirmar tripulación)/
