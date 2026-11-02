import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec mis-vuelos, «Cambio pedido por el usuario (2026-11-02)»: «Ver más detalle» ya no abre
// un diálogo y despliega el detalle dentro del article, debajo de la barra inferior (MV-11 nuevo).

// Hoy la ruta no es lazy, pero puede pasar a serlo (MV-13): la primera espera lleva margen.
const LAZY = { timeout: 3000 }

const HISTORY_TAB = "Historial de Vuelos Anteriores 4"

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Texto que llega al lector: omite lo que va con aria-hidden (o hidden) e incluye los sr-only.
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

const spokenText = (element: Element) => normalize(readableText(element))

// Lo que se ve: el texto sin los sr-only que añade SpokenText para el lector.
const visibleText = (element: Element) => {
  const clone = element.cloneNode(true) as Element
  for (const srOnly of clone.querySelectorAll(".sr-only")) srOnly.remove()
  return normalize(clone.textContent)
}

// Los elementos más internos del contenedor cuyo texto incluye `text`.
const innermostWith = (container: Element, text: string) => {
  const matches = Array.from(container.querySelectorAll("*")).filter(
    (element) => normalize(element.textContent).includes(text)
  )
  return matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
}

const AV_9344_DETAILS = [
  ["Jefe de Cabina", "Mariana Santos + 3 TCPs"],
  ["Ruta Plan", "W19 / MNX / DCT / SKBO-KMIA"],
  ["METAR SKBO", "12008KT 9999 FEW018 17/11 Q1024"],
  ["Descanso Post-Vuelo", "18h en KMIA · Retorno AV-9345 día siguiente"],
]

const OTHER_UPCOMING = [
  {
    number: "AV-8520",
    captain: "Comandante: Cpt. Mauricio Restrepo",
    details: [
      ["Jefe de Cabina", "Andrea Ruiz + 3 TCPs"],
      ["Ruta Plan", "UL780 / SKCL"],
      ["Retorno Asignado", "AV-8521 (CLO-BOG) · 10:05 UTC"],
    ],
  },
  {
    number: "AV-9210",
    captain: "Comandante: Por Asignar",
    details: [
      ["Jefe de Cabina", "Por asignar"],
      ["Nivel de Vuelo", "FL240 (estimado)"],
      ["Despacho", "Disponible T-12h"],
    ],
  },
]

// Etiquetas de datos que ya muestra la tarjeta: el detalle no los repite.
const CARD_LABELS = [
  "Fecha y Salida",
  "Equipo",
  "Rol Asignado",
  "Terminal / Puerta",
  "Estado Check-in",
  "Despacho de Vuelo",
  "Bloque Real",
  "Estado de despacho",
  "Comandante",
]

const flightArticle = (flightNumber: string) => {
  const article = screen
    .getByRole("heading", { level: 2, name: flightNumber })
    .closest("article")
  expect(
    article,
    `el vuelo ${flightNumber} debe ser un <article> con su número en el h2`
  ).not.toBeNull()
  return article as HTMLElement
}

const showButton = (flightNumber: string) =>
  within(flightArticle(flightNumber)).getByRole("button", {
    name: `Ver más detalle del vuelo ${flightNumber}`,
  })

const hideButton = (flightNumber: string) =>
  within(flightArticle(flightNumber)).getByRole("button", {
    name: `Ocultar detalle del vuelo ${flightNumber}`,
  })

// La sección de detalle es la que señala aria-controls del botón, y va dentro del article.
const detailSection = (flightNumber: string) => {
  const button = hideButton(flightNumber)
  const id = button.getAttribute("aria-controls")
  expect(id, "el botón abierto lleva aria-controls").toBeTruthy()
  const section = document.getElementById(id ?? "")
  expect(section, `aria-controls="${id}" apunta a un elemento`).not.toBeNull()
  expect(
    flightArticle(flightNumber).contains(section),
    "la sección de detalle va dentro del article"
  ).toBe(true)
  return section as HTMLElement
}

// El <dl> de la sección: la propia sección o el único <dl> que contiene.
const detailList = (section: HTMLElement) => {
  if (section.tagName === "DL") return section
  const lists = section.querySelectorAll("dl")
  expect(lists, "la sección de detalle tiene un único <dl>").toHaveLength(1)
  return lists[0]
}

const termsOf = (section: HTMLElement) =>
  Array.from(detailList(section).querySelectorAll("dt")).map((term) =>
    normalize(term.textContent)
  )

// El <dd> de un término (<dt>) del detalle. Admite <div> agrupando cada par.
const definitionOf = (section: HTMLElement, term: string) => {
  const terms = Array.from(detailList(section).querySelectorAll("dt")).filter(
    (element) => normalize(element.textContent) === term
  )
  expect(terms, `un único <dt> «${term}» en el detalle`).toHaveLength(1)
  const definition = terms[0].nextElementSibling
  expect(definition?.tagName, `«${term}» debe ir seguido de su <dd>`).toBe("DD")
  return definition as HTMLElement
}

const expectDetails = (section: HTMLElement, details: string[][]) => {
  expect(termsOf(section)).toEqual(details.map(([term]) => term))
  for (const [term, value] of details) {
    expect(visibleText(definitionOf(section, term)), term).toBe(value)
  }
}

// Espera a que la lista de Próximos esté cargada (aparece el botón de AV-9344).
const findLoaded = async () => {
  await screen.findByRole(
    "button",
    { name: "Ver más detalle del vuelo AV-9344" },
    LAZY
  )
}

const openHistory = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("tab", { name: HISTORY_TAB }))
  await screen.findByRole("button", {
    name: "Ver más detalle del vuelo AV-9102",
  })
}

// Pulsa el botón de despliegue. El detalle va en la tarjeta: nunca aparece un dialog
// (si apareciera, el resto de la página quedaría oculto al lector y fallaría lo demás).
const toggleDetail = async (
  user: ReturnType<typeof userEvent.setup>,
  button: HTMLElement
) => {
  await user.click(button)
  expect(
    screen.queryByRole("dialog"),
    "«Ver más detalle» no abre ningún dialog"
  ).toBeNull()
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

describe("Mis Vuelos: detalle desplegable en la tarjeta (MV-11)", () => {
  it("MV-11 (contrato): todas las tarjetas empiezan cerradas, con «Ver más detalle» visible y aria-expanded=false", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    for (const number of ["AV-9344", "AV-8520", "AV-9210"]) {
      const button = showButton(number)
      expect(button).toHaveAttribute("aria-expanded", "false")
      expect(normalize(button.textContent)).toBe("Ver más detalle")
    }

    await openHistory(user)
    for (const number of ["AV-9102", "AV-9101", "AV-8517", "AV-8516"]) {
      expect(showButton(number)).toHaveAttribute("aria-expanded", "false")
    }
  })

  it("MV-11: al pulsar «Ver más detalle del vuelo AV-9344» el botón pasa a aria-expanded=true, se llama «Ocultar detalle del vuelo AV-9344», muestra «Ocultar detalle» y conserva el foco", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    const button = showButton("AV-9344")
    await toggleDetail(user, button)

    expect(hideButton("AV-9344")).toBe(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(normalize(button.textContent)).toBe("Ocultar detalle")
    expect(button).toHaveFocus()
  })

  it("MV-11: abierto, el article de AV-9344 muestra sus 4 details (Jefe de Cabina, Ruta Plan, METAR SKBO, Descanso Post-Vuelo) en un <dl> que no repite los datos de la tarjeta", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    await toggleDetail(user, showButton("AV-9344"))

    const section = detailSection("AV-9344")
    expectDetails(section, AV_9344_DETAILS)
    for (const label of CARD_LABELS) {
      expect(termsOf(section), `el detalle no repite «${label}»`).not.toContain(
        label
      )
    }
  })

  it("MV-11 (contrato): el detalle de AV-9344 va debajo de la barra inferior (despacho, comandante y texto de la derecha) y del botón", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    await toggleDetail(user, showButton("AV-9344"))

    const article = flightArticle("AV-9344")
    const section = detailSection("AV-9344")
    const above = [
      ...innermostWith(article, "Despacho Autorizado (BOG OCC)"),
      ...innermostWith(article, "Comandante: Cpt. Hernán Morales"),
      ...innermostWith(article, "Tiempo para Presentación"),
      hideButton("AV-9344"),
    ]
    expect(above.length).toBeGreaterThan(3)
    for (const element of above) {
      expect(
        section.contains(element),
        "la barra inferior no va dentro del detalle"
      ).toBe(false)
      expect(
        element.compareDocumentPosition(section) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        `el detalle va después de «${normalize(element.textContent)}»`
      ).toBeTruthy()
    }
  })

  it("MV-11: con el detalle de AV-9344 abierto no hay ningún role=dialog en el documento y AV-8520 sigue cerrada", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    await toggleDetail(user, showButton("AV-9344"))

    expect(hideButton("AV-9344")).toHaveAttribute("aria-expanded", "true")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(showButton("AV-8520")).toHaveAttribute("aria-expanded", "false")
    expect(flightArticle("AV-8520")).not.toHaveTextContent(
      "Andrea Ruiz + 3 TCPs"
    )
  })

  it("MV-11: al pulsar otra vez, el detalle de AV-9344 desaparece y el botón vuelve a «Ver más detalle del vuelo AV-9344» con aria-expanded=false", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    await toggleDetail(user, showButton("AV-9344"))
    const id = detailSection("AV-9344").id
    await toggleDetail(user, hideButton("AV-9344"))

    const button = showButton("AV-9344")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(normalize(button.textContent)).toBe("Ver más detalle")
    expect(button).toHaveFocus()
    expect(
      document.getElementById(id),
      "la sección se desmonta al cerrar"
    ).toBeNull()
    expect(flightArticle("AV-9344")).not.toHaveTextContent(
      "Mariana Santos + 3 TCPs"
    )
  })

  it("MV-11 (contrato): cada tarjeta se despliega por separado; abrir AV-8520 no cierra AV-9344", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    await toggleDetail(user, showButton("AV-9344"))
    await toggleDetail(user, showButton("AV-8520"))

    expect(hideButton("AV-9344")).toHaveAttribute("aria-expanded", "true")
    expect(hideButton("AV-8520")).toHaveAttribute("aria-expanded", "true")
    expectDetails(detailSection("AV-9344"), AV_9344_DETAILS)
    expect(showButton("AV-9210")).toHaveAttribute("aria-expanded", "false")
  })

  it.each(OTHER_UPCOMING)(
    "MV-11: abierto, el article de $number muestra sus details debajo de su barra inferior",
    async ({ number, captain, details }) => {
      const user = userEvent.setup()
      renderRoute(PATHS.tripulante.misVuelos)
      await findLoaded()

      await toggleDetail(user, showButton(number))

      const section = detailSection(number)
      expectDetails(section, details)
      const bar = innermostWith(flightArticle(number), captain)
      expect(bar.length).toBeGreaterThan(0)
      for (const element of bar) {
        expect(
          element.compareDocumentPosition(section) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
      }
    }
  )

  it("MV-11: en el historial, el detalle de AV-9102 muestra «Jefe de Cabina» y «Combustible Usado», sin repetir los datos de la tarjeta", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()
    await openHistory(user)

    await toggleDetail(user, showButton("AV-9102"))

    expect(hideButton("AV-9102")).toHaveAttribute("aria-expanded", "true")
    expect(screen.queryByRole("dialog")).toBeNull()
    const section = detailSection("AV-9102")
    for (const term of ["Jefe de Cabina", "Combustible Usado"]) {
      expect(visibleText(definitionOf(section, term)), term).not.toBe("")
    }
    for (const label of CARD_LABELS) {
      expect(termsOf(section), `el detalle no repite «${label}»`).not.toContain(
        label
      )
    }
  })
})

describe("Mis Vuelos: accesibilidad del detalle desplegado (A11Y-MV-4)", () => {
  it("A11Y-MV-4: el «Combustible Usado» del historial (AV-9102) usa punto de miles", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()
    await openHistory(user)

    await toggleDetail(user, showButton("AV-9102"))

    expect(
      visibleText(definitionOf(detailSection("AV-9102"), "Combustible Usado"))
    ).toMatch(/^\d{1,3}(\.\d{3})* kg$/)
  })

  it("A11Y-MV-4: abierto AV-9344, «Descanso Post-Vuelo» se lee «18 horas en KMIA · Retorno AV-9345 día siguiente» y «18h en KMIA» visual va con aria-hidden", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    await findLoaded()

    await toggleDetail(user, showButton("AV-9344"))

    const value = definitionOf(detailSection("AV-9344"), "Descanso Post-Vuelo")
    expect(spokenText(value)).toBe(
      "18 horas en KMIA · Retorno AV-9345 día siguiente"
    )
    const visual = innermostWith(value, "18h en KMIA")
    expect(visual.length, "debe verse «18h en KMIA»").toBeGreaterThan(0)
    for (const element of visual) {
      expect(
        element.closest('[aria-hidden="true"]'),
        "«18h en KMIA» debe ir con aria-hidden"
      ).not.toBeNull()
    }
  })
})
