import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec mis-vuelos: cabecera (MV-01), métricas (MV-02), pestaña inicial y tarjetas de los
// próximos vuelos (MV-04, MV-05) y botón de filtros (MV-10), con los datos simulados reales.

// Hoy la ruta no es lazy, pero puede pasar a serlo (MV-13): la primera espera lleva margen.
const LAZY = { timeout: 3000 }

const H1 = "Mis Vuelos Asignados"
const OVERLINE = "Roster Operativo • Itinerario Mensual"
const DESCRIPTION =
  "Gestión de itinerarios, vuelos programados y seguimiento de horas reglamentarias FDP (RAC 121)."

const METRIC_TITLES = [
  "Límite Mensual FDP",
  "Descanso Reglamentario",
  "Vuelos este Mes",
] as const

const STATUS_LABELS = [
  "Reemplazo Aceptado",
  "Programado Roster",
  "Completado",
] as const

// Columnas de la tabla «Próximos vuelos» de la spec. `route` va en orden: origen y luego destino.
const UPCOMING = [
  {
    number: "AV-9344",
    status: "Reemplazo Aceptado",
    route: ["BOG", "Bogotá, SKBO", "3h 55m", "Directo", "MIA", "Miami, KMIA"],
    texts: [
      "Fecha y Salida",
      "Hoy, 16:15 UTC",
      "11:15 Local",
      "Equipo",
      "Airbus A320neo",
      "HK-5388",
      "Rol Asignado",
      "Primer Oficial",
      "Copiloto",
      "Terminal / Puerta",
      "T1 • Puerta B12",
      "Abordaje 15:35",
      "Despacho Autorizado (BOG OCC)",
      "Comandante: Cpt. Hernán Morales",
      // A11Y-MV-4: punto de miles.
      "Combustible Plan: 9.420 kg",
      "Tiempo para Presentación: 0h 45m",
    ],
  },
  {
    number: "AV-8520",
    status: "Programado Roster",
    route: ["BOG", "Bogotá, SKBO", "0h 58m", "Nacional", "CLO", "Cali, SKCL"],
    texts: [
      "Fecha y Salida",
      "Dom 20 Oct, 07:15 UTC",
      "02:15 Local",
      "Equipo",
      "Airbus A320",
      "Matrícula TBD",
      "Rol Asignado",
      "Primer Oficial",
      "Copiloto",
      "Estado Check-in",
      "En 41h",
      "Abre Sáb 07:15",
      "Itinerario Confirmado RAC 121",
      "Comandante: Cpt. Mauricio Restrepo",
      "Retorno asignado: AV-8521 (CLO-BOG)",
      "Roster Ciclo W42",
    ],
  },
  {
    number: "AV-9210",
    status: "Programado Roster",
    route: [
      "BOG",
      "Bogotá, SKBO",
      "0h 50m",
      "Nacional",
      "MDE",
      "Medellín, SKRG",
    ],
    texts: [
      "Fecha y Salida",
      "Mar 22 Oct, 14:30 UTC",
      "09:30 Local",
      "Equipo",
      "Airbus A320",
      "Matrícula TBD",
      "Rol Asignado",
      "Primer Oficial",
      "Copiloto",
      "Despacho de Vuelo",
      "Pendiente despacho",
      "Disponible T-12h",
      "Plan Preliminar Generado",
      "Comandante: Por Asignar",
      "Nivel de Vuelo crucero estimado: FL240",
      "Roster Ciclo W42",
    ],
  },
]

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(normalize(element.textContent)))

// La tarjeta de una métrica: el ancestro más amplio de su h2 que no contiene el h2 de otra.
// No depende de la etiqueta (article, section, div) que use la implementación.
const metricCard = (main: HTMLElement, title: string) => {
  const heading = within(main).getByRole("heading", { level: 2, name: title })
  const others = METRIC_TITLES.filter((other) => other !== title).map((other) =>
    within(main).getByRole("heading", { level: 2, name: other })
  )
  let card: HTMLElement = heading
  while (
    card.parentElement &&
    card.parentElement !== main &&
    !others.some((other) => card.parentElement?.contains(other))
  ) {
    card = card.parentElement
  }
  return card
}

const flightArticle = (container: HTMLElement, flightNumber: string) => {
  const heading = within(container).getByRole("heading", {
    level: 2,
    name: flightNumber,
  })
  const article = heading.closest("article")
  expect(
    article,
    `el vuelo ${flightNumber} debe ser un <article> con su número en el h2`
  ).not.toBeNull()
  return article as HTMLElement
}

// Texto que llega al lector: omite lo que va con aria-hidden (o hidden) e incluye los sr-only.
// Separa con un espacio el contenido de cada elemento, como el lector al recorrerlos.
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

// A11Y-MV-4: la versión visual (`text`, p. ej. «3h 55m») se sigue viendo, pero va con
// aria-hidden y el lector no la recibe. Vale tanto si SpokenText envuelve solo la cifra
// como la frase entera: se miran los elementos más internos que contienen `text`.
const expectVisualOnly = (container: HTMLElement, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent).includes(text))
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost.length, `debe verse «${text}»`).toBeGreaterThan(0)
  for (const element of innermost) {
    expect(
      element.closest('[aria-hidden="true"]'),
      `«${text}» debe ir con aria-hidden`
    ).not.toBeNull()
  }
  expect(spokenText(container)).not.toContain(text)
}

const flightNumbersIn = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 2 }).textContent)
    )

// Espera a que la pantalla tenga las métricas y la lista de Próximos ya cargadas.
const findLoadedMain = async () => {
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  const main = screen.getByRole("main")
  await waitFor(() => expect(main).toHaveTextContent("45h 00m"))
  await waitFor(() =>
    expect(within(main).getAllByRole("article").length).toBeGreaterThan(0)
  )
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return main
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

describe("Mis Vuelos: cabecera (MV-01)", () => {
  it("MV-01: con el rol de tripulante se ven el h1 «Mis Vuelos Asignados», el antetítulo y la descripción", async () => {
    renderRoute(PATHS.tripulante.misVuelos)

    const h1 = await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const main = screen.getByRole("main")
    expect(main).toContainElement(h1)
    expect(main).toHaveTextContent(OVERLINE)
    expect(main).toHaveTextContent(DESCRIPTION)
  })
})

describe("Mis Vuelos: métricas del mes (MV-02)", () => {
  it("MV-02: las tres métricas tienen su título como h2", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    for (const title of METRIC_TITLES) {
      expect(
        within(main).getByRole("heading", { level: 2, name: title })
      ).toBeInTheDocument()
    }
  })

  it("MV-02: «Límite Mensual FDP» muestra sus textos y un meter «Consumo FDP mensual» con 45, 0 y 90", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const card = metricCard(main, "Límite Mensual FDP")

    for (const text of [
      "RAC 121.465",
      "45h 00m",
      "/ 90h máx legal",
      "+45h de margen disponible seguro",
      "Acumulado: 50%",
      "Ciclo cierra en 12 días",
    ]) {
      expect(card).toHaveTextContent(text)
    }

    const meter = within(card).getByRole("meter", {
      name: "Consumo FDP mensual",
    })
    expect(meter).toHaveAttribute("aria-valuenow", "45")
    expect(meter).toHaveAttribute("aria-valuemin", "0")
    expect(meter).toHaveAttribute("aria-valuemax", "90")
  })

  it("MV-02: «Descanso Reglamentario» muestra el estado, las horas garantizadas, la nota y el fin del descanso", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const card = metricCard(main, "Descanso Reglamentario")

    for (const text of [
      "Conforme",
      "16h 20m",
      "garantizadas",
      "Mínimo legal de 12h cumplido ampliamente tras AV-9102",
      "Fin de descanso en base:",
      "Hoy, 14:15 UTC (Presentación)",
    ]) {
      expect(card).toHaveTextContent(text)
    }
  })

  it("MV-02: «Vuelos este Mes» muestra el mes, los sectores, las demoras y los recuadros nacional e internacional", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const card = metricCard(main, "Vuelos este Mes")

    for (const text of [
      // Acotado a la tarjeta: «Octubre 2024 (Actual)» también es una opción del selector de mes.
      "Octubre 2024",
      "18",
      "sectores completados",
      "0 demoras operacionales atribuibles a tripulación",
      "14 Nac.",
      "Domésticos",
      "4 Int.",
      "Troncales MIA/LIM",
    ]) {
      expect(card).toHaveTextContent(text)
    }
    expect(within(card).queryByRole("combobox")).toBeNull()
  })
})

describe("Mis Vuelos: pestañas y próximos vuelos (MV-04, MV-05)", () => {
  it("MV-04: hay un tablist con las pestañas «Próximos Vuelos 3» (seleccionada) e «Historial de Vuelos Anteriores 4», y el tabpanel muestra 3 article en orden AV-9344, AV-8520, AV-9210", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    const tablist = within(main).getByRole("tablist")
    const tabs = within(tablist).getAllByRole("tab")
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveAccessibleName("Próximos Vuelos 3")
    expect(tabs[1]).toHaveAccessibleName("Historial de Vuelos Anteriores 4")
    expect(tabs[0]).toHaveAttribute("aria-selected", "true")
    expect(tabs[1]).toHaveAttribute("aria-selected", "false")

    const panels = within(main).getAllByRole("tabpanel")
    expect(panels, "un único tabpanel visible").toHaveLength(1)
    expect(within(panels[0]).getAllByRole("article")).toHaveLength(3)
    expect(flightNumbersIn(panels[0])).toEqual([
      "AV-9344",
      "AV-8520",
      "AV-9210",
    ])
  })

  it.each(UPCOMING)(
    "MV-05: la tarjeta de $number muestra la etiqueta «$status», la ruta en orden y los textos de su columna",
    async ({ number, status, route, texts }) => {
      renderRoute(PATHS.tripulante.misVuelos)
      const main = await findLoadedMain()
      const article = flightArticle(within(main).getByRole("tabpanel"), number)

      expect(article).toHaveTextContent(status)
      for (const other of STATUS_LABELS.filter((label) => label !== status)) {
        expect(article).not.toHaveTextContent(other)
      }

      // Origen, duración y tipo, y destino, en ese orden de lectura.
      const text = normalize(article.textContent)
      const positions = route.map((fragment) => text.indexOf(fragment))
      for (const [index, fragment] of route.entries()) {
        expect(positions[index], `debe verse «${fragment}»`).toBeGreaterThan(-1)
      }
      expect(positions, `la ruta de ${number} va de origen a destino`).toEqual(
        [...positions].sort((a, b) => a - b)
      )

      for (const fragment of texts) {
        expect(article).toHaveTextContent(fragment)
      }
    }
  )

  it.each(UPCOMING)(
    "MV-05: la tarjeta de $number tiene el botón «Ver más detalle» con el nombre «Ver más detalle del vuelo $number»",
    async ({ number }) => {
      renderRoute(PATHS.tripulante.misVuelos)
      const main = await findLoadedMain()
      const article = flightArticle(main, number)

      const button = within(article).getByRole("button", {
        name: `Ver más detalle del vuelo ${number}`,
      })
      expect(button).toHaveTextContent("Ver más detalle")
    }
  )
})

describe("Mis Vuelos: botón de filtros (MV-10)", () => {
  it("MV-10: «Filtrar por aeronave, próximamente» tiene aria-disabled=true y al pulsarlo no aparece ningún diálogo", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    const filters = within(main).getByRole("button", {
      name: "Filtrar por aeronave, próximamente",
    })
    expect(filters).toHaveAttribute("aria-disabled", "true")

    await user.click(filters)

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(flightNumbersIn(within(main).getByRole("tabpanel"))).toEqual([
      "AV-9344",
      "AV-8520",
      "AV-9210",
    ])
  })
})

// Correcciones tras las auditorías de la spec (A11Y-MV-1 a A11Y-MV-8). A11Y-MV-6 es solo de clases.
describe("Mis Vuelos: correcciones de accesibilidad de la pantalla", () => {
  it("A11Y-MV-2: el tablist se llama «Vuelos del roster» y contiene las dos pestañas", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    const tablist = within(main).getByRole("tablist", {
      name: "Vuelos del roster",
    })
    expect(within(tablist).getAllByRole("tab")).toHaveLength(2)
  })

  it("A11Y-MV-3: el texto accesible de la tarjeta de AV-9344 contiene «Origen: BOG» y «Destino: MIA»", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const article = flightArticle(main, "AV-9344")

    const spoken = spokenText(article)
    expect(spoken).toContain("Origen: BOG")
    expect(spoken).toContain("Destino: MIA")
  })

  it("A11Y-MV-4: el texto accesible de «Límite Mensual FDP» contiene «45 horas 0 minutos» y «90 horas»; «45h 00m» visual va con aria-hidden", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const card = metricCard(main, "Límite Mensual FDP")

    const spoken = spokenText(card)
    expect(spoken).toContain("45 horas 0 minutos")
    expect(spoken).toContain("90 horas")
    expectVisualOnly(card, "45h 00m")
  })

  it("A11Y-MV-4: el texto accesible de «Descanso Reglamentario» lee «16 horas 20 minutos» y «Mínimo legal de 12 horas»; «16h 20m» visual va con aria-hidden", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const card = metricCard(main, "Descanso Reglamentario")

    const spoken = spokenText(card)
    expect(spoken).toContain("16 horas 20 minutos")
    expect(spoken).toContain("Mínimo legal de 12 horas")
    expectVisualOnly(card, "16h 20m")
  })

  it("A11Y-MV-4: en AV-9344 la duración se lee «3 horas 55 minutos» y el texto de la derecha «Tiempo para Presentación: 0 horas 45 minutos»; lo visual va con aria-hidden", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const article = flightArticle(main, "AV-9344")

    const spoken = spokenText(article)
    expect(spoken).toContain("3 horas 55 minutos")
    expect(spoken).toContain("Tiempo para Presentación: 0 horas 45 minutos")
    expectVisualOnly(article, "3h 55m")
    expectVisualOnly(article, "0h 45m")
  })

  it("A11Y-MV-4: en AV-8520 el estado del check-in se lee «En 41 horas»; «En 41h» visual va con aria-hidden", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()
    const article = flightArticle(main, "AV-8520")

    expect(spokenText(article)).toContain("En 41 horas")
    expectVisualOnly(article, "41h")
  })

  it("A11Y-MV-7: el botón de filtros muestra el texto «Próximamente» y mantiene su aria-label", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    const filters = within(main).getByRole("button", {
      name: "Filtrar por aeronave, próximamente",
    })
    expect(filters).toHaveAttribute(
      "aria-label",
      "Filtrar por aeronave, próximamente"
    )
    expect(within(filters).getByText("Próximamente")).toBeInTheDocument()
  })

  it("A11Y-MV-8: el textContent de la tarjeta de AV-9344 contiene «(BOG OCC) Comandante:» (espacio real entre los <span>)", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    expect(flightArticle(main, "AV-9344")).toHaveTextContent(
      "(BOG OCC) Comandante:"
    )
  })

  it("A11Y-MV-8: el textContent de «Vuelos este Mes» contiene «18 sectores» (espacio real entre los <span>)", async () => {
    renderRoute(PATHS.tripulante.misVuelos)
    const main = await findLoadedMain()

    expect(metricCard(main, "Vuelos este Mes")).toHaveTextContent("18 sectores")
  })
})
