import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Ausencias del Supervisor (spec docs/specs/ausencias-supervisor.md), con los datos simulados
// reales: cabecera (AS-01), columnas y tarjetas (AS-05 a AS-11), historial desplegable
// (AS-12 a AS-14), buscador y status de resultados (AS-15 a AS-17) y protección (AS-18).

type User = ReturnType<typeof userEvent.setup>

const H1 = "Ausencias"
const EYEBROW = "Seguimiento de ausencias · Hoy · Horas en UTC"
const DESCRIPTION =
  "Estado del reemplazo de cada ausencia reportada en el turno."
const SEARCH = "Buscar vuelo o tripulante"
const EMPTY_COLUMN = "Sin ausencias en este estado."
const REVIEW = "Revisar en Recomendaciones"
const noMatch = (query: string) => `Ninguna ausencia coincide con «${query}».`

const PENDING = "Por aprobar"
const WAITING = "Esperando confirmación"
const COVERED = "Cubiertas"

// Desde el 2026-11-14 «sin candidatos» (AV-1288) va primero, y cada columna muestra 5
// tarjetas de entrada: AV-5023 y AV-3307 quedan tras «Ver 2 más de Por aprobar».
const PENDING_FLIGHTS = [
  "AV-1288",
  "AV-9344",
  "AV-8120",
  "AV-7741",
  "AV-6612",
  "AV-5023",
  "AV-3307",
]
const PENDING_VISIBLE = PENDING_FLIGHTS.slice(0, 5)
const WAITING_FLIGHTS = ["AV-9341"]
const COVERED_FLIGHTS = ["AV-2104", "AV-4410"]
const VISIBLE_FLIGHTS = [
  ...PENDING_VISIBLE,
  ...WAITING_FLIGHTS,
  ...COVERED_FLIGHTS,
]

const columnName = (title: string, count: number) => `${title} (${count})`

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Texto que recibe el lector: omite aria-hidden y hidden, incluye sr-only y separa
// elementos con espacio (mismo recorrido que MisVuelosPage.test).
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

// El elemento más interno cuyo texto completo (normalizado) es `text`,
// aunque el texto esté repartido en varios <span>.
const getByFullText = (container: HTMLElement, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])'

const expectNoLiveRegion = (element: HTMLElement) => {
  expect(element).not.toHaveAttribute("role")
  expect(element.closest(LIVE_REGION), "sin región viva").toBeNull()
}

const column = (main: HTMLElement, title: string, count: number) =>
  within(main).getByRole("region", { name: columnName(title, count) })

const card = (main: HTMLElement, flightNumber: string) =>
  within(main).getByRole("article", { name: flightNumber })

const cardFlights = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 3 }).textContent)
    )

// Las tarjetas de la columna, en orden, y cada una con nombre accesible = número de vuelo.
const expectCards = (region: HTMLElement, flights: string[]) => {
  const articles = within(region).queryAllByRole("article")
  expect(cardFlights(region)).toEqual(flights)
  flights.forEach((flight, index) =>
    expect(within(region).getByRole("article", { name: flight })).toBe(
      articles[index]
    )
  )
}

const expectColumns = (main: HTMLElement, counts: [number, number, number]) =>
  waitFor(() => {
    column(main, PENDING, counts[0])
    column(main, WAITING, counts[1])
    column(main, COVERED, counts[2])
  })

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

const historyButton = (article: HTMLElement, flightNumber: string) =>
  within(article).getByRole("button", {
    name: `Ver historial de ${flightNumber}`,
  })

const historyLists = () =>
  screen.queryAllByRole("list", { name: /^Historial de / })

// Tabula desde donde esté el foco hasta `target` (falla si no llega).
const tabTo = async (user: User, target: HTMLElement, max = 80) => {
  for (let step = 0; step < max && document.activeElement !== target; step++) {
    await user.tab()
  }
  expect(target, "se llega con Tab").toHaveFocus()
}

const MORE_PENDING = "Ver 2 más de Por aprobar"
const LESS_PENDING = "Mostrar menos de Por aprobar"

const showAllPending = async (user: User, main: HTMLElement) => {
  await user.click(
    within(column(main, PENDING, 7)).getByRole("button", { name: MORE_PENDING })
  )
  await waitFor(() =>
    expect(cardFlights(column(main, PENDING, 7))).toEqual(PENDING_FLIGHTS)
  )
}

const renderBoard = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superVisor.ausencias)
  await screen.findByRole("heading", { level: 1, name: H1 })
  const main = screen.getByRole("main")
  await within(main).findByRole("region", { name: columnName(PENDING, 7) })
  return { user, main }
}

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

describe("Ausencias: cabecera (AS-01)", () => {
  it("AS-01 en /supervisor/ausencias el Supervisor ve el h1 «Ausencias», el antetítulo «Seguimiento de ausencias · Hoy · Horas en UTC» y la descripción", async () => {
    renderRoute(PATHS.superVisor.ausencias)
    const h1 = await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")

    expect(screen.getAllByRole("heading", { level: 1 })).toEqual([h1])
    await waitFor(() => getByFullText(main, EYEBROW))
    getByFullText(main, DESCRIPTION)
  })
})

describe("Ausencias: columnas y tarjetas (AS-05, AS-06)", () => {
  it("AS-05 hay 3 section con los h2 «Por aprobar (7)», «Esperando confirmación (1)» y «Cubiertas (2)», en ese orden", async () => {
    const { main } = await renderBoard()

    const names = [
      columnName(PENDING, 7),
      columnName(WAITING, 1),
      columnName(COVERED, 2),
    ]
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
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .filter((heading) => regions.some((region) => region.contains(heading)))
    ).toHaveLength(3)
  })

  it("AS-06 cada columna contiene sus tarjetas (article con nombre = vuelo) en el orden de los datos", async () => {
    const { main } = await renderBoard()

    expectCards(column(main, PENDING, 7), PENDING_VISIBLE)
    expectCards(column(main, WAITING, 1), WAITING_FLIGHTS)
    expectCards(column(main, COVERED, 2), COVERED_FLIGHTS)
    expect(within(main).getAllByRole("article")).toHaveLength(8)
  })

  it("AS-06 (contrato de la columna) las tarjetas van en una lista, un li por tarjeta, y cada h3 lleva el número de vuelo", async () => {
    const { main } = await renderBoard()

    for (const [title, count, shown] of [
      [PENDING, 7, 5],
      [WAITING, 1, 1],
      [COVERED, 2, 2],
    ] as const) {
      const region = column(main, title, count)
      // La lista de tarjetas es el ul que contiene la primera tarjeta (una tarjeta podría
      // llevar listas internas, que no cuentan).
      const articles = within(region).getAllByRole("article")
      const list = articles[0].parentElement?.closest("ul")
      expect(list, `lista de tarjetas en «${title}»`).toBeTruthy()
      if (!list) continue
      expect(list).toHaveRole("list")
      const items = Array.from(list.querySelectorAll(":scope > li"))
      expect(items).toHaveLength(shown)
      items.forEach((item, index) =>
        expect(item.querySelector("article")).toBe(articles[index])
      )
    }
    for (const flight of VISIBLE_FLIGHTS) {
      const article = card(main, flight)
      const heading = within(article).getByRole("heading", { level: 3 })
      expect(normalize(heading.textContent)).toBe(flight)
      expect(article).toHaveAttribute("aria-labelledby", heading.id)
    }
  })
})

describe("Ausencias: contenido de las tarjetas (AS-07 a AS-11)", () => {
  it("AS-07 la tarjeta AV-9344 muestra «BOG a MIA», «STD 16:15», cargo y motivo, reporte, «Sale en 1h 45m» y «La IA propuso 3 candidatos»", async () => {
    const { main } = await renderBoard()
    const article = card(main, "AV-9344")

    expect(spokenText(article)).toContain("BOG a MIA")
    expect(normalize(article.textContent)).toContain("STD 16:15")
    getByFullText(article, "Copiloto A320 · Incapacidad médica repentina")
    getByFullText(article, "Reportó: Felipe Ardila · 13:58")
    getByFullText(article, "Sale en 1h 45m")
    getByFullText(article, "La IA propuso 3 candidatos")
  })

  it("AS-07 la flecha de la ruta es decorativa: el lector no recibe ninguna flecha y los íconos van con aria-hidden", async () => {
    const { main } = await renderBoard()
    const article = card(main, "AV-9344")

    expect(spokenText(article)).toContain("BOG a MIA")
    expect(spokenText(article)).not.toMatch(/[→➔⟶]/)
    const svgs = Array.from(article.querySelectorAll("svg"))
    for (const svg of svgs) {
      expect(svg.closest('[aria-hidden="true"]'), "ícono decorativo").not.toBe(
        null
      )
    }
  })

  it("AS-07 la tarjeta AV-9344 tiene el enlace «Revisar en Recomendaciones» hacia /supervisor/solicitudes-reemplazo, descrito por «AV-9344»", async () => {
    const { main } = await renderBoard()
    const article = card(main, "AV-9344")

    const link = within(article).getByRole("link", { name: REVIEW })
    expect(link).toHaveAttribute("href", PATHS.superVisor.solicitudesReemplazo)
    expect(link).toHaveAccessibleDescription("AV-9344")
  })

  it("AS-08 AV-3307 (tras «Ver 2 más») muestra «La IA está buscando» y no tiene enlace a Recomendaciones", async () => {
    const { user, main } = await renderBoard()
    await showAllPending(user, main)
    const article = card(main, "AV-3307")

    getByFullText(article, "La IA está buscando")
    expect(within(article).queryByRole("link", { name: REVIEW })).toBeNull()
    expect(
      within(article)
        .queryAllByRole("link")
        .filter(
          (link) =>
            link.getAttribute("href") === PATHS.superVisor.solicitudesReemplazo
        )
    ).toHaveLength(0)
  })

  it("AS-09 AV-1288 muestra «Sin candidatos», «Ningún tripulante cumple los requisitos.» y el enlace a Recomendaciones", async () => {
    const { main } = await renderBoard()
    const article = card(main, "AV-1288")

    getByFullText(article, "Sin candidatos")
    getByFullText(article, "Ningún tripulante cumple los requisitos.")
    const link = within(article).getByRole("link", { name: REVIEW })
    expect(link).toHaveAttribute("href", PATHS.superVisor.solicitudesReemplazo)
    expect(link).toHaveAccessibleDescription("AV-1288")
  })

  it("AS-10 AV-9341 muestra «Plazo hasta 14:51», «Mateo Morales», «Copiloto A320 · 2.ª opción» y «Aprobó: Camila Restrepo · 14:06»", async () => {
    const { main } = await renderBoard()
    const article = card(main, "AV-9341")

    getByFullText(article, "Plazo hasta 14:51")
    getByFullText(article, "Mateo Morales")
    getByFullText(article, "Copiloto A320 · 2.ª opción")
    getByFullText(article, "Aprobó: Camila Restrepo · 14:06")
  })

  it("AS-11 AV-2104 muestra «Confirmó 13:52», «Laura Gómez», «Jefe de Cabina · 1.ª opción» y «Aprobó: Camila Restrepo · 13:40»", async () => {
    const { main } = await renderBoard()
    const article = card(main, "AV-2104")

    getByFullText(article, "Confirmó 13:52")
    getByFullText(article, "Laura Gómez")
    getByFullText(article, "Jefe de Cabina · 1.ª opción")
    getByFullText(article, "Aprobó: Camila Restrepo · 13:40")
  })

  it("AS-10 y AS-11 (tabla de etiquetas) las tarjetas esperando y cubiertas no llevan el enlace a Recomendaciones", async () => {
    const { main } = await renderBoard()

    for (const flight of [...WAITING_FLIGHTS, ...COVERED_FLIGHTS]) {
      expect(
        within(card(main, flight)).queryByRole("link", { name: REVIEW }),
        `${flight} sin enlace`
      ).toBeNull()
    }
  })

  it("AS-10 y AS-11 (bloque del reemplazo) el avatar lleva las iniciales con aria-hidden: MM, LG y RM", async () => {
    const { main } = await renderBoard()

    for (const [flight, initials] of [
      ["AV-9341", "MM"],
      ["AV-2104", "LG"],
      ["AV-4410", "RM"],
    ]) {
      const article = card(main, flight)
      const avatars = Array.from(
        article.querySelectorAll<HTMLElement>('[aria-hidden="true"]')
      ).filter((element) => normalize(element.textContent) === initials)
      expect(avatars.length, `iniciales ${initials} en ${flight}`).toBe(1)
      expect(spokenText(article)).not.toMatch(new RegExp(`\\b${initials}\\b`))
    }
  })
})

describe("Ausencias: historial desplegable (AS-12 a AS-14)", () => {
  it("AS-12 al cargar, cada «Ver historial de {vuelo}» tiene aria-expanded=false, sin aria-controls, y no existe ninguna lista «Historial de …»", async () => {
    const { main } = await renderBoard()

    for (const flight of VISIBLE_FLIGHTS) {
      const button = historyButton(card(main, flight), flight)
      expect(button).toHaveAttribute("aria-expanded", "false")
      expect(button).not.toHaveAttribute("aria-controls")
      expect(normalize(button.textContent)).toBe("Ver historial")
    }
    expect(historyLists()).toHaveLength(0)
  })

  it("AS-13 al pulsar «Ver historial de AV-9341» el botón pasa a «Ocultar historial de AV-9341» con aria-expanded=true y aria-controls igual al id de la lista", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "AV-9341")

    await user.click(historyButton(article, "AV-9341"))

    const button = await within(article).findByRole("button", {
      name: "Ocultar historial de AV-9341",
    })
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(normalize(button.textContent)).toBe("Ocultar historial")
    const list = within(article).getByRole("list", {
      name: "Historial de AV-9341",
    })
    expect(list.tagName).toBe("OL")
    expect(list.id).not.toBe("")
    expect(button).toHaveAttribute("aria-controls", list.id)
  })

  it("AS-13 la lista «Historial de AV-9341» tiene 5 eventos en orden, cada uno con su <time>, incluido «14:21» «Sebastián Castro no confirmó a tiempo» sin región viva", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "AV-9341")

    await user.click(historyButton(article, "AV-9341"))

    const list = await within(article).findByRole("list", {
      name: "Historial de AV-9341",
    })
    const items = within(list).getAllByRole("listitem")
    const expected = [
      ["13:58", "Ausencia reportada por Paula Cárdenas"],
      ["14:01", "La IA propuso 3 candidatos"],
      ["14:06", "Camila Restrepo aprobó a Sebastián Castro (1.ª opción)"],
      ["14:21", "Sebastián Castro no confirmó a tiempo"],
      ["14:21", "Se notificó a Mateo Morales (2.ª opción)"],
    ]
    expect(items).toHaveLength(expected.length)
    items.forEach((item, index) => {
      const [time, text] = expected[index]
      const times = item.querySelectorAll("time")
      expect(times, `un <time> en el evento ${index + 1}`).toHaveLength(1)
      expect(normalize(times[0].textContent)).toBe(time)
      expect(normalize(item.textContent)).toContain(text)
    })
    const missed = items[3]
    expect(missed.closest(LIVE_REGION), "el evento vencido no se anuncia").toBe(
      null
    )
    expect(missed.querySelector(LIVE_REGION)).toBeNull()
    expect(within(list).queryAllByRole("status")).toHaveLength(0)
    expect(within(list).queryAllByRole("alert")).toHaveLength(0)
  })

  it("AS-13 con el historial de AV-9341 abierto, las demás tarjetas siguen cerradas", async () => {
    const { user, main } = await renderBoard()

    await user.click(historyButton(card(main, "AV-9341"), "AV-9341"))
    await within(card(main, "AV-9341")).findByRole("list", {
      name: "Historial de AV-9341",
    })

    for (const flight of VISIBLE_FLIGHTS.filter(
      (other) => other !== "AV-9341"
    )) {
      const button = historyButton(card(main, flight), flight)
      expect(button, flight).toHaveAttribute("aria-expanded", "false")
      expect(button, flight).not.toHaveAttribute("aria-controls")
    }
    expect(historyLists()).toHaveLength(1)
  })

  it("AS-13 al volver a pulsarlo se cierra: la lista desaparece del DOM y el botón vuelve a «Ver historial de AV-9341» sin aria-controls", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "AV-9341")

    await user.click(historyButton(article, "AV-9341"))
    await within(article).findByRole("list", { name: "Historial de AV-9341" })
    await user.click(
      within(article).getByRole("button", {
        name: "Ocultar historial de AV-9341",
      })
    )

    await waitFor(() => expect(historyLists()).toHaveLength(0))
    const button = historyButton(article, "AV-9341")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).not.toHaveAttribute("aria-controls")
    expect(normalize(button.textContent)).toBe("Ver historial")
  })

  it("AS-14 el historial se abre con teclado: Tab hasta «Ver historial de AV-9344» y Enter", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "AV-9344")
    const button = historyButton(article, "AV-9344")

    await tabTo(user, button)
    await user.keyboard("{Enter}")

    const list = await within(article).findByRole("list", {
      name: "Historial de AV-9344",
    })
    const items = within(list).getAllByRole("listitem")
    expect(items.map((item) => normalize(item.textContent))).toEqual([
      expect.stringContaining("Ausencia reportada por Felipe Ardila"),
      expect.stringContaining("La IA propuso 3 candidatos"),
    ])
    const open = within(article).getByRole("button", {
      name: "Ocultar historial de AV-9344",
    })
    expect(open).toHaveAttribute("aria-expanded", "true")
    expect(open, "el foco sigue en el botón").toHaveFocus()
  })

  it("AS-14 el historial se abre y se cierra con Espacio", async () => {
    const { user, main } = await renderBoard()
    const article = card(main, "AV-2104")
    const button = historyButton(article, "AV-2104")

    await tabTo(user, button)
    await user.keyboard(" ")

    expect(
      await within(article).findByRole("list", {
        name: "Historial de AV-2104",
      })
    ).toBeInTheDocument()
    const open = within(article).getByRole("button", {
      name: "Ocultar historial de AV-2104",
    })
    expect(open).toHaveAttribute("aria-expanded", "true")
    expect(open).toHaveFocus()

    await user.keyboard(" ")

    await waitFor(() => expect(historyLists()).toHaveLength(0))
    expect(historyButton(article, "AV-2104")).toHaveAttribute(
      "aria-expanded",
      "false"
    )
  })
})

describe("Ausencias: buscador y resultados (AS-15 a AS-17)", () => {
  it("AS-15..17 (contrato del buscador) es un <input type=search> «Buscar vuelo o tripulante» con su placeholder", async () => {
    const { main } = await renderBoard()

    const box = searchBox(main)
    expect(box.tagName).toBe("INPUT")
    expect(box).toHaveAttribute("type", "search")
    expect(box).toHaveAttribute("placeholder", "Buscar vuelo o tripulante…")
  })

  it("AS-17 (contrato del status) con los datos cargados el status de resultados dice «10 ausencias»", async () => {
    const { main } = await renderBoard()

    await expectResults(main, "10 ausencias")
  })

  it("AS-15 al escribir «navarro» no queda ninguna ausencia: las 3 columnas con (0) y «Sin ausencias en este estado.»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "navarro")

    await expectColumns(main, [0, 0, 0])
    for (const title of [PENDING, WAITING, COVERED]) {
      const region = column(main, title, 0)
      expect(within(region).queryAllByRole("article")).toHaveLength(0)
      expect(within(region).queryByRole("list")).toBeNull()
      getByFullText(region, EMPTY_COLUMN)
    }
  })

  it("AS-15 al escribir «navarro» se ve «Ninguna ausencia coincide con «navarro».» sin región viva y el status dice «0 ausencias»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "navarro")

    await expectResults(main, "0 ausencias")
    const message = await waitFor(() => getByFullText(main, noMatch("navarro")))
    expectNoLiveRegion(message)
  })

  it("AS-16 al escribir «gomez» (sin tilde) queda solo AV-2104 en «Cubiertas (1)», las otras con (0), y el status dice «1 ausencia»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "gomez")

    await expectColumns(main, [0, 0, 1])
    expectCards(column(main, COVERED, 1), ["AV-2104"])
    expect(within(main).getAllByRole("article")).toHaveLength(1)
    await expectResults(main, "1 ausencia")
    expect(main).not.toHaveTextContent("Ninguna ausencia coincide")
  })

  it("AS-16 al escribir «av-93» quedan AV-9344 en «Por aprobar (1)» y AV-9341 en «Esperando confirmación (1)», y el status dice «2 ausencias»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "av-93")

    await expectColumns(main, [1, 1, 0])
    expectCards(column(main, PENDING, 1), ["AV-9344"])
    expectCards(column(main, WAITING, 1), ["AV-9341"])
    expect(within(main).getAllByRole("article")).toHaveLength(2)
    await expectResults(main, "2 ausencias")
  })

  it("AS-15 (contrato del buscador) también busca por reportante sin tildes: «cardenas» deja AV-9341", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "cardenas")

    await expectColumns(main, [0, 1, 0])
    expectCards(column(main, WAITING, 1), ["AV-9341"])
    await expectResults(main, "1 ausencia")
  })

  it("AS-15 (contrato del buscador) no busca en el historial: «castro» (solo en el timeline de AV-9341) no deja ninguna", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "castro")

    await expectColumns(main, [0, 0, 0])
    await expectResults(main, "0 ausencias")
    await waitFor(() => getByFullText(main, noMatch("castro")))
  })

  it("AS-16 (revisión) el vuelo se encuentra también sin guion: «av9344» deja AV-9344", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "av9344")

    await expectColumns(main, [1, 0, 0])
    expectCards(column(main, PENDING, 1), ["AV-9344"])
    await expectResults(main, "1 ausencia")
  })

  it("AS-17 (revisión) una búsqueda de solo espacios no filtra; con espacios alrededor, el mensaje muestra el texto recortado", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "   ")

    await expectColumns(main, [7, 1, 2])
    await expectResults(main, "10 ausencias")
    expect(main).not.toHaveTextContent("Ninguna ausencia coincide")

    await search(user, main, "  navarro  ")

    await waitFor(() => getByFullText(main, noMatch("navarro")))
  })

  it("AS-17 al borrar la búsqueda vuelven las columnas con sus totales y las 8 tarjetas visibles, y el status dice «10 ausencias»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "gomez")
    await expectColumns(main, [0, 0, 1])
    await user.clear(searchBox(main))

    await expectColumns(main, [7, 1, 2])
    expectCards(column(main, PENDING, 7), PENDING_VISIBLE)
    expectCards(column(main, WAITING, 1), WAITING_FLIGHTS)
    expectCards(column(main, COVERED, 2), COVERED_FLIGHTS)
    await expectResults(main, "10 ausencias")
    expect(main).not.toHaveTextContent("Ninguna ausencia coincide")
    expect(main).not.toHaveTextContent(EMPTY_COLUMN)
  })
})

describe("Ausencias: límite de tarjetas por columna (AS-20, AS-22)", () => {
  it("AS-20 «Por aprobar (7)» tiene el botón «Ver 2 más de Por aprobar» y «Mostrando 5 de 7» sin región viva; Esperando y Cubiertas no", async () => {
    const { main } = await renderBoard()
    const pending = column(main, PENDING, 7)

    const button = within(pending).getByRole("button", { name: MORE_PENDING })
    expect(button).toHaveAttribute("type", "button")
    expect(normalize(button.textContent)).toBe("Ver 2 más")
    expectNoLiveRegion(getByFullText(pending, "Mostrando 5 de 7"))
    for (const [title, count] of [
      [WAITING, 1],
      [COVERED, 2],
    ] as const) {
      const region = column(main, title, count)
      expect(
        within(region).queryByRole("button", {
          name: /^(Ver d+ más|Mostrar menos) de /,
        })
      ).toBeNull()
      expect(region).not.toHaveTextContent("Mostrando")
    }
  })

  it("AS-20 al pulsarlo aparecen AV-5023 y AV-3307 al final, el botón pasa a «Mostrar menos de Por aprobar» con el foco y dice «Mostrando 7 de 7»", async () => {
    const { user, main } = await renderBoard()
    const pending = column(main, PENDING, 7)

    await user.click(
      within(pending).getByRole("button", { name: MORE_PENDING })
    )

    await waitFor(() => expectCards(pending, PENDING_FLIGHTS))
    const less = within(pending).getByRole("button", { name: LESS_PENDING })
    expect(normalize(less.textContent)).toBe("Mostrar menos")
    expect(less, "el foco sigue en el botón").toHaveFocus()
    getByFullText(pending, "Mostrando 7 de 7")
    expect(within(main).getAllByRole("article")).toHaveLength(10)
  })

  it("AS-20 al pulsar «Mostrar menos» vuelven las 5 primeras y «Ver 2 más», con el foco en el botón", async () => {
    const { user, main } = await renderBoard()
    const pending = column(main, PENDING, 7)

    await showAllPending(user, main)
    await user.click(
      within(pending).getByRole("button", { name: LESS_PENDING })
    )

    await waitFor(() => expectCards(pending, PENDING_VISIBLE))
    const more = within(pending).getByRole("button", { name: MORE_PENDING })
    expect(more).toHaveFocus()
    getByFullText(pending, "Mostrando 5 de 7")
  })

  it("AS-20 el botón se usa con teclado (Enter)", async () => {
    const { user, main } = await renderBoard()
    const pending = column(main, PENDING, 7)

    await tabTo(
      user,
      within(pending).getByRole("button", { name: MORE_PENDING })
    )
    await user.keyboard("{Enter}")

    await waitFor(() => expectCards(pending, PENDING_FLIGHTS))
  })

  it("AS-22 el corte se aplica a las coincidencias: con «av-93», «Por aprobar (1)» muestra AV-9344 sin botón ni «Mostrando…»", async () => {
    const { user, main } = await renderBoard()

    await search(user, main, "av-93")

    await expectColumns(main, [1, 1, 0])
    const pending = column(main, PENDING, 1)
    expectCards(pending, ["AV-9344"])
    expect(
      within(pending).queryByRole("button", { name: /más de|menos de/ })
    ).toBeNull()
    expect(pending).not.toHaveTextContent("Mostrando")
  })
})

// jsdom no mide alturas: se fija la estructura (contenedor con scroll propio y alto máximo).
const scrollArea = (element: HTMLElement) =>
  element.closest<HTMLElement>(".overflow-y-auto")

describe("Ausencias: scroll interno de cada columna (AS-23)", () => {
  it("AS-23 en cada columna la lista va en un contenedor overflow-y-auto con max-h-*, y el h2 queda fuera", async () => {
    const { main } = await renderBoard()

    for (const [title, count] of [
      [PENDING, 7],
      [WAITING, 1],
      [COVERED, 2],
    ] as const) {
      const region = column(main, title, count)
      const list = within(region).getAllByRole("article")[0].closest("ul")
      expect(list, `lista de «${title}»`).toBeTruthy()
      const area = scrollArea(list as HTMLElement)
      expect(area, `scroll propio en «${title}»`).not.toBeNull()
      expect(region.contains(area)).toBe(true)
      expect(area?.className).toMatch(/(^|\s)max-h-/)
      const heading = within(region).getByRole("heading", { level: 2 })
      expect(area?.contains(heading), "el h2 queda fuera").toBe(false)
    }
  })

  it("AS-23 en «Por aprobar» el botón y «Mostrando 5 de 7» van dentro del mismo scroll, después de la lista", async () => {
    const { main } = await renderBoard()
    const pending = column(main, PENDING, 7)

    const list = within(pending).getAllByRole("article")[0].closest("ul")
    const area = scrollArea(list as HTMLElement)
    const button = within(pending).getByRole("button", { name: MORE_PENDING })
    const text = getByFullText(pending, "Mostrando 5 de 7")
    expect(area?.contains(button)).toBe(true)
    expect(area?.contains(text)).toBe(true)
    expect(
      (list as HTMLElement).compareDocumentPosition(button) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})

// AS-24: jsdom no tiene layout, así que se simulan las medidas. Cada <li> de una lista de
// tarjetas mide 300 px y lo separan 12 px del anterior; la lista empieza en 0.
const CARD = 300
const GAP = 12

const fakeRect = (top: number, height: number) =>
  ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect

describe("Ausencias: el scroll muestra 2 tarjetas completas (AS-24)", () => {
  it("AS-24 «Por aprobar» limita su scroll a 2 tarjetas (620px en línea) y «Cubiertas», con justo 2, no lleva límite en línea", async () => {
    const spy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        if (this.tagName === "LI" && this.parentElement?.tagName === "UL") {
          const index = Array.from(this.parentElement.children).indexOf(this)
          return fakeRect(index * (CARD + GAP), CARD)
        }
        return fakeRect(0, 0)
      })
    try {
      const { main } = await renderBoard()

      const areaOf = (region: HTMLElement) =>
        scrollArea(
          within(region).getAllByRole("article")[0].closest("ul") as HTMLElement
        ) as HTMLElement
      await waitFor(() =>
        expect(areaOf(column(main, PENDING, 7)).style.maxHeight).toBe("620px")
      )
      expect(areaOf(column(main, COVERED, 2)).style.maxHeight).toBe("")
      expect(areaOf(column(main, WAITING, 1)).style.maxHeight).toBe("")
    } finally {
      spy.mockRestore()
    }
  })
})

describe("Ausencias: protección de la ruta (AS-18)", () => {
  it.each([
    { role: ROLES.TRIPULANTE, home: PATHS.tripulante.inicio },
    { role: ROLES.SUPER_ADMIN, home: PATHS.superAdmin.inicio },
  ])(
    "AS-18 un $role que abre /supervisor/ausencias termina en $home",
    async ({ role, home }) => {
      useAuthStore.getState().setMockRole(role)

      const router = renderRoute(PATHS.superVisor.ausencias)

      await waitFor(() => expect(router.state.location.pathname).toBe(home))
    }
  )
})
