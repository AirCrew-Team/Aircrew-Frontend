import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec certificaciones-tripulante, D1 y D2: el detalle de cada licencia se despliega dentro
// de su article, como en Mis Vuelos (CE-09, CE-10), y «Descargar PDF» no hace nada (CE-11).

// La ruta puede pasar a lazy (CE-14): la primera espera lleva margen.
const LAZY = { timeout: 3000 }
const TODAY = new Date(2026, 10, 10, 15, 0)

const ATP = "Licencia ATP (Airline Transport Pilot)"
const MEDICAL = "Evaluación Médica Clase 1"
const PKI_TEXT =
  "Documento firmado electrónicamente bajo estándar Aerocivil PKI."
const PDF_BUTTON = "Descargar PDF, próximamente"

type Toggle = "certificado" | "cita agendada"

// Tabla «Datos de las licencias»: tipo de botón y `details` de cada licencia.
const LICENSES: {
  name: string
  toggle: Toggle
  details: [string, string][]
}[] = [
  {
    name: ATP,
    toggle: "certificado",
    details: [
      ["Emisor", "UAEAC (Aerocivil)"],
      ["Habilitación", "Operaciones IFR multimotor y comando internacional"],
      ["Bitácora", "Digital sincronizada · 4.820 horas de vuelo total"],
    ],
  },
  {
    name: MEDICAL,
    toggle: "cita agendada",
    details: [
      ["Fecha del turno", "12 Nov 2026 • 08:30 COT"],
      ["Turno", "CEMAE-8891"],
      ["Lugar", "Centro Médico Aeronáutico El Dorado, Piso 3"],
      [
        "Requisitos",
        "Ayuno de 8 horas, lentes formulados de repuesto y cédula original",
      ],
    ],
  },
  {
    name: "Type Rating A320 Family",
    toggle: "certificado",
    details: [
      [
        "Último recurrente",
        "Simulador Nivel D, aprobado con nota sobresaliente",
      ],
      [
        "Maniobras evaluadas",
        "Fallo de motor en V1, aproximaciones RNP AR y descompresión de cabina",
      ],
    ],
  },
  {
    name: "ICAO English Level 6",
    toggle: "certificado",
    details: [
      ["Acreditación", "Nivel 6 (Experto) según Doc 9835 OACI"],
      ["Reevaluación", "No requiere reevaluación periódica"],
      [
        "Alcance",
        "Radiocomunicación en cualquier espacio aéreo sin restricciones",
      ],
    ],
  },
  {
    name: "CAT IIIb Autoland & LVP",
    toggle: "certificado",
    details: [
      [
        "Habilitación",
        "Aproximación por instrumentos de baja visibilidad en Airbus A320",
      ],
      [
        "Requisito de vigencia",
        "Aproximaciones monitoreadas completadas en los últimos 6 meses",
      ],
    ],
  },
]

const toggleOf = (name: string) =>
  LICENSES.find((license) => license.name === name)?.toggle ?? "certificado"

const CERTIFICATES = LICENSES.filter(({ toggle }) => toggle === "certificado")

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Lo que se ve: el texto sin los sr-only.
const visibleText = (element: Element) => {
  const clone = element.cloneNode(true) as Element
  for (const srOnly of clone.querySelectorAll(".sr-only")) srOnly.remove()
  return normalize(clone.textContent)
}

const licenseArticle = (name: string) => {
  const article = screen
    .getByRole("heading", { level: 3, name })
    .closest("article")
  expect(
    article,
    `«${name}» debe ser un <article> con su nombre en el h3`
  ).not.toBeNull()
  return article as HTMLElement
}

const showButton = (name: string) =>
  within(licenseArticle(name)).getByRole("button", {
    name: `Ver ${toggleOf(name)} de ${name}`,
  })

const hideButton = (name: string) =>
  within(licenseArticle(name)).getByRole("button", {
    name: `Ocultar ${toggleOf(name)} de ${name}`,
  })

// La sección de detalle es la que señala aria-controls del botón abierto, dentro del article.
const detailSection = (name: string) => {
  const button = hideButton(name)
  const id = button.getAttribute("aria-controls")
  expect(id, "el botón abierto lleva aria-controls").toBeTruthy()
  const section = document.getElementById(id ?? "")
  expect(section, `aria-controls="${id}" apunta a un elemento`).not.toBeNull()
  expect(
    licenseArticle(name).contains(section),
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

const expectDetails = (section: HTMLElement, details: [string, string][]) => {
  expect(termsOf(section)).toEqual(details.map(([term]) => term))
  for (const [term, value] of details) {
    expect(visibleText(definitionOf(section, term)), term).toBe(value)
  }
}

// Los elementos más internos del contenedor cuyo texto completo (normalizado) es `text`.
const innermostWithFullText = (container: Element, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  return matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
}

const isFollowing = (reference: Node, other: Node) =>
  Boolean(
    reference.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING
  )

// Espera a que la lista esté cargada (aparece el botón de la ATP).
const findLoaded = async () => {
  await screen.findByRole("button", { name: `Ver certificado de ${ATP}` }, LAZY)
}

// Pulsa el botón de despliegue. El detalle va en el article: nunca aparece un dialog
// (si apareciera, el resto de la página quedaría oculto al lector y fallaría lo demás).
const toggleDetail = async (
  user: ReturnType<typeof userEvent.setup>,
  button: HTMLElement
) => {
  await user.click(button)
  expect(
    screen.queryByRole("dialog"),
    "el despliegue no abre ningún dialog"
  ).toBeNull()
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
// D3: solo se falsea Date; setTimeout y setInterval siguen reales para Query, waitFor y user-event.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("Certificaciones: botones de despliegue cerrados (D1)", () => {
  it("D1 (contrato): todas las licencias empiezan cerradas, con aria-expanded=false, sin aria-controls y el texto visible de su tipo", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    for (const { name, toggle } of LICENSES) {
      const button = showButton(name)
      expect(button, name).toHaveAttribute("aria-expanded", "false")
      expect(button, name).not.toHaveAttribute("aria-controls")
      expect(visibleText(button), name).toBe(`Ver ${toggle}`)
    }
  })
})

describe("Certificaciones: certificado de la ATP (CE-09)", () => {
  it("CE-09: al pulsar «Ver certificado de Licencia ATP (Airline Transport Pilot)» el botón pasa a aria-expanded=true, se llama «Ocultar certificado de …», muestra «Ocultar certificado» y conserva el foco", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    const button = showButton(ATP)
    await toggleDetail(user, button)

    expect(hideButton(ATP)).toBe(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(visibleText(button)).toBe("Ocultar certificado")
    expect(button).toHaveFocus()
  })

  it("CE-09: abierto, el article de la ATP muestra sus 3 details en un <dl>, el texto PKI y «Descargar PDF, próximamente» con aria-disabled=true", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    await toggleDetail(user, showButton(ATP))

    const section = detailSection(ATP)
    expectDetails(section, LICENSES[0].details)
    const pki = innermostWithFullText(section, PKI_TEXT)
    expect(pki, "el texto PKI va en el detalle").toHaveLength(1)
    const pdf = within(section).getByRole("button", { name: PDF_BUTTON })
    expect(pdf).toHaveAttribute("aria-disabled", "true")
    expect(visibleText(pdf)).toContain("Descargar PDF")
    expect(visibleText(pdf)).toContain("Próximamente")
  })

  it("D1 (contrato): el detalle de la ATP va debajo de la fila (después del botón) y el texto PKI y el PDF van debajo del <dl>", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    await toggleDetail(user, showButton(ATP))

    const section = detailSection(ATP)
    const button = hideButton(ATP)
    expect(section.contains(button), "el botón no va dentro del detalle").toBe(
      false
    )
    expect(
      isFollowing(button, section),
      "el detalle va después del botón"
    ).toBe(true)
    const list = detailList(section)
    const [pki] = innermostWithFullText(section, PKI_TEXT)
    expect(isFollowing(list, pki), "el texto PKI va después del <dl>").toBe(
      true
    )
    const pdf = within(section).getByRole("button", { name: PDF_BUTTON })
    expect(isFollowing(list, pdf), "el PDF va después del <dl>").toBe(true)
  })

  it("CE-09: con la ATP abierta no hay ningún role=dialog y las demás licencias siguen cerradas", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    await toggleDetail(user, showButton(ATP))

    expect(screen.queryByRole("dialog")).toBeNull()
    for (const { name } of LICENSES.slice(1)) {
      const button = showButton(name)
      expect(button, name).toHaveAttribute("aria-expanded", "false")
      expect(button, name).not.toHaveAttribute("aria-controls")
    }
    expect(screen.getAllByRole("button", { name: PDF_BUTTON })).toHaveLength(1)
    expect(licenseArticle("Type Rating A320 Family")).not.toHaveTextContent(
      "Simulador Nivel D, aprobado con nota sobresaliente"
    )
  })

  it("CE-09: al pulsar otra vez se cierra: vuelve «Ver certificado de …» con aria-expanded=false, sin aria-controls, con el foco y la sección desmontada", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    await toggleDetail(user, showButton(ATP))
    const id = detailSection(ATP).id
    await toggleDetail(user, hideButton(ATP))

    const button = showButton(ATP)
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).not.toHaveAttribute("aria-controls")
    expect(visibleText(button)).toBe("Ver certificado")
    expect(button).toHaveFocus()
    expect(
      document.getElementById(id),
      "la sección se desmonta al cerrar"
    ).toBeNull()
    const article = licenseArticle(ATP)
    expect(article).not.toHaveTextContent("UAEAC (Aerocivil)")
    expect(article).not.toHaveTextContent(PKI_TEXT)
    expect(
      within(article).queryByRole("button", { name: PDF_BUTTON })
    ).toBeNull()
  })

  it("D1 (contrato): cada licencia se despliega por separado; abrir la médica no cierra la ATP", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    await toggleDetail(user, showButton(ATP))
    await toggleDetail(user, showButton(MEDICAL))

    expect(hideButton(ATP)).toHaveAttribute("aria-expanded", "true")
    expect(hideButton(MEDICAL)).toHaveAttribute("aria-expanded", "true")
    expectDetails(detailSection(ATP), LICENSES[0].details)
    expect(showButton("ICAO English Level 6")).toHaveAttribute(
      "aria-expanded",
      "false"
    )
  })

  it.each(CERTIFICATES.slice(1))(
    "CE-09 (datos): abierto, «$name» muestra sus details, el texto PKI y el PDF desactivado",
    async ({ name, details }) => {
      const user = userEvent.setup()
      renderRoute(PATHS.tripulante.certificaciones)
      await findLoaded()

      await toggleDetail(user, showButton(name))

      const section = detailSection(name)
      expectDetails(section, details)
      expect(innermostWithFullText(section, PKI_TEXT)).toHaveLength(1)
      expect(
        within(section).getByRole("button", { name: PDF_BUTTON })
      ).toHaveAttribute("aria-disabled", "true")
    }
  )
})

describe("Certificaciones: cita agendada de la médica (CE-10)", () => {
  it("CE-10: «Ver cita agendada de Evaluación Médica Clase 1» despliega «Fecha del turno» → «12 Nov 2026 • 08:30 COT», «Turno», «Lugar» y «Requisitos»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    const button = showButton(MEDICAL)
    expect(visibleText(button)).toBe("Ver cita agendada")
    await toggleDetail(user, button)

    expect(hideButton(MEDICAL)).toBe(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(visibleText(button)).toBe("Ocultar cita agendada")
    expect(button).toHaveFocus()
    expectDetails(detailSection(MEDICAL), LICENSES[1].details)
  })

  it("CE-10: la cita no lleva el texto PKI ni «Descargar PDF»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()

    await toggleDetail(user, showButton(MEDICAL))

    detailSection(MEDICAL)
    const article = licenseArticle(MEDICAL)
    expect(article).not.toHaveTextContent(PKI_TEXT)
    expect(article).not.toHaveTextContent("Descargar PDF")
    expect(
      within(article).queryByRole("button", { name: /Descargar PDF/ })
    ).toBeNull()
  })
})

describe("Certificaciones: «Descargar PDF» desactivado (CE-11)", () => {
  it("CE-11: pulsar «Descargar PDF, próximamente» no navega, no abre nada, no cambia la pantalla y el foco sigue en el botón", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null)
    const user = userEvent.setup()
    const router = renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded()
    await toggleDetail(user, showButton(ATP))

    const main = screen.getByRole("main")
    const pdf = within(detailSection(ATP)).getByRole("button", {
      name: PDF_BUTTON,
    })
    // Un `disabled` nativo no recibiría el foco: el contrato es aria-disabled.
    expect(pdf).toHaveAttribute("aria-disabled", "true")
    expect(pdf).not.toHaveAttribute("disabled")
    const textBefore = normalize(main.textContent)
    const bodyChildrenBefore = document.body.children.length

    await user.click(pdf)
    await user.keyboard("{Enter}")

    expect(pdf).toHaveFocus()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(open).not.toHaveBeenCalled()
    expect(normalize(main.textContent)).toBe(textBefore)
    expect(document.body.children.length).toBe(bodyChildrenBefore)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        PATHS.tripulante.certificaciones
      )
    )
    expect(hideButton(ATP)).toHaveAttribute("aria-expanded", "true")
  })
})
