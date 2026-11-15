import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Tripulación del Supervisor (spec docs/specs/tripulacion-supervisor.md), con los datos
// simulados reales: cabecera (TC-01), panorama (TC-05, TC-06), filtros (TC-07, TC-10, TC-11),
// lista y límite (TC-08, TC-09), tarjetas (TC-12 a TC-14), detalle (TC-15 a TC-17) y
// buscador (TC-18, TC-19). Carga, error, vacío, filtro vacío y protección van en
// TripulacionPage.dataStates.test.tsx; los datos (TC-20), en shiftCrew.data.test.ts.

type User = ReturnType<typeof userEvent.setup>

const H1 = "Tripulación"
const EYEBROW = "Tripulación del turno · Hoy · Horas en UTC"
const DESCRIPTION = "Quién de tu base está disponible durante el turno."
const LIST = "Tripulantes del turno"
const SEARCH = "Buscar tripulante o vuelo"
const FILTER_GROUP = "Filtrar por estado"
const EMPTY_FILTER = "No hay tripulantes en este estado."
const AVAILABLE = "Disponible para reemplazos"
const noMatch = (query: string) => `Ningún tripulante coincide con «${query}».`

const ALL = "Todos (37)"
const GUARD_FILTER = "De guardia (12)"
const IN_FLIGHT_FILTER = "En vuelo (10)"
const SCHEDULED_FILTER = "Programados (8)"
const RESTING_FILTER = "En descanso (4)"
const ABSENT_FILTER = "Ausentes (3)"
const FILTERS = [
  ALL,
  GUARD_FILTER,
  IN_FLIGHT_FILTER,
  SCHEDULED_FILTER,
  RESTING_FILTER,
  ABSENT_FILTER,
]

// Tabla «Datos simulados» de la spec, en su orden.
const GUARD = [
  "Camila Herrera",
  "Juan Pablo Navarro",
  "Felipe Vargas",
  "Diego Ruiz",
  "Sebastián Castro",
  "Laura Gómez",
  "Valentina Ortiz",
  "Mateo Morales",
  "Carlos Mejía",
  "Ricardo Peña",
  "Andrés Restrepo",
  "Simón Echeverri",
]
const IN_FLIGHT = [
  "Alejandro Rojas",
  "Daniel Ospina",
  "Mariana Castaño",
  "Juliana Patiño",
  "Luis Fernando Arango",
  "Isabel Quintana",
  "Héctor Bermúdez",
  "Paola Jiménez",
  "Gabriela Torres",
  "Esteban Molina",
]
const SCHEDULED = [
  "Roberto Méndez",
  "Sofía Navas",
  "Catalina Duarte",
  "Manuel Ochoa",
  "Fernando Lozano",
  "Andrea Villamil",
  "Ximena Prieto",
  "Julián Cortés",
]
const RESTING = [
  "Óscar Pineda",
  "Lina Marcela Gil",
  "Santiago Beltrán",
  "Carolina Acosta",
]
const ABSENT = ["Tomás Rincón", "Felipe Ardila", "Natalia Ríos"]
const ALL_NAMES = [...GUARD, ...IN_FLIGHT, ...SCHEDULED, ...RESTING, ...ABSENT]
const FIRST_12 = ALL_NAMES.slice(0, 12)

const LIMIT_BUTTON = /^(Ver \d+ más|Mostrar menos)$/

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Texto que recibe el lector: omite aria-hidden y hidden, incluye sr-only y separa
// elementos con espacio (mismo recorrido que AusenciasPage.test).
const readableText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ""
  if (!(node instanceof Element)) return ""
  if (
    node.getAttribute("aria-hidden") === "true" ||
    node.hasAttribute("hidden")
  )
    return ""
  return ` ${Array.from(node.childNodes).map(readableText).join("")} `
}

const spokenText = (element: HTMLElement) => normalize(readableText(element))

const innermostWith = (
  container: HTMLElement,
  read: (element: HTMLElement) => string,
  text: string
) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => read(element) === text)
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

// El elemento más interno cuyo texto completo (normalizado) es `text`.
const getByFullText = (container: HTMLElement, text: string) =>
  innermostWith(container, (element) => normalize(element.textContent), text)

// El elemento más interno cuyo texto accesible (lo que oye el lector) es `text`.
const getBySpokenText = (container: HTMLElement, text: string) =>
  innermostWith(container, spokenText, text)

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])'

const expectNoLiveRegion = (element: HTMLElement) => {
  expect(element).not.toHaveAttribute("role")
  expect(element.closest(LIVE_REGION), "sin región viva").toBeNull()
}

const crewList = (main: HTMLElement) =>
  within(main).getByRole("list", { name: LIST })

// Nombres de las tarjetas visibles, en orden, contadas dentro de la lista con nombre.
const cardNames = (main: HTMLElement) => {
  const list = within(main).queryByRole("list", { name: LIST })
  if (!list) return []
  return within(list)
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 3 }).textContent)
    )
}

// Las tarjetas visibles son exactamente `names`, en orden, y no hay tarjetas fuera de la lista.
const expectCards = (main: HTMLElement, names: string[]) => {
  expect(cardNames(main)).toEqual(names)
  expect(within(main).queryAllByRole("article")).toHaveLength(names.length)
}

const card = (main: HTMLElement, name: string) =>
  within(crewList(main)).getByRole("article", { name })

const filterGroup = (main: HTMLElement) =>
  within(main).getByRole("group", { name: FILTER_GROUP })

const filterButton = (main: HTMLElement, name: string) =>
  within(filterGroup(main)).getByRole("button", { name })

const filterNames = (main: HTMLElement) =>
  within(filterGroup(main))
    .getAllByRole("button")
    .map((button) => normalize(button.textContent))

const chooseFilter = async (user: User, main: HTMLElement, name: string) => {
  await user.click(filterButton(main, name))
  await waitFor(() =>
    expect(filterButton(main, name)).toHaveAttribute("aria-pressed", "true")
  )
}

const searchBox = (main: HTMLElement) =>
  within(main).getByRole("searchbox", { name: SEARCH })

const search = async (user: User, main: HTMLElement, query: string) => {
  const box = searchBox(main)
  await user.clear(box)
  await user.type(box, query)
}

// El status de resultados es el único role=status del tablero ya cargado.
const resultsStatus = (main: HTMLElement) => {
  const statuses = within(main).queryAllByRole("status")
  expect(statuses, "un único status de resultados").toHaveLength(1)
  return statuses[0]
}

const expectResults = (main: HTMLElement, text: string) =>
  waitFor(() => expect(normalize(resultsStatus(main).textContent)).toBe(text))

const limitButton = (main: HTMLElement, name: string) =>
  within(main).getByRole("button", { name })

const expectNoLimit = (main: HTMLElement) => {
  expect(
    within(main).queryByRole("button", { name: LIMIT_BUTTON }),
    "sin botón de límite"
  ).toBeNull()
  expect(main).not.toHaveTextContent("Mostrando")
}

const detailButton = (article: HTMLElement, name: string) =>
  within(article).getByRole("button", { name: `Ver detalle de ${name}` })

// Filas del dl: cada dt seguido de su dd, en orden (admite dl > div > dt + dd).
const dlRows = (dl: HTMLElement) =>
  Array.from(dl.querySelectorAll("dt")).map((term) => {
    const definition = term.nextElementSibling
    expect(definition?.tagName, `dd tras «${term.textContent}»`).toBe("DD")
    return [
      normalize(term.textContent),
      normalize(definition?.textContent ?? ""),
    ]
  })

const controlledDl = (button: HTMLElement) => {
  const id = button.getAttribute("aria-controls")
  expect(id, "aria-controls con el id del detalle").toBeTruthy()
  const dl = document.getElementById(id ?? "")
  expect(dl, "el detalle existe").not.toBeNull()
  expect(dl?.tagName).toBe("DL")
  return dl as HTMLElement
}

// Tabula desde donde esté el foco hasta `target` (falla si no llega).
const tabTo = async (user: User, target: HTMLElement, max = 80) => {
  for (let step = 0; step < max && document.activeElement !== target; step++) {
    await user.tab()
  }
  expect(target, "se llega con Tab").toHaveFocus()
}

const renderBoard = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superVisor.tripulacion)
  await screen.findByRole("heading", { level: 1, name: H1 })
  const main = screen.getByRole("main")
  await within(main).findByRole("list", { name: LIST })
  return { user, main }
}

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

describe("Tripulación: cabecera (TC-01)", () => {
  it("TC-01 en /supervisor/tripulacion el Supervisor ve el h1 «Tripulación», el antetítulo «Tripulación del turno · Hoy · Horas en UTC» y la descripción", async () => {
    renderRoute(PATHS.superVisor.tripulacion)
    const h1 = await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")

    expect(screen.getAllByRole("heading", { level: 1 })).toEqual([h1])
    await waitFor(() => getByFullText(main, EYEBROW))
    getByFullText(main, DESCRIPTION)
  })
})

describe("Tripulación: panorama del turno (TC-05, TC-06)", () => {
  it("TC-05 y TC-06 (contrato) el panorama son 2 section con nombre, «Tu base» y «Guardia para reemplazos», cada una con aria-labelledby hacia su h2", async () => {
    const { main } = await renderBoard()

    const names = ["Tu base", "Guardia para reemplazos"]
    const regions = names.map((name) =>
      within(main).getByRole("region", { name })
    )
    expect(within(main).getAllByRole("region")).toEqual(regions)
    regions.forEach((region, index) => {
      expect(region.tagName).toBe("SECTION")
      const heading = within(region).getByRole("heading", {
        level: 2,
        name: names[index],
      })
      expect(region).toHaveAttribute("aria-labelledby", heading.id)
    })
  })

  it("TC-05 «Tu base» muestra el h2, «Base Eldorado · BOG», la cifra «34», «en servicio» y «92 % de la tripulación del turno está apta (34 de 37).»", async () => {
    const { main } = await renderBoard()
    const region = within(main).getByRole("region", { name: "Tu base" })

    expect(
      within(region).getByRole("heading", { level: 2, name: "Tu base" })
    ).toBeInTheDocument()
    getByFullText(region, "Base Eldorado · BOG")
    getByFullText(region, "34")
    getByFullText(region, "en servicio")
    getByFullText(
      region,
      "92 % de la tripulación del turno está apta (34 de 37)."
    )
  })

  it("TC-06 «Guardia para reemplazos» muestra el h2, «11», «de 12 disponibles» y la nota exacta de la IA", async () => {
    const { main } = await renderBoard()
    const region = within(main).getByRole("region", {
      name: "Guardia para reemplazos",
    })

    expect(
      within(region).getByRole("heading", {
        level: 2,
        name: "Guardia para reemplazos",
      })
    ).toBeInTheDocument()
    getByFullText(region, "11")
    getByFullText(region, "de 12 disponibles")
    getByFullText(
      region,
      "La IA propone los reemplazos entre la guardia disponible. Quien no cumple descanso, habilitación o certificaciones queda fuera."
    )
  })

  it("TC-06 «Guardia para reemplazos» tiene el único enlace «Ir a Recomendaciones» de la pantalla, hacia /supervisor/solicitudes-reemplazo", async () => {
    const { main } = await renderBoard()
    const region = within(main).getByRole("region", {
      name: "Guardia para reemplazos",
    })

    const link = within(region).getByRole("link", {
      name: "Ir a Recomendaciones",
    })
    expect(link).toHaveAttribute("href", PATHS.superVisor.solicitudesReemplazo)
    expect(
      within(main).getAllByRole("link", { name: "Ir a Recomendaciones" })
    ).toEqual([link])
  })
})

describe("Tripulación: filtros por estado (TC-07)", () => {
  it("TC-07 el grupo «Filtrar por estado» tiene los 6 botones en orden con sus conteos, y solo «Todos (37)» tiene aria-pressed=true", async () => {
    const { main } = await renderBoard()
    const group = filterGroup(main)

    const buttons = within(group).getAllByRole("button")
    expect(buttons).toHaveLength(6)
    FILTERS.forEach((name, index) => {
      expect(within(group).getByRole("button", { name })).toBe(buttons[index])
    })
    expect(filterButton(main, ALL)).toHaveAttribute("aria-pressed", "true")
    for (const name of FILTERS.slice(1)) {
      expect(filterButton(main, name), name).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    }
  })
})

describe("Tripulación: lista y límite (TC-08, TC-09)", () => {
  it("TC-08 (contrato de la lista) es un ul con nombre «Tripulantes del turno» (aria-labelledby a un h2), con un li por tarjeta y cada article nombrado por su h3", async () => {
    const { main } = await renderBoard()

    const list = crewList(main)
    expect(list.tagName).toBe("UL")
    const heading = within(main).getByRole("heading", { level: 2, name: LIST })
    expect(list).toHaveAttribute("aria-labelledby", heading.id)
    const articles = within(list).getAllByRole("article")
    const items = Array.from(list.querySelectorAll(":scope > li"))
    expect(items).toHaveLength(12)
    items.forEach((item, index) =>
      expect(item.querySelector("article")).toBe(articles[index])
    )
    for (const article of articles) {
      const h3 = within(article).getByRole("heading", { level: 3 })
      expect(article).toHaveAttribute("aria-labelledby", h3.id)
    }
  })

  it("TC-08 al cargar se ven los 12 primeros en el orden de los datos (Camila Herrera … Simón Echeverri), «Ver 12 más», «Mostrando 12 de 37» sin región viva y el status «37 tripulantes»", async () => {
    const { main } = await renderBoard()

    expectCards(main, FIRST_12)
    const button = limitButton(main, "Ver 12 más")
    expect(normalize(button.textContent)).toBe("Ver 12 más")
    expect(button).not.toHaveAttribute("aria-label")
    expectNoLiveRegion(getByFullText(main, "Mostrando 12 de 37"))
    await expectResults(main, "37 tripulantes")
  })

  it("TC-09 «Ver 12 más» lleva a 24, luego a 36 («Ver 1 más»), luego a 37 («Mostrar menos») y vuelve a 12, con el foco siempre en el botón", async () => {
    const { user, main } = await renderBoard()

    await user.click(limitButton(main, "Ver 12 más"))
    await waitFor(() => expect(cardNames(main)).toHaveLength(24))
    expect(limitButton(main, "Ver 12 más"), "foco tras 24").toHaveFocus()
    getByFullText(main, "Mostrando 24 de 37")

    await user.click(limitButton(main, "Ver 12 más"))
    await waitFor(() => expect(cardNames(main)).toHaveLength(36))
    expect(limitButton(main, "Ver 1 más"), "foco tras 36").toHaveFocus()
    getByFullText(main, "Mostrando 36 de 37")

    await user.click(limitButton(main, "Ver 1 más"))
    await waitFor(() => expect(cardNames(main)).toHaveLength(37))
    expectCards(main, ALL_NAMES)
    expect(limitButton(main, "Mostrar menos"), "foco tras 37").toHaveFocus()
    getByFullText(main, "Mostrando 37 de 37")

    await user.click(limitButton(main, "Mostrar menos"))
    await waitFor(() => expect(cardNames(main)).toHaveLength(12))
    expectCards(main, FIRST_12)
    expect(limitButton(main, "Ver 12 más"), "foco al volver").toHaveFocus()
    getByFullText(main, "Mostrando 12 de 37")
    await expectResults(main, "37 tripulantes")
  })
})

describe("Tripulación: filtros y límite (TC-10, TC-11)", () => {
  it("TC-10 con «De guardia (12)» aria-pressed pasa a ese botón, quedan las 12 personas de guardia sin botón ni «Mostrando…» y el status dice «12 tripulantes»", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, GUARD_FILTER)

    expect(filterButton(main, ALL)).toHaveAttribute("aria-pressed", "false")
    for (const name of FILTERS.filter((other) => other !== GUARD_FILTER)) {
      expect(filterButton(main, name), name).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    }
    await waitFor(() => expectCards(main, GUARD))
    expectNoLimit(main)
    await expectResults(main, "12 tripulantes")
  })

  it("TC-11 tras «Ver 12 más» con «Todos», al pasar a «En vuelo» y volver a «Todos» se ven otra vez 12, porque el límite se reinicia", async () => {
    const { user, main } = await renderBoard()

    await user.click(limitButton(main, "Ver 12 más"))
    await waitFor(() => expect(cardNames(main)).toHaveLength(24))
    await chooseFilter(user, main, IN_FLIGHT_FILTER)
    await waitFor(() => expectCards(main, IN_FLIGHT))
    await chooseFilter(user, main, ALL)

    await waitFor(() => expectCards(main, FIRST_12))
    expect(limitButton(main, "Ver 12 más")).toBeInTheDocument()
    getByFullText(main, "Mostrando 12 de 37")
  })

  // «av» encuentra los 21 con vuelo (en vuelo, programados y ausentes) más Juan Pablo
  // Navarro (de guardia, por el nombre): 22 coincidencias.
  it("TC-11 (revisión) el corte de 12 se aplica a las coincidencias de la búsqueda: «av» muestra 12 de 22 y «Ver 10 más»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "av")

    await waitFor(() => expect(cardNames(main)).toHaveLength(12))
    getByFullText(main, "Mostrando 12 de 22")
    expect(limitButton(main, "Ver 10 más")).toBeInTheDocument()
    await expectResults(main, "22 tripulantes")
  })

  it("TC-11 (revisión) escribir en el buscador no reinicia el límite: tras «Ver 12 más», «av» muestra sus 22 y «Mostrar menos»", async () => {
    const { user, main } = await renderBoard()

    await user.click(limitButton(main, "Ver 12 más"))
    await waitFor(() => expect(cardNames(main)).toHaveLength(24))
    await search(user, main, "av")

    await waitFor(() => expect(cardNames(main)).toHaveLength(22))
    getByFullText(main, "Mostrando 22 de 22")
    expect(limitButton(main, "Mostrar menos")).toBeInTheDocument()
  })
})

describe("Tripulación: tarjetas (TC-12 a TC-14)", () => {
  it("TC-12 con «Ausentes (3)» se ven Tomás Rincón, Felipe Ardila y Natalia Ríos, cada uno con «Ausente», su motivo y su vuelo en líneas propias", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, ABSENT_FILTER)

    await waitFor(() => expectCards(main, ABSENT))
    for (const [name, reason, flight] of [
      ["Tomás Rincón", "Incapacidad médica repentina", "AV-1288"],
      ["Felipe Ardila", "Incapacidad médica repentina", "AV-9344"],
      ["Natalia Ríos", "Calamidad doméstica o familiar", "AV-8120"],
    ]) {
      const article = card(main, name)
      getByFullText(article, "Ausente")
      getByFullText(article, reason)
      getByFullText(article, flight)
    }
    expectNoLimit(main)
    await expectResults(main, "3 tripulantes")
  })

  it("TC-12 cada ausente tiene el enlace «Ver en Ausencias» hacia /supervisor/ausencias, descrito por su nombre", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, ABSENT_FILTER)

    await waitFor(() => expectCards(main, ABSENT))
    for (const name of ABSENT) {
      const link = within(card(main, name)).getByRole("link", {
        name: "Ver en Ausencias",
      })
      expect(link).toHaveAttribute("href", PATHS.superVisor.ausencias)
      expect(link).toHaveAccessibleDescription(name)
    }
  })

  it("TC-13 Camila Herrera muestra «De guardia», «Standby Hotel (Aeropuerto)», «a 15 min de rampa» y «Disponible para reemplazos»", async () => {
    const { main } = await renderBoard()
    const article = card(main, "Camila Herrera")

    getByFullText(article, "De guardia")
    getByFullText(article, "Standby Hotel (Aeropuerto)")
    getByFullText(article, "a 15 min de rampa")
    getByFullText(article, AVAILABLE)
  })

  it("TC-13 Simón Echeverri muestra «No disponible: Descanso mínimo hasta 16:40», no «Disponible para reemplazos» y no culpa a la IA", async () => {
    const { main } = await renderBoard()
    const article = card(main, "Simón Echeverri")

    getByFullText(article, "De guardia")
    getByFullText(article, "No disponible: Descanso mínimo hasta 16:40")
    expect(article.textContent).not.toContain(AVAILABLE)
    expect(spokenText(article)).not.toMatch(/\bIA\b/)
  })

  it("TC-13 (cara de la tarjeta) cargo visible, iniciales con aria-hidden (CH, CM) e íconos decorativos", async () => {
    const { main } = await renderBoard()

    for (const [name, position, initials] of [
      ["Camila Herrera", "Primer Oficial", "CH"],
      ["Carlos Mejía", "Comandante", "CM"],
    ]) {
      const article = card(main, name)
      getByFullText(article, position)
      const avatars = Array.from(
        article.querySelectorAll<HTMLElement>('[aria-hidden="true"]')
      ).filter((element) => normalize(element.textContent) === initials)
      expect(avatars.length, `iniciales ${initials} en ${name}`).toBe(1)
      expect(spokenText(article)).not.toMatch(new RegExp(`\\b${initials}\\b`))
      for (const svg of Array.from(article.querySelectorAll("svg"))) {
        expect(
          svg.closest('[aria-hidden="true"]'),
          `ícono decorativo en ${name}`
        ).not.toBeNull()
      }
    }
  })

  it("TC-14 (con «En vuelo») Alejandro Rojas muestra «En vuelo», «AV-8805 · BOG a CUN» (texto accesible, sin flecha) y «llega 15:20»", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, IN_FLIGHT_FILTER)

    await waitFor(() => expectCards(main, IN_FLIGHT))
    const article = card(main, "Alejandro Rojas")
    getByFullText(article, "En vuelo")
    getBySpokenText(article, "AV-8805 · BOG a CUN")
    getByFullText(article, "llega 15:20")
    expect(spokenText(article)).not.toMatch(/[→➔⟶]/)
  })

  it("TC-14 (con «Programados») Roberto Méndez muestra «Programado», «AV-4410 · BOG a JFK» y «presentación 17:20»", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, SCHEDULED_FILTER)

    await waitFor(() => expectCards(main, SCHEDULED))
    const article = card(main, "Roberto Méndez")
    getByFullText(article, "Programado")
    getBySpokenText(article, "AV-4410 · BOG a JFK")
    getByFullText(article, "presentación 17:20")
  })

  it("TC-14 (con «En descanso») Óscar Pineda muestra «En descanso» y «Descanso hasta 18:00»", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, RESTING_FILTER)

    await waitFor(() => expectCards(main, RESTING))
    const article = card(main, "Óscar Pineda")
    getByFullText(article, "En descanso")
    getByFullText(article, "Descanso hasta 18:00")
  })
})

describe("Tripulación: detalle desplegable (TC-15 a TC-17)", () => {
  it("TC-15 ninguna tarjeta empieza abierta: cada «Ver detalle de …» tiene aria-expanded=false, sin aria-controls, y no hay ningún dl", async () => {
    const { main } = await renderBoard()

    for (const name of FIRST_12) {
      const button = detailButton(card(main, name), name)
      expect(button, name).toHaveAttribute("aria-expanded", "false")
      expect(button, name).not.toHaveAttribute("aria-controls")
      expect(normalize(button.textContent)).toBe("Ver detalle")
    }
    expect(crewList(main).querySelectorAll("dl")).toHaveLength(0)
  })

  it("TC-16 al abrir el detalle de Carlos Mejía el botón pasa a «Ocultar detalle de Carlos Mejía», con aria-expanded=true y aria-controls igual al id del dl; las demás siguen cerradas", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "Carlos Mejía")

    await user.click(detailButton(article, "Carlos Mejía"))

    const button = await within(article).findByRole("button", {
      name: "Ocultar detalle de Carlos Mejía",
    })
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(normalize(button.textContent)).toBe("Ocultar detalle")
    const dl = controlledDl(button)
    expect(article.contains(dl)).toBe(true)
    for (const name of FIRST_12.filter((other) => other !== "Carlos Mejía")) {
      const other = detailButton(card(main, name), name)
      expect(other, name).toHaveAttribute("aria-expanded", "false")
      expect(other, name).not.toHaveAttribute("aria-controls")
    }
    expect(crewList(main).querySelectorAll("dl")).toHaveLength(1)
  })

  it("TC-16 el dl de Carlos Mejía muestra Teléfono, Canal de radio, Certificaciones y Guardia, en ese orden", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "Carlos Mejía")

    await user.click(detailButton(article, "Carlos Mejía"))

    const button = await within(article).findByRole("button", {
      name: "Ocultar detalle de Carlos Mejía",
    })
    expect(dlRows(controlledDl(button))).toEqual([
      ["Teléfono", "+57 310 882 1456"],
      ["Canal de radio", "CH-04 OPS BOG (131.85)"],
      ["Certificaciones", "Simulador A320 vence en 12 días"],
      ["Guardia", "Hasta 22:00"],
    ])
  })

  it("TC-16 al cerrarlo el dl desaparece y el botón vuelve a «Ver detalle de Carlos Mejía» sin aria-controls", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "Carlos Mejía")

    await user.click(detailButton(article, "Carlos Mejía"))
    const open = await within(article).findByRole("button", {
      name: "Ocultar detalle de Carlos Mejía",
    })
    await user.click(open)

    await waitFor(() =>
      expect(crewList(main).querySelectorAll("dl")).toHaveLength(0)
    )
    const button = detailButton(article, "Carlos Mejía")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).not.toHaveAttribute("aria-controls")
    expect(normalize(button.textContent)).toBe("Ver detalle")
  })

  it("TC-16 el detalle también se abre con teclado: Tab hasta «Ver detalle de Carlos Mejía» y Enter", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "Carlos Mejía")

    await tabTo(user, detailButton(article, "Carlos Mejía"))
    await user.keyboard("{Enter}")

    const open = await within(article).findByRole("button", {
      name: "Ocultar detalle de Carlos Mejía",
    })
    expect(open).toHaveAttribute("aria-expanded", "true")
    expect(open, "el foco sigue en el botón").toHaveFocus()
    expect(dlRows(controlledDl(open))[0]).toEqual([
      "Teléfono",
      "+57 310 882 1456",
    ])
  })

  it("TC-17 (con «En vuelo») el detalle de Alejandro Rojas dice «Certificaciones» «Al día» y no tiene la fila «Guardia»", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, IN_FLIGHT_FILTER)
    await waitFor(() => expectCards(main, IN_FLIGHT))
    const article = card(main, "Alejandro Rojas")
    await user.click(detailButton(article, "Alejandro Rojas"))

    const button = await within(article).findByRole("button", {
      name: "Ocultar detalle de Alejandro Rojas",
    })
    const rows = dlRows(controlledDl(button))
    expect(rows).toEqual([
      ["Teléfono", "+57 314 663 1209"],
      ["Canal de radio", "CH-04 OPS BOG (131.85)"],
      ["Certificaciones", "Al día"],
    ])
    expect(rows.map(([term]) => term)).not.toContain("Guardia")
  })
})

describe("Tripulación: buscador (TC-18, TC-19)", () => {
  it("TC-18 (contrato del buscador) es un <input type=search> con label «Buscar tripulante o vuelo» y el placeholder «Buscar tripulante o vuelo…»", async () => {
    const { main } = await renderBoard()

    const box = searchBox(main)
    expect(box.tagName).toBe("INPUT")
    expect(box).toHaveAttribute("type", "search")
    expect(box).toHaveAttribute("placeholder", "Buscar tripulante o vuelo…")
    expect(box).not.toHaveAttribute("aria-label")
    expect(
      (box as HTMLInputElement).labels?.length ?? 0,
      "label asociado"
    ).toBeGreaterThan(0)
  })

  it("TC-18 «navarro» deja a Juan Pablo Navarro y el status dice «1 tripulante»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "navarro")

    await waitFor(() => expectCards(main, ["Juan Pablo Navarro"]))
    await expectResults(main, "1 tripulante")
    expectNoLimit(main)
  })

  it("TC-18 «av4021» (sin guion) deja a los 4 de AV-4021, y «AV-4021» también", async () => {
    const { user, main } = await renderBoard()
    const crew4021 = [
      "Héctor Bermúdez",
      "Paola Jiménez",
      "Gabriela Torres",
      "Esteban Molina",
    ]

    await search(user, main, "av4021")

    await waitFor(() => expectCards(main, crew4021))
    await expectResults(main, "4 tripulantes")

    await search(user, main, "AV-4021")

    await waitFor(() => expectCards(main, crew4021))
  })

  it("TC-18 con «gomez» (sin tilde) se encuentra a Laura Gómez", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "gomez")

    await waitFor(() => expectCards(main, ["Laura Gómez"]))
    await expectResults(main, "1 tripulante")
  })

  it("TC-18 «zzz» muestra «Ningún tripulante coincide con «zzz».» sin región viva y «0 tripulantes»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "zzz")

    await expectResults(main, "0 tripulantes")
    expectCards(main, [])
    const message = await waitFor(() => getByFullText(main, noMatch("zzz")))
    expectNoLiveRegion(message)
    expect(main).not.toHaveTextContent(EMPTY_FILTER)
    expectNoLimit(main)
  })

  it("TC-18 los conteos de los filtros no cambian con la búsqueda", async () => {
    const { user, main } = await renderBoard()

    for (const query of ["navarro", "av4021", "zzz"]) {
      await search(user, main, query)
      await waitFor(() =>
        expect(normalize(resultsStatus(main).textContent)).not.toBe(
          "37 tripulantes"
        )
      )
      expect(filterNames(main), `conteos con «${query}»`).toEqual(FILTERS)
    }
  })

  it("TC-18 (contrato del buscador) no busca en el cargo ni en la ubicación: «comandante» y «fontibon» no dejan a nadie", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "comandante")
    await expectResults(main, "0 tripulantes")
    await waitFor(() => getByFullText(main, noMatch("comandante")))

    await search(user, main, "fontibon")
    await expectResults(main, "0 tripulantes")
    await waitFor(() => getByFullText(main, noMatch("fontibon")))
  })

  it("TC-18 una búsqueda de solo espacios no filtra; con espacios alrededor, el mensaje muestra la búsqueda recortada", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "   ")

    await expectResults(main, "37 tripulantes")
    expectCards(main, FIRST_12)
    expect(main).not.toHaveTextContent("Ningún tripulante coincide")

    await search(user, main, "  zzz  ")

    await waitFor(() => getByFullText(main, noMatch("zzz")))
  })

  it("TC-19 con «De guardia» y «castro» queda Sebastián Castro", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, GUARD_FILTER)
    await search(user, main, "castro")

    await waitFor(() => expectCards(main, ["Sebastián Castro"]))
    await expectResults(main, "1 tripulante")
    expect(filterButton(main, GUARD_FILTER)).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("TC-19 con «Ausentes» y «navarro» se ve «Ningún tripulante coincide con «navarro».», que tiene prioridad sobre el mensaje del filtro vacío", async () => {
    const { user, main } = await renderBoard()

    await chooseFilter(user, main, ABSENT_FILTER)
    await search(user, main, "navarro")

    await expectResults(main, "0 tripulantes")
    expectCards(main, [])
    const message = await waitFor(() => getByFullText(main, noMatch("navarro")))
    expectNoLiveRegion(message)
    expect(main).not.toHaveTextContent(EMPTY_FILTER)
  })
})
