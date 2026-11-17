import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec mis-vuelos: explorador de vuelos. Cambio de pestaña con clic y teclado (MV-06),
// selector de mes (MV-07), buscador (MV-08) y status de resultados (MV-09).

// Hoy la ruta no es lazy, pero puede pasar a serlo (MV-13): la primera espera lleva margen.
const LAZY = { timeout: 3000 }

const TAB = {
  upcoming: "Próximos Vuelos",
  history: "Historial de Vuelos Anteriores",
} as const

const MONTH_OPTIONS = [
  { value: "2024-09", text: "Septiembre 2024" },
  { value: "2024-10", text: "Octubre 2024 (Actual)" },
  { value: "2024-11", text: "Noviembre 2024" },
]

const EMPTY_MONTH = "No hay vuelos para este mes."
const noMatch = (query: string) => `Ningún vuelo coincide con «${query}».`

// Textos comunes a todo el historial y propios de cada vuelo (tabla «Historial» de la spec).
const HISTORY_COMMON = [
  "Completado",
  "Fecha y Salida",
  "Equipo",
  "Rol Asignado",
  "Primer Oficial",
  "Copiloto",
  "Bloque Real",
  "Vuelo Completado",
  "Sin demoras atribuibles",
]

const HISTORY = [
  {
    number: "AV-9102",
    month: "2024-10",
    texts: [
      "MIA",
      "Miami, KMIA",
      "BOG",
      "Bogotá, SKBO",
      "Directo",
      "Jue 17 Oct, 21:40 UTC",
      "16:40 Local",
      "Airbus A320neo",
      "HK-5388",
      "3h 48m",
      "Llegada 01:28 UTC",
      "Comandante: Cpt. Hernán Morales",
      "Roster Ciclo W42",
    ],
  },
  {
    number: "AV-9101",
    month: "2024-10",
    texts: [
      "BOG",
      "MIA",
      "Directo",
      "Jue 17 Oct, 12:10 UTC",
      "07:10 Local",
      "Airbus A320neo",
      "HK-5388",
      "3h 52m",
      "Llegada 16:02 UTC",
      "Comandante: Cpt. Hernán Morales",
      "Roster Ciclo W42",
    ],
  },
  {
    number: "AV-8517",
    month: "2024-10",
    texts: [
      "CLO",
      "Cali, SKCL",
      "BOG",
      "Nacional",
      "Lun 14 Oct, 19:05 UTC",
      "14:05 Local",
      "Airbus A320",
      "HK-5271",
      "0h 56m",
      "Llegada 20:01 UTC",
      "Comandante: Cpt. Mauricio Restrepo",
      "Roster Ciclo W42",
    ],
  },
  {
    number: "AV-8516",
    month: "2024-10",
    texts: [
      "BOG",
      "CLO",
      "Nacional",
      "Lun 14 Oct, 16:20 UTC",
      "11:20 Local",
      "Airbus A320",
      "HK-5271",
      "0h 57m",
      "Llegada 17:17 UTC",
      "Comandante: Cpt. Mauricio Restrepo",
      "Roster Ciclo W42",
    ],
  },
  {
    number: "AV-9221",
    month: "2024-09",
    texts: [
      "MDE",
      "Medellín, SKRG",
      "BOG",
      "Nacional",
      "Vie 27 Sep, 22:15 UTC",
      "17:15 Local",
      "Airbus A320",
      "HK-5402",
      "0h 49m",
      "Llegada 23:04 UTC",
      "Comandante: Cpt. Laura Gómez",
      "Roster Ciclo W39",
    ],
  },
  {
    number: "AV-9220",
    month: "2024-09",
    texts: [
      "BOG",
      "MDE",
      "Nacional",
      "Vie 27 Sep, 19:30 UTC",
      "14:30 Local",
      "Airbus A320",
      "HK-5402",
      "0h 51m",
      "Llegada 20:21 UTC",
      "Comandante: Cpt. Laura Gómez",
      "Roster Ciclo W39",
    ],
  },
]

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const isLoading = (element: HTMLElement) =>
  /^cargando/i.test(normalize(element.textContent))

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

const tab = (name: string) => screen.getByRole("tab", { name })

// El panel visible de la pestaña activa (Base UI oculta o desmonta los demás).
const activePanel = () => {
  const panels = screen.getAllByRole("tabpanel")
  expect(panels, "un único tabpanel visible").toHaveLength(1)
  return panels[0]
}

const flightNumbersIn = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 2 }).textContent)
    )

const expectPanelFlights = (numbers: string[]) =>
  waitFor(() => expect(flightNumbersIn(activePanel())).toEqual(numbers))

// MV-09: el status de resultados es el único role=status de la pantalla que no es de carga.
const resultsStatus = (main: HTMLElement) => {
  const statuses = within(main)
    .queryAllByRole("status")
    .filter((element) => !isLoading(element))
  expect(statuses, "un único status de resultados").toHaveLength(1)
  return statuses[0]
}

const expectResults = (main: HTMLElement, text: string) =>
  waitFor(() => expect(normalize(resultsStatus(main).textContent)).toBe(text))

// Espera a que la pantalla tenga la lista de Próximos de octubre cargada.
const findLoadedBrowser = async () => {
  await screen.findByRole("tab", { name: `${TAB.upcoming} 3` }, LAZY)
  const main = screen.getByRole("main")
  await expectPanelFlights(["AV-9344", "AV-8520", "AV-9210"])
  await waitFor(() =>
    expect(within(main).queryAllByRole("status").filter(isLoading)).toEqual([])
  )
  return main
}

const monthSelect = (main: HTMLElement) =>
  within(main).getByRole("combobox", { name: "Mes del roster" })

const searchBox = (main: HTMLElement) =>
  within(main).getByRole("searchbox", { name: "Buscar vuelo" })

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

describe("Mis Vuelos: cambio de pestaña (MV-06)", () => {
  it("MV-06: al pulsar «Historial de Vuelos Anteriores» queda seleccionada y el panel muestra AV-9102, AV-9101, AV-8517 y AV-8516 con «Completado»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoadedBrowser()

    await user.click(tab(`${TAB.history} 4`))

    expect(tab(`${TAB.history} 4`)).toHaveAttribute("aria-selected", "true")
    expect(tab(`${TAB.upcoming} 3`)).toHaveAttribute("aria-selected", "false")
    await expectPanelFlights(["AV-9102", "AV-9101", "AV-8517", "AV-8516"])
    for (const article of within(activePanel()).getAllByRole("article")) {
      expect(article).toHaveTextContent("Completado")
      expect(article).not.toHaveTextContent("Programado Roster")
      expect(article).not.toHaveTextContent("Reemplazo Asignado")
    }
  })

  it("MV-06: con el teclado, la flecha derecha lleva el foco de «Próximos Vuelos» a «Historial de Vuelos Anteriores» y Enter la activa", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoadedBrowser()

    await user.click(tab(`${TAB.upcoming} 3`))
    expect(tab(`${TAB.upcoming} 3`)).toHaveFocus()

    await user.keyboard("{ArrowRight}")
    expect(tab(`${TAB.history} 4`)).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(tab(`${TAB.history} 4`)).toHaveAttribute("aria-selected", "true")
    await expectPanelFlights(["AV-9102", "AV-9101", "AV-8517", "AV-8516"])
  })

  it.each(HISTORY.filter((flight) => flight.month === "2024-10"))(
    "MV-06 (contrato de textos): la tarjeta de $number del historial muestra sus textos de la tabla",
    async ({ number, texts }) => {
      const user = userEvent.setup()
      renderRoute(PATHS.tripulante.misVuelos)
      await findLoadedBrowser()

      await user.click(tab(`${TAB.history} 4`))
      await expectPanelFlights(["AV-9102", "AV-9101", "AV-8517", "AV-8516"])

      const article = within(activePanel())
        .getByRole("heading", { level: 2, name: number })
        .closest("article") as HTMLElement
      for (const text of [...HISTORY_COMMON, ...texts]) {
        expect(article).toHaveTextContent(text)
      }
      expect(
        within(article).getByRole("button", {
          name: `Ver más detalle del vuelo ${number}`,
        })
      ).toBeInTheDocument()
    }
  )

  it("MV-06 (contrato de textos): AV-9102 va de MIA (Miami, KMIA) a BOG (Bogotá, SKBO), en ese orden", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoadedBrowser()

    await user.click(tab(`${TAB.history} 4`))
    await expectPanelFlights(["AV-9102", "AV-9101", "AV-8517", "AV-8516"])

    const article = within(activePanel())
      .getByRole("heading", { level: 2, name: "AV-9102" })
      .closest("article") as HTMLElement
    const text = normalize(article.textContent)
    expect(text.indexOf("Miami, KMIA")).toBeGreaterThan(-1)
    expect(text.indexOf("Miami, KMIA")).toBeLessThan(
      text.indexOf("Bogotá, SKBO")
    )
  })
})

describe("Mis Vuelos: selector de mes (MV-07)", () => {
  it("MV-07: el <select> nativo «Mes del roster» tiene las 3 opciones de la spec y empieza en 2024-10", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    const select = monthSelect(main)
    expect(select.tagName).toBe("SELECT")
    const options = Array.from((select as HTMLSelectElement).options).map(
      (option) => ({ value: option.value, text: normalize(option.textContent) })
    )
    expect(options).toEqual(MONTH_OPTIONS)
    expect(select).toHaveValue("2024-10")
  })

  it("MV-07: con «Septiembre 2024» las pestañas son «Próximos Vuelos 0» e «Historial de Vuelos Anteriores 2»; Próximos queda vacío y el historial muestra AV-9221 y AV-9220", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    await user.selectOptions(monthSelect(main), "2024-09")

    expect(
      await screen.findByRole("tab", { name: `${TAB.upcoming} 0` })
    ).toBeInTheDocument()
    expect(tab(`${TAB.history} 2`)).toBeInTheDocument()
    await expectPanelFlights([])
    getByFullText(activePanel(), EMPTY_MONTH)

    await user.click(tab(`${TAB.history} 2`))
    await expectPanelFlights(["AV-9221", "AV-9220"])
    expect(within(activePanel()).queryByText(EMPTY_MONTH)).toBeNull()
  })

  it.each(HISTORY.filter((flight) => flight.month === "2024-09"))(
    "MV-07 (contrato de textos): la tarjeta de $number de septiembre muestra sus textos de la tabla",
    async ({ number, texts }) => {
      const user = userEvent.setup()
      renderRoute(PATHS.tripulante.misVuelos)
      const main = await findLoadedBrowser()

      await user.selectOptions(monthSelect(main), "2024-09")
      await user.click(
        await screen.findByRole("tab", { name: `${TAB.history} 2` })
      )
      await expectPanelFlights(["AV-9221", "AV-9220"])

      const article = within(activePanel())
        .getByRole("heading", { level: 2, name: number })
        .closest("article") as HTMLElement
      for (const text of [...HISTORY_COMMON, ...texts]) {
        expect(article).toHaveTextContent(text)
      }
    }
  )

  it("MV-07: con «Noviembre 2024» las dos pestañas están en 0 y las dos listas muestran «No hay vuelos para este mes.»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    await user.selectOptions(monthSelect(main), "2024-11")

    expect(
      await screen.findByRole("tab", { name: `${TAB.upcoming} 0` })
    ).toBeInTheDocument()
    expect(tab(`${TAB.history} 0`)).toBeInTheDocument()
    await expectPanelFlights([])
    getByFullText(activePanel(), EMPTY_MONTH)

    await user.click(tab(`${TAB.history} 0`))
    expect(tab(`${TAB.history} 0`)).toHaveAttribute("aria-selected", "true")
    await expectPanelFlights([])
    getByFullText(activePanel(), EMPTY_MONTH)
  })
})

describe("Mis Vuelos: buscador (MV-08)", () => {
  it("MV-08: el buscador es un <input type=search> «Buscar vuelo» con su marcador de posición", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    const search = searchBox(main)
    expect(search).toHaveAttribute("type", "search")
    expect(search).toHaveAttribute(
      "placeholder",
      "Buscar vuelo (ej. AV-9344, MIA)…"
    )
  })

  it("MV-08: «mia» deja solo AV-9344 y «medellin» (sin tilde) deja solo AV-9210; los números de las pestañas no cambian", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()
    const search = searchBox(main)

    await user.type(search, "mia")
    await expectPanelFlights(["AV-9344"])
    expect(tab(`${TAB.upcoming} 3`)).toBeInTheDocument()
    expect(tab(`${TAB.history} 4`)).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, "medellin")
    await expectPanelFlights(["AV-9210"])
    expect(tab(`${TAB.upcoming} 3`)).toBeInTheDocument()
    expect(tab(`${TAB.history} 4`)).toBeInTheDocument()
  })

  it("MV-08 (contrato): el buscador también filtra por número de vuelo, sin distinguir mayúsculas", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    await user.type(searchBox(main), "av-8520")
    await expectPanelFlights(["AV-8520"])
  })

  it("MV-08: «xyz» deja la lista vacía con «Ningún vuelo coincide con «xyz».» y las pestañas siguen en 3 y 4", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    await user.type(searchBox(main), "xyz")

    await expectPanelFlights([])
    getByFullText(activePanel(), noMatch("xyz"))
    expect(within(activePanel()).queryByText(EMPTY_MONTH)).toBeNull()
    expect(tab(`${TAB.upcoming} 3`)).toBeInTheDocument()
    expect(tab(`${TAB.history} 4`)).toBeInTheDocument()
  })

  it("MV-08: con «mia» escrito, al cambiar a Historial la búsqueda se mantiene y se ven AV-9102 y AV-9101", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    await user.type(searchBox(main), "mia")
    await expectPanelFlights(["AV-9344"])

    await user.click(tab(`${TAB.history} 4`))

    await expectPanelFlights(["AV-9102", "AV-9101"])
    expect(searchBox(main)).toHaveValue("mia")
    expect(tab(`${TAB.upcoming} 3`)).toBeInTheDocument()
    expect(tab(`${TAB.history} 4`)).toBeInTheDocument()
  })
})

describe("Mis Vuelos: status de resultados (MV-09)", () => {
  it("MV-09 (A11Y-MV-5): el status sr-only de resultados dice «3 vuelos en Próximos Vuelos, Octubre 2024» al entrar, «1 vuelo en…» con «mia» y «0 vuelos en…» con «xyz»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()

    await expectResults(main, `3 vuelos en ${TAB.upcoming}, Octubre 2024`)
    expect(resultsStatus(main)).toHaveClass("sr-only")

    const search = searchBox(main)
    await user.type(search, "mia")
    await expectResults(main, `1 vuelo en ${TAB.upcoming}, Octubre 2024`)

    await user.clear(search)
    await user.type(search, "xyz")
    await expectResults(main, `0 vuelos en ${TAB.upcoming}, Octubre 2024`)
  })

  it("MV-09 (A11Y-MV-5): el status de resultados nombra la pestaña y el mes (sin «(Actual)») al cambiar de pestaña y de mes", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedBrowser()
    await expectResults(main, `3 vuelos en ${TAB.upcoming}, Octubre 2024`)

    await user.click(tab(`${TAB.history} 4`))
    await expectResults(main, `4 vuelos en ${TAB.history}, Octubre 2024`)

    await user.selectOptions(monthSelect(main), "2024-09")
    await expectResults(main, `2 vuelos en ${TAB.history}, Septiembre 2024`)
  })
})
