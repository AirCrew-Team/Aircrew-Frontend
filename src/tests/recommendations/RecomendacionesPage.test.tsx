import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast, queryAllToasts, toastDescription } from "../utils/toasts"

// Recomendaciones de reemplazo del Supervisor (spec docs/specs/recomendaciones-supervisor.md):
// contenido, selección de candidatos y diálogos (RS-02…RS-08) con los datos simulados reales.
// RS-09 y RS-10 (cola de una solicitud y estados) están en RecomendacionesPage.dataStates.test.tsx.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

const H1 = "Recomendaciones de Reemplazo"

const normalize = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const renderPage = async () => {
  renderRoute(PATHS.superVisor.solicitudesReemplazo)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return { user: userEvent.setup(), main: screen.getByRole("main") }
}

// Cola: los tab se localizan por su texto (los códigos pueden ir en elementos separados).
const tabs = () => within(screen.getByRole("tablist")).getAllByRole("tab")

const tabFor = (flight: string) => {
  const tab = tabs().find((candidate) =>
    normalize(candidate.textContent).includes(flight)
  )
  expect(tab, `debe haber un tab de ${flight}`).toBeDefined()
  return tab as HTMLElement
}

const findTabFor = async (flight: string) => {
  await screen.findAllByRole("tab")
  return tabFor(flight)
}

// El panel visible de la solicitud seleccionada (Base UI oculta o desmonta los demás).
const activePanel = () => {
  const panels = screen.getAllByRole("tabpanel")
  expect(panels, "un único tabpanel visible").toHaveLength(1)
  return panels[0]
}

const candidateNames = (container: HTMLElement) =>
  within(container)
    .getAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 3 }).textContent)
    )

const findCandidate = (name: string) => screen.findByRole("article", { name })

// Pares de un dl visible: localiza el dt por su texto y devuelve el dd que le sigue.
const isVisible = (element: Element) => !element.closest("[hidden]")

const ddFor = (container: HTMLElement, term: string) => {
  const dt = Array.from(container.querySelectorAll("dt")).find(
    (element) => isVisible(element) && normalize(element.textContent) === term
  )
  expect(dt, `debe haber un dt visible «${term}»`).toBeDefined()
  const dd = (dt as HTMLElement).nextElementSibling
  expect(dd?.tagName, `el dt «${term}» debe ir seguido de su dd`).toBe("DD")
  return dd as HTMLElement
}

const visibleDls = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("dl")).filter(isVisible)

const EXPANDED = {
  "Juan Pablo Navarro": {
    ramp: "25 min",
    call: "Llamar a Juan Pablo Navarro, +57 310 445 8899",
    href: "tel:+573104458899",
    channel: "CH-04 OPS BOG (131.85)",
  },
  "Mateo Morales": {
    ramp: "42 min",
    call: "Llamar a Mateo Morales, +57 311 208 4410",
    href: "tel:+573112084410",
    channel: "CH-04 OPS BOG (131.85)",
  },
  "Laura Gómez": {
    ramp: "35 min",
    call: "Llamar a Laura Gómez, +57 312 550 1187",
    href: "tel:+573125501187",
    channel: "CH-02 OPS BOG (129.40)",
  },
} as const

// El botón de elegir conserva su nombre «Elegir» (APG: un toggle no cambia de nombre); el
// estado va en aria-pressed y la descripción accesible dice de qué candidato es.
const expectChooseButton = (article: HTMLElement, pressed: boolean) => {
  const button = within(article).getByRole("button", { name: "Elegir" })
  expect(button).toHaveAttribute("aria-pressed", String(pressed))
  expect(button).toHaveAccessibleDescription(
    within(article).getByRole("heading", { level: 3 }).textContent ?? ""
  )
  expect(within(article).queryByText("Elegido")).not.toBeInTheDocument()
}

// El candidato elegido: «Elegir» pulsado y desplegado con su dl y «Confirmar asignación».
const expectChosen = (article: HTMLElement, name: keyof typeof EXPANDED) => {
  const expected = EXPANDED[name]
  expectChooseButton(article, true)
  expect(
    normalize(ddFor(article, "Llegada estimada a rampa").textContent)
  ).toBe(expected.ramp)
  const call = within(ddFor(article, "Celular directo")).getByRole("link", {
    name: expected.call,
  })
  expect(call).toHaveAttribute("href", expected.href)
  expect(normalize(ddFor(article, "Canal Standby").textContent)).toBe(
    expected.channel
  )
  expect(
    within(article).getByRole("button", { name: "Confirmar asignación" })
  ).toBeInTheDocument()
}

// Un candidato no elegido: «Elegir» sin pulsar y sin el desplegable (ausente o con hidden).
const expectNotChosen = (article: HTMLElement) => {
  expectChooseButton(article, false)
  expect(visibleDls(article), "sin dl visible").toHaveLength(0)
  expect(
    within(article).queryByRole("link", { name: /^Llamar a/ })
  ).not.toBeInTheDocument()
  expect(
    within(article).queryByRole("button", { name: "Confirmar asignación" })
  ).not.toBeInTheDocument()
}

// Tras cerrar un diálogo: primero que desaparezca (el modal oculta la página al lector),
// luego el foco y, un tick después, que siga ahí (Base UI devuelve el foco al cerrar).
const expectFocusAfterDialog = async (
  role: "alertdialog" | "dialog",
  target: () => HTMLElement
) => {
  await waitFor(() => expect(screen.queryByRole(role)).not.toBeInTheDocument())
  await waitFor(() => expect(target()).toHaveFocus())
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
  expect(target()).toHaveFocus()
  expect(document.activeElement).not.toBe(document.body)
}

const QUEUE = [
  {
    flight: "AV-9344",
    route: "BOG → MIA",
    position: "Copiloto A320",
    due: "Sale en 1h 45m",
  },
  {
    flight: "AV-8120",
    route: "BOG → CLO",
    position: "Jefe de Cabina",
    due: "Sale en 3h 10m",
  },
  {
    flight: "AV-7741",
    route: "BOG → MDE",
    position: "Tripulante de Cabina",
    due: "Sale en 5h 00m",
  },
  {
    flight: "AV-6612",
    route: "BOG → CTG",
    position: "Comandante",
    due: "Sale en 6h 20m",
  },
  {
    flight: "AV-5023",
    route: "BOG → SMR",
    position: "Copiloto A320",
    due: "Sale en 8h 05m",
  },
]

const CANDIDATES = [
  {
    name: "Juan Pablo Navarro",
    rank: "Primer Oficial · Base BOG",
    badge: "98% Óptimo",
    checks: ["Certificación A320", "FDP: +6h disponibles", "Descanso cumplido"],
    location: "Standby Casa (Fontibón) · 25 min a rampa",
  },
  {
    name: "Mateo Morales",
    rank: "Primer Oficial · Base BOG",
    badge: "91% Alta",
    checks: ["Certificación A320", "FDP: +4h disponibles", "Descanso cumplido"],
    location: "Zona Salitre · 42 min a rampa",
  },
  {
    name: "Andrés Restrepo",
    rank: "Primer Oficial · Base BOG",
    badge: "84% Viable",
    checks: ["Certificación A320", "FDP: +3h disponibles", "Descanso cumplido"],
    location: "Zona Norte · 55 min a rampa",
  },
]

describe("Recomendaciones: encabezado de la solicitud (RS-02)", () => {
  it("RS-02 hay un único h1 «Recomendaciones de Reemplazo» y el encabezado de DISP-2025-0982", async () => {
    const { main } = await renderPage()

    expect(await screen.findByText("Solicitud DISP-2025-0982")).toBeVisible()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(main).toHaveTextContent(
      "Vuelo AV-9344 (BOG → MIA) · Copiloto A320 requerido"
    )
    expect(main).toHaveTextContent(
      "Motivo: Incapacidad médica sobrevenida del F/O titular."
    )
    expect(normalize(ddFor(main, "Salida programada").textContent)).toBe(
      "16:15 UTC · en 1h 45m"
    )
    expect(normalize(ddFor(main, "Puerta").textContent)).toBe("C04")
  })

  it("RS-02 el encabezado sigue a la solicitud seleccionada (derivado: «Encabezado de la solicitud»)", async () => {
    const { user, main } = await renderPage()

    await user.click(await findTabFor("AV-8120"))

    expect(await screen.findByText("Solicitud DISP-2025-0987")).toBeVisible()
    expect(
      screen.queryByText("Solicitud DISP-2025-0982")
    ).not.toBeInTheDocument()
    expect(main).toHaveTextContent(
      "Vuelo AV-8120 (BOG → CLO) · Jefe de Cabina requerido"
    )
    expect(normalize(ddFor(main, "Puerta").textContent)).toBe("B12")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})

describe("Recomendaciones: cola de solicitudes (RS-03)", () => {
  it("RS-03 la cola tiene el h2 «Pendientes (5)» y un tablist vertical", async () => {
    await renderPage()

    expect(
      await screen.findByRole("heading", { level: 2, name: "Pendientes (5)" })
    ).toBeInTheDocument()
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    )
  })

  it("RS-03 hay 5 tab en el orden del mock, cada uno con vuelo, ruta, cargo y plazo", async () => {
    await renderPage()

    await screen.findAllByRole("tab")
    const all = tabs()
    expect(all).toHaveLength(QUEUE.length)
    QUEUE.forEach(({ flight, route, position, due }, index) => {
      const tab = all[index]
      expect(tab, `tab ${index + 1}`).toHaveTextContent(flight)
      expect(tab).toHaveTextContent(route)
      expect(tab).toHaveTextContent(position)
      expect(tab).toHaveTextContent(due)
    })
  })

  it("RS-03 la primera solicitud (AV-9344) está seleccionada al cargar", async () => {
    await renderPage()

    expect(await findTabFor("AV-9344")).toHaveAttribute("aria-selected", "true")
    for (const { flight } of QUEUE.slice(1)) {
      expect(tabFor(flight)).toHaveAttribute("aria-selected", "false")
    }
  })
})

describe("Recomendaciones: candidatos (RS-04)", () => {
  it("RS-04 el panel tiene el h2 «Candidatos sugeridos por la IA» y la nota «Ordenados por afinidad»", async () => {
    await renderPage()

    await screen.findAllByRole("tab")
    const panel = activePanel()
    expect(
      within(panel).getByRole("heading", {
        level: 2,
        name: "Candidatos sugeridos por la IA",
      })
    ).toBeInTheDocument()
    expect(panel).toHaveTextContent("Ordenados por afinidad")
  })

  it("RS-04 hay 3 article en orden de afinidad, nombrados por su h3", async () => {
    await renderPage()

    await findCandidate("Juan Pablo Navarro")
    const panel = activePanel()
    expect(candidateNames(panel)).toEqual(CANDIDATES.map(({ name }) => name))
    within(panel)
      .getAllByRole("article")
      .forEach((article, index) =>
        expect(article).toHaveAccessibleName(CANDIDATES[index].name)
      )
  })

  it.each(CANDIDATES)(
    "RS-04 $name muestra cargo y base, distintivo, los 3 checks y la ubicación",
    async ({ name, rank, badge, checks, location }) => {
      await renderPage()

      const article = await findCandidate(name)
      expect(article).toHaveTextContent(rank)
      expect(article).toHaveTextContent(badge)
      expect(article).toHaveTextContent(location)
      const items = within(within(article).getByRole("list")).getAllByRole(
        "listitem"
      )
      expect(items.map((item) => normalize(item.textContent))).toEqual(checks)
    }
  )

  it("RS-04 el primero (Juan Pablo Navarro) está elegido y desplegado con llegada, enlace tel: y canal", async () => {
    await renderPage()

    expectChosen(
      await findCandidate("Juan Pablo Navarro"),
      "Juan Pablo Navarro"
    )
  })

  it("RS-04 los demás tienen «Elegir» y no muestran el desplegable", async () => {
    await renderPage()

    // Ancla positiva: el elegido sí lo muestra.
    expectChosen(
      await findCandidate("Juan Pablo Navarro"),
      "Juan Pablo Navarro"
    )
    expectNotChosen(screen.getByRole("article", { name: "Mateo Morales" }))
    expectNotChosen(screen.getByRole("article", { name: "Andrés Restrepo" }))
    expect(
      within(activePanel()).getAllByRole("button", {
        name: "Confirmar asignación",
      })
    ).toHaveLength(1)
  })
})

describe("Recomendaciones: elegir candidato y cambiar de solicitud (RS-05)", () => {
  it("RS-05 pulsar «Elegir» en Mateo Morales lo despliega y pliega el anterior", async () => {
    const { user } = await renderPage()

    const mateo = await findCandidate("Mateo Morales")
    await user.click(within(mateo).getByRole("button", { name: "Elegir" }))

    await waitFor(() =>
      expectChosen(
        screen.getByRole("article", { name: "Mateo Morales" }),
        "Mateo Morales"
      )
    )
    expectNotChosen(screen.getByRole("article", { name: "Juan Pablo Navarro" }))
    expectNotChosen(screen.getByRole("article", { name: "Andrés Restrepo" }))
  })

  it("RS-05 cambiar al tab de AV-8120 muestra sus candidatos con el primero elegido", async () => {
    const { user } = await renderPage()

    await findCandidate("Juan Pablo Navarro")
    await user.click(tabFor("AV-8120"))

    await waitFor(() =>
      expect(tabFor("AV-8120")).toHaveAttribute("aria-selected", "true")
    )
    expect(tabFor("AV-9344")).toHaveAttribute("aria-selected", "false")
    expectChosen(await findCandidate("Laura Gómez"), "Laura Gómez")
    expect(candidateNames(activePanel())).toEqual(["Laura Gómez", "Diego Ruiz"])
    expectNotChosen(screen.getByRole("article", { name: "Diego Ruiz" }))
    expect(
      screen.queryByRole("article", { name: "Juan Pablo Navarro" })
    ).not.toBeInTheDocument()
  })

  it("RS-05 al volver a AV-9344 tras elegir a Mateo, el elegido vuelve a ser el primero", async () => {
    const { user } = await renderPage()

    const mateo = await findCandidate("Mateo Morales")
    await user.click(within(mateo).getByRole("button", { name: "Elegir" }))
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("article", { name: "Mateo Morales" })
        ).getByRole("button", { name: "Elegir", pressed: true })
      ).toBeInTheDocument()
    )

    await user.click(tabFor("AV-8120"))
    await findCandidate("Laura Gómez")
    await user.click(tabFor("AV-9344"))

    expectChosen(
      await findCandidate("Juan Pablo Navarro"),
      "Juan Pablo Navarro"
    )
    expectNotChosen(screen.getByRole("article", { name: "Mateo Morales" }))
  })
})

describe("Recomendaciones: diálogo de confirmación (RS-06)", () => {
  const openConfirm = async () => {
    const page = await renderPage()
    const juan = await findCandidate("Juan Pablo Navarro")
    await page.user.click(
      within(juan).getByRole("button", { name: "Confirmar asignación" })
    )
    const dialog = await screen.findByRole("alertdialog", {
      name: "Confirmar asignación",
    })
    return { ...page, dialog }
  }

  it("RS-06 «Confirmar asignación» abre el alertdialog con la descripción exacta y los botones", async () => {
    const { dialog } = await openConfirm()

    expect(dialog).toHaveAccessibleDescription(
      expect.stringContaining(
        "¿Asignar a Juan Pablo Navarro como Copiloto A320 del vuelo AV-9344? Se le notificará de inmediato."
      )
    )
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Asignar" })
    ).toBeInTheDocument()
  })

  it("RS-06 la descripción nombra al candidato elegido (Mateo Morales)", async () => {
    const { user } = await renderPage()

    const mateo = await findCandidate("Mateo Morales")
    await user.click(within(mateo).getByRole("button", { name: "Elegir" }))
    await user.click(
      await within(
        screen.getByRole("article", { name: "Mateo Morales" })
      ).findByRole("button", { name: "Confirmar asignación" })
    )

    expect(
      await screen.findByRole("alertdialog", { name: "Confirmar asignación" })
    ).toHaveAccessibleDescription(
      expect.stringContaining(
        "¿Asignar a Mateo Morales como Copiloto A320 del vuelo AV-9344? Se le notificará de inmediato."
      )
    )
  })

  // No repudio (documento del proyecto §12): la confirmación resume el tripulante, el vuelo
  // y los criterios que cumple; los criterios forman parte de la descripción del diálogo.
  it("RS-14 el diálogo lista los criterios verificados del candidato y los incluye en su descripción", async () => {
    const { dialog } = await openConfirm()

    const criteria = within(dialog).getByRole("list", {
      name: "Criterios verificados",
    })
    expect(
      within(criteria)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual([
      "Certificación A320",
      "FDP: +6h disponibles",
      "Descanso cumplido",
    ])
    for (const check of [
      "Certificación A320",
      "FDP: +6h disponibles",
      "Descanso cumplido",
    ]) {
      expect(dialog).toHaveAccessibleDescription(expect.stringContaining(check))
    }
  })

  it("RS-06 «Cancelar» cierra el diálogo sin cambios", async () => {
    const { user, dialog } = await openConfirm()

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(queryAllToasts()).toHaveLength(0)
    expect(
      screen.getByRole("heading", { level: 2, name: "Pendientes (5)" })
    ).toBeInTheDocument()
    expect(tabs()).toHaveLength(5)
    expect(tabFor("AV-9344")).toHaveAttribute("aria-selected", "true")
    expectChosen(
      screen.getByRole("article", { name: "Juan Pablo Navarro" }),
      "Juan Pablo Navarro"
    )
  })
})

describe("Recomendaciones: asignar (RS-07)", () => {
  const assignFirst = async () => {
    const page = await renderPage()
    const juan = await findCandidate("Juan Pablo Navarro")
    await page.user.click(
      within(juan).getByRole("button", { name: "Confirmar asignación" })
    )
    const dialog = await screen.findByRole("alertdialog", {
      name: "Confirmar asignación",
    })
    await page.user.click(
      within(dialog).getByRole("button", { name: "Asignar" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    return page
  }

  it("RS-07 «Asignar» lanza el toast exacto", async () => {
    await assignFirst()

    const toast = await findToast(
      "Juan Pablo Navarro asignado al vuelo AV-9344"
    )
    expect(toast).toHaveAttribute("data-type", "success")
    expect(toastDescription(toast)).toBe("Se notificó al tripulante.")
  })

  it("RS-07 después quedan «Pendientes (4)» sin AV-9344", async () => {
    await assignFirst()

    expect(
      await screen.findByRole("heading", { level: 2, name: "Pendientes (4)" })
    ).toBeInTheDocument()
    const flights = tabs().map((tab) => normalize(tab.textContent))
    expect(flights).toHaveLength(4)
    expect(flights.some((text) => text.includes("AV-9344"))).toBe(false)
    QUEUE.slice(1).forEach(({ flight }, index) =>
      expect(flights[index]).toContain(flight)
    )
  })

  it("RS-07 AV-8120 queda seleccionada con sus candidatos", async () => {
    await assignFirst()

    await waitFor(() =>
      expect(tabFor("AV-8120")).toHaveAttribute("aria-selected", "true")
    )
    expectChosen(await findCandidate("Laura Gómez"), "Laura Gómez")
    expect(candidateNames(activePanel())).toEqual(["Laura Gómez", "Diego Ruiz"])
  })

  it("RS-07 el foco queda en el tab de AV-8120, no en body", async () => {
    await assignFirst()

    await expectFocusAfterDialog("alertdialog", () => tabFor("AV-8120"))
  })
})

describe("Recomendaciones: pedir nuevas sugerencias (RS-08)", () => {
  const openSuggestions = async () => {
    const page = await renderPage()
    await findCandidate("Juan Pablo Navarro")
    await page.user.click(
      within(activePanel()).getByRole("button", {
        name: "Pedir nuevas sugerencias",
      })
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Pedir nuevas sugerencias",
    })
    return { ...page, dialog }
  }

  const requestSuggestions = async () => {
    const page = await openSuggestions()
    await page.user.type(
      within(page.dialog).getByRole("textbox", { name: "Motivo (opcional)" }),
      "Ninguno llega a tiempo a rampa"
    )
    await page.user.click(
      within(page.dialog).getByRole("button", { name: "Pedir sugerencias" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    return page
  }

  it("RS-08 «Pedir nuevas sugerencias» abre el diálogo con descripción, textarea «Motivo (opcional)» y botones", async () => {
    const { dialog } = await openSuggestions()

    expect(dialog).toHaveAccessibleDescription(
      "La IA recalculará los candidatos para el vuelo AV-9344."
    )
    expect(
      within(dialog).getByRole("textbox", { name: "Motivo (opcional)" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Pedir sugerencias" })
    ).toBeInTheDocument()
  })

  it("RS-08 «Cancelar» cierra el diálogo sin toast ni recálculo", async () => {
    const { user, dialog } = await openSuggestions()

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(queryAllToasts()).toHaveLength(0)
    expect(tabFor("AV-9344")).toHaveAttribute("aria-selected", "true")
    expect(tabFor("AV-9344")).not.toHaveTextContent("Recalculando sugerencias")
  })

  it("RS-08 al confirmar se lanza el toast exacto", async () => {
    await requestSuggestions()

    const toast = await findToast(
      "Se pidieron nuevas sugerencias para el vuelo AV-9344"
    )
    expect(toast).toHaveAttribute("data-type", "success")
  })

  it("RS-08 AV-9344 sigue en la cola con «Recalculando sugerencias» y AV-8120 queda seleccionada", async () => {
    await requestSuggestions()

    await waitFor(() =>
      expect(tabFor("AV-9344")).toHaveTextContent("Recalculando sugerencias")
    )
    // Derivado: la solicitud en recálculo sigue en la cola, así que siguen siendo 5.
    expect(tabs()).toHaveLength(5)
    expect(
      screen.getByRole("heading", { level: 2, name: "Pendientes (5)" })
    ).toBeInTheDocument()
    expect(tabFor("AV-8120")).toHaveAttribute("aria-selected", "true")
    expect(tabFor("AV-8120")).not.toHaveTextContent("Recalculando sugerencias")
    expectChosen(await findCandidate("Laura Gómez"), "Laura Gómez")
  })

  it("RS-08 el foco queda en el tab de AV-8120, no en body", async () => {
    await requestSuggestions()

    await expectFocusAfterDialog("dialog", () => tabFor("AV-8120"))
  })

  it("RS-08 al volver a AV-9344 se ve el texto de recálculo en lugar de los candidatos", async () => {
    const { user } = await requestSuggestions()

    await waitFor(() =>
      expect(tabFor("AV-8120")).toHaveAttribute("aria-selected", "true")
    )
    await user.click(tabFor("AV-9344"))

    await waitFor(() =>
      expect(activePanel()).toHaveTextContent(
        "La IA está recalculando las sugerencias de esta solicitud."
      )
    )
    const panel = activePanel()
    expect(within(panel).queryAllByRole("article")).toHaveLength(0)
    expect(
      within(panel).queryByRole("button", { name: "Confirmar asignación" })
    ).not.toBeInTheDocument()
  })
})
