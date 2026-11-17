import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec certificaciones-tripulante: cabecera (CE-01), resumen por estado (CE-02), lista de
// licencias (CE-05), contenido de cada licencia (CE-06) y tarjetas T1–T3 (CE-12),
// con los datos simulados reales y «hoy» = 10 Nov 2026, 15:00 hora local.

// La ruta puede pasar a lazy (CE-14): la primera espera lleva margen.
const LAZY = { timeout: 3000 }
const TODAY = new Date(2026, 10, 10, 15, 0)

const H1 = "Certificaciones y Licencias"
const OVERLINE = "Auditoría RAC / DGAC • Expediente de Vuelo"
const DESCRIPTION =
  "Registro oficial de aptitud técnica y médica auditado por la Aeronáutica Civil (Aerocivil / RAC). Consulta oficial de solo lectura."

const SUMMARY = [
  {
    title: "Vigente / Al día",
    count: 4,
    note: "Aptos para despacho inmediato",
  },
  {
    title: "Próximo a vencer (<60 días)",
    count: 1,
    note: "Evaluación Médica Clase 1",
  },
  {
    title: "Vencido / No apto",
    count: 0,
    note: "Sin suspensiones reglamentarias",
  },
] as const

const SUMMARY_TITLES = SUMMARY.map(({ title }) => title)

const CARDS = [
  {
    title: "Sincronización RAC en Tiempo Real",
    texts: [
      "API Aerocivil conectada",
      "En línea",
      "Las horas de vuelo, calificaciones y chequeos médicos se concilian automáticamente con la base de datos central de la Dirección General de Aviación Civil.",
      "Última comprobación: Hoy, 06:15 COT",
      "Hash: #RAC-88192-OK",
    ],
  },
  {
    title: "Simulador A320 FFS Nivel D",
    texts: [
      "Calendario de recurrentes",
      "Tu próximo entrenamiento en simulador de vuelo completo para la renovación anual está agendado en el centro de instrucción Bogotá.",
      "08 Jul 2027 al 11 Jul 2027",
      "Simulador 3 • Instructor Cap. R. Morales",
    ],
  },
  {
    title: "Jefatura de Instrucción y Entrenamiento Aerocivil",
    texts: [
      "Soporte y Trámites",
      "Para renovaciones de certificados o actualización de bitácora, comunícate con instrucción:",
      "instruccion@aircrew.aero",
      "Ext. 4022 • Operaciones Base SKBO",
    ],
  },
] as const

const CARD_TITLES = CARDS.map(({ title }) => title)

// Tabla «Datos de las licencias» con los resultados de D3 para hoy = 10 Nov 2026.
// `sequence` va en el orden del DOM de I: nombre, código, organismo, alcance, fecha, línea de
// días, insignia, observación y texto visible del botón.
const LICENSES = [
  {
    name: "Licencia ATP (Airline Transport Pilot)",
    sequence: [
      "LIC-ATP #2287-CO",
      "Aeronáutica Civil de Colombia",
      "Mando Multimotor Línea Aérea",
      "28 Nov 2028",
      "749 días restantes",
      "Vigente",
      "Conforme RAC 61",
      "Ver certificado",
    ],
  },
  {
    name: "Evaluación Médica Clase 1",
    sequence: [
      "CEMAE-BOG #774-MED",
      "Medicina Aeroespacial CEMAE",
      "Centro Médico Aeronáutico Bogotá",
      "15 Dic 2026",
      "Restan 35 días",
      "Próximo vencimiento",
      "Turno agendado: 12 Nov 2026",
      "08:30 COT • CEMAE",
      "Aeropuerto El Dorado",
      "Ver cita agendada",
    ],
  },
  {
    name: "Type Rating A320 Family",
    sequence: [
      "A319 / A320 / A321 Neo & Ceo",
      "Recurrente Nivel D (FFS)",
      "CAE Aviation Training Center",
      "04 Sep 2027",
      "298 días restantes",
      "Vigente",
      "Conforme entrenamiento anual",
      "Ver certificado",
    ],
  },
  {
    name: "ICAO English Level 6",
    sequence: [
      "TEA Test #9921-EXP",
      "Nivel Experto Operacional",
      "International Civil Aviation Org.",
      "Permanente",
      "No expira",
      "Vitalicio",
      "Certificación OACI verificada",
      "Ver certificado",
    ],
  },
  {
    name: "CAT IIIb Autoland & LVP",
    sequence: [
      "Certificación DH < 50ft / RVR 75m",
      "Operaciones de Baja Visibilidad",
      "Procedimientos Especiales RAC 121",
      "27 Ene 2027",
      "78 días restantes",
      "Vigente",
      "Simulador certificado",
      "Ver certificado",
    ],
  },
] as const

const LICENSE_NAMES = LICENSES.map(({ name }) => name)

const FIELD_LABELS = ["Organismo:", "Vencimiento:", "Estado:", "Observación:"]

const COLUMN_HEADERS = [
  "Certificación / Licencia",
  "Organismo / Alcance",
  "Fecha de vencimiento",
  "Estado RAC",
  "Observación operacional",
  "Acción",
]

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// «{n} Certificados» o «1 Certificado», sin confundir «1 Certificado» con «1 Certificados»
// ni «4» con «14».
const countPattern = (count: number) =>
  count === 1
    ? /(^|\D)1 Certificado(?!s)/
    : new RegExp(`(^|\\D)${count} Certificados`)

const isLoading = (element: HTMLElement) =>
  /^cargando/i.test(normalize(element.textContent))

// Los elementos más internos del contenedor cuyo texto completo (normalizado) es `text`,
// aunque el texto esté repartido en varios <span>.
const innermostWithFullText = (container: Element, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  return matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
}

const getByFullText = (container: Element, text: string) => {
  const innermost = innermostWithFullText(container, text)
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

// La tarjeta de un h2: su ancestro más amplio que no contiene el h2 de otra tarjeta del grupo.
// No depende de la etiqueta (article, section, div) que use la implementación.
const cardOf = (main: HTMLElement, title: string, group: readonly string[]) => {
  const heading = within(main).getByRole("heading", { level: 2, name: title })
  const others = group
    .filter((other) => other !== title)
    .map((other) =>
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

const licensesList = (main: HTMLElement) =>
  within(main).getByRole("list", { name: "Licencias" })

const licenseArticle = (main: HTMLElement, name: string) => {
  const article = within(main)
    .getByRole("heading", { level: 3, name })
    .closest("article")
  expect(
    article,
    `«${name}» debe ser un <article> con su nombre en el h3`
  ).not.toBeNull()
  return article as HTMLElement
}

// Espera a que carguen la lista, el resumen y T2.
const findLoadedPage = async () => {
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  const main = screen.getByRole("main")
  await waitFor(() =>
    expect(within(licensesList(main)).getAllByRole("article")).toHaveLength(5)
  )
  await waitFor(() =>
    expect(within(main).queryAllByRole("status").filter(isLoading)).toEqual([])
  )
  await waitFor(() => expect(main).toHaveTextContent(CARDS[1].title))
  return main
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
// D3: solo se falsea Date; setTimeout y setInterval siguen reales para Query y waitFor.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Certificaciones: cabecera (CE-01)", () => {
  it("CE-01: con el rol de tripulante se ven el h1 «Certificaciones y Licencias», el antetítulo y la descripción", async () => {
    renderRoute(PATHS.tripulante.certificaciones)

    const h1 = await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const main = screen.getByRole("main")
    expect(main.contains(h1)).toBe(true)
    getByFullText(main, OVERLINE)
    getByFullText(main, DESCRIPTION)
  })

  it("Página (contrato): los h2 van en el orden C, R, L y T1–T3", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    const names = within(main)
      .getAllByRole("heading", { level: 2 })
      .map((heading) => normalize(heading.textContent))
    expect(names).toEqual([
      ...SUMMARY_TITLES,
      "Licencias del expediente",
      ...CARD_TITLES,
    ])
  })
})

describe("Certificaciones: resumen por estado (CE-02)", () => {
  it.each(SUMMARY)(
    "CE-02: la tarjeta «$title» muestra $count certificado(s) y «$note»",
    async ({ title, count, note }) => {
      renderRoute(PATHS.tripulante.certificaciones)
      const main = await findLoadedPage()

      const card = cardOf(main, title, SUMMARY_TITLES)
      const text = normalize(card.textContent)
      expect(text, `«${title}» cuenta ${count}`).toMatch(countPattern(count))
      expect(text).toContain(note)
    }
  )

  it("CE-02: «Próximo a vencer (<60 días)» no muestra «Sin vencimientos en los próximos 60 días» y «Vencido / No apto» no nombra ninguna licencia", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    expect(
      cardOf(main, "Próximo a vencer (<60 días)", SUMMARY_TITLES)
    ).not.toHaveTextContent("Sin vencimientos en los próximos 60 días")
    const expired = cardOf(main, "Vencido / No apto", SUMMARY_TITLES)
    for (const name of LICENSE_NAMES) {
      expect(expired).not.toHaveTextContent(name)
    }
  })
})

describe("Certificaciones: lista de licencias (CE-05)", () => {
  it("CE-05: se ve «5 licencias cargadas en expediente digital (SKBO Base)» y la etiqueta «RAC 121»", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    getByFullText(
      main,
      "5 licencias cargadas en expediente digital (SKBO Base)"
    )
    getByFullText(main, "RAC 121")
  })

  it("CE-05: la lista <ul> «Licencias» tiene 5 <li> con un <article> cada uno y los h3 en el orden de la tabla", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    const list = licensesList(main)
    expect(list.tagName).toBe("UL")
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(5)
    for (const item of items) {
      expect(within(item).getAllByRole("article")).toHaveLength(1)
    }
    const names = within(list)
      .getAllByRole("article")
      .map((article) =>
        normalize(
          within(article).getByRole("heading", { level: 3 }).textContent
        )
      )
    expect(names).toEqual(LICENSE_NAMES)
  })

  it("L (contrato): la sección lleva el h2 sr-only «Licencias del expediente» y no usa <table>", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    expect(
      within(main).getByRole("heading", {
        level: 2,
        name: "Licencias del expediente",
      })
    ).toHaveClass("sr-only")
    expect(main.querySelector("table")).toBeNull()
  })

  it("L (contrato): la fila de encabezados de columna es visual, con aria-hidden=true", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    for (const header of COLUMN_HEADERS) {
      const element = getByFullText(main, header)
      expect(
        element.closest('[aria-hidden="true"]'),
        `«${header}» va dentro de un aria-hidden`
      ).not.toBeNull()
    }
  })
})

describe("Certificaciones: contenido de cada licencia (CE-06)", () => {
  it.each(LICENSES)(
    "CE-06: «$name» muestra código, organismo, alcance, fecha, línea de días, insignia, observación y botón, en ese orden",
    async ({ name, sequence }) => {
      renderRoute(PATHS.tripulante.certificaciones)
      const main = await findLoadedPage()

      const text = normalize(licenseArticle(main, name).textContent)
      let previous = text.indexOf(name)
      expect(
        previous,
        `el article contiene su nombre «${name}»`
      ).toBeGreaterThan(-1)
      for (const part of sequence) {
        const index = text.indexOf(part, previous)
        expect(
          index,
          `«${part}» aparece después de lo anterior`
        ).toBeGreaterThan(previous)
        previous = index
      }
      expect(text).not.toContain("null")
    }
  )

  it.each(LICENSE_NAMES)(
    "I (contrato): «%s» lleva las etiquetas «Organismo:», «Vencimiento:», «Estado:» y «Observación:»",
    async (name) => {
      renderRoute(PATHS.tripulante.certificaciones)
      const main = await findLoadedPage()

      const article = licenseArticle(main, name)
      for (const label of FIELD_LABELS) {
        expect(article, label).toHaveTextContent(label)
      }
    }
  )

  it("CE-06: ICAO English Level 6 no muestra días ni la palabra «Vence»", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    const text = normalize(
      licenseArticle(main, "ICAO English Level 6").textContent
    )
    expect(text).not.toMatch(/\d+ días?/)
    expect(text).not.toContain("Vence hoy")
    expect(text).not.toContain("Vencido")
  })

  it("CE-06: la observación de la médica son las tres líneas del turno, sin texto de observación propio", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    const article = licenseArticle(main, "Evaluación Médica Clase 1")
    getByFullText(article, "Turno agendado: 12 Nov 2026")
    getByFullText(article, "08:30 COT • CEMAE")
    getByFullText(article, "Aeropuerto El Dorado")
    for (const other of [
      "Conforme RAC 61",
      "Conforme entrenamiento anual",
      "Certificación OACI verificada",
      "Simulador certificado",
    ]) {
      expect(article).not.toHaveTextContent(other)
    }
  })
})

describe("Certificaciones: tarjetas T1, T2 y T3 (CE-12)", () => {
  it.each(CARDS)(
    "CE-12: la tarjeta «$title» muestra su h2 y sus textos",
    async ({ title, texts }) => {
      renderRoute(PATHS.tripulante.certificaciones)
      const main = await findLoadedPage()

      const card = cardOf(main, title, CARD_TITLES)
      for (const text of texts) {
        expect(card, text).toHaveTextContent(text)
      }
    }
  )

  it("CE-12: T3 tiene un enlace «instruccion@aircrew.aero» a mailto:instruccion@aircrew.aero y la extensión no es un enlace", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    const card = cardOf(main, CARDS[2].title, CARD_TITLES)
    expect(
      within(card).getByRole("link", { name: "instruccion@aircrew.aero" })
    ).toHaveAttribute("href", "mailto:instruccion@aircrew.aero")
    expect(within(card).getAllByRole("link")).toHaveLength(1)
    const extension = getByFullText(card, "Ext. 4022 • Operaciones Base SKBO")
    expect(extension.closest("a")).toBeNull()
  })
})

describe("Certificaciones: correcciones de la auditoría de accesibilidad", () => {
  it.each([
    {
      title: "Sincronización RAC en Tiempo Real",
      after: ["API Aerocivil conectada", "En línea"],
    },
    {
      title: "Simulador A320 FFS Nivel D",
      after: ["Calendario de recurrentes"],
    },
    {
      title: "Jefatura de Instrucción y Entrenamiento Aerocivil",
      after: ["Soporte y Trámites"],
    },
  ])(
    "A11Y-CER-1: en la tarjeta «$title» el antetítulo va después del h2 en el DOM",
    async ({ title, after }) => {
      renderRoute(PATHS.tripulante.certificaciones)
      const main = await findLoadedPage()

      const heading = within(main).getByRole("heading", {
        level: 2,
        name: title,
      })
      const card = cardOf(main, title, CARD_TITLES)
      for (const text of after) {
        const element = getByFullText(card, text)
        expect(
          heading.compareDocumentPosition(element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          `«${text}» va después del h2`
        ).toBeTruthy()
      }
    }
  )

  it("A11Y-CER-2: el alcance tiene su etiqueta y la fecha se separa de la línea de días", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    const article = licenseArticle(
      main,
      "Licencia ATP (Airline Transport Pilot)"
    )
    expect(article).toHaveTextContent("Alcance: Mando Multimotor Línea Aérea")
    expect(article).toHaveTextContent("28 Nov 2028, 749 días restantes")
  })

  it("A11Y-CER-3: la lista «Licencias» lleva role=list explícito (Safari quita la semántica con list-style: none)", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedPage()

    expect(licensesList(main)).toHaveAttribute("role", "list")
  })
})
