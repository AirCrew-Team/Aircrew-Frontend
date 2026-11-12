import { focusManager } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Pantalla completa con los datos simulados reales de home.data.ts y la sesión del tripulante.
// LG-08: el store arranca sin sesión, así que cada test la pone de forma explícita.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

const WELCOME = "Juan Pablo, Bienvenido a AirCrew"

const renderInicio = () => renderRoute(PATHS.tripulante.inicio)

// Cada tarjeta es un <article> con su h2. Se acota con within porque el navbar repite nombres de enlaces.
const findCard = async (title: string) => {
  const heading = await screen.findByRole("heading", { level: 2, name: title })
  const card = heading.closest("article")
  expect(card).not.toBeNull()
  return card as HTMLElement
}

const BANNER = "Asignación de reemplazo"

// Espera a que el banner tenga sus datos (mientras carga puede existir sin ellos).
// Nombre exacto: el contador «+1 pendiente» no puede formar parte del h2.
const findBanner = async () => {
  const banner = await screen.findByRole("region", { name: BANNER })
  await waitFor(() => expect(banner).toHaveTextContent("Vuelo AV-9344"))
  return banner
}

// Oculto en el sentido de la accesibilidad: o no está en el DOM o no es visible (atributo hidden).
// jsdom no aplica Tailwind, así que una clase "hidden" no cuenta como oculto.
const expectHiddenOrAbsent = (element: HTMLElement | null) => {
  if (element) expect(element).not.toBeVisible()
}

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Texto que llega al lector: omite lo que va con aria-hidden (o hidden) e incluye los sr-only.
// Separa con un espacio el contenido de cada elemento; luego se quita el espacio antes de la coma
// del DotSeparator («·» aria-hidden + «, » sr-only).
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

const spokenText = (element: Element) =>
  normalize(readableText(element)).replace(/\s+,/g, ",")

// El elemento más interno cuyo texto oído contiene todos los fragmentos.
const getSpokenLine = (container: HTMLElement, parts: string[]) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => {
    const spoken = spokenText(element)
    return parts.every((part) => spoken.includes(part))
  })
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(
    innermost,
    `debe haber un único elemento que se oiga con ${parts.map((part) => `«${part}»`).join(" y ")}`
  ).toHaveLength(1)
  return innermost[0]
}

const countDots = (element: HTMLElement) =>
  (element.textContent?.match(/·/g) ?? []).length

describe("Inicio del tripulante: página", () => {
  it("HT-02: hay un único h1 «Juan Pablo, Bienvenido a AirCrew»", async () => {
    renderInicio()

    expect(
      await screen.findByRole("heading", { level: 1, name: WELCOME })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  // D1 = A: el saludo lee displayName (nombre corto), no fullName (nombre completo del perfil).
  it("HT-02 y D1: el nombre del h1 sale de displayName de la sesión, no de fullName ni de los datos simulados", async () => {
    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    useAuthStore.setState({
      user: {
        ...(user as NonNullable<typeof user>),
        displayName: "Ana María",
        fullName: "Ana María Pérez Gómez",
      },
    })

    renderInicio()

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Ana María, Bienvenido a AirCrew",
      })
    ).toBeInTheDocument()
  })

  it("HT-26: un solo h1 y un h2 por cada una de las tres tarjetas", async () => {
    renderInicio()

    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await screen.findByRole("heading", { level: 2, name: "Certificaciones" })

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const h2Names = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent?.trim())
    expect(h2Names).toEqual(
      expect.arrayContaining([
        "AV-8520",
        "Certificaciones",
        "Novedad o Ausencia",
      ])
    )
  })

  it("HL-01: el orden del DOM es bienvenida, estado de asignación, asignación de reemplazo, próximo vuelo, certificaciones y novedad o ausencia", async () => {
    renderInicio()

    const blocks = [
      {
        name: "bienvenida",
        element: await screen.findByRole("region", { name: WELCOME }),
      },
      {
        name: "estado de asignación",
        element: await screen.findByRole("region", {
          name: "Estado de asignación",
        }),
      },
      { name: "asignación de reemplazo", element: await findBanner() },
      { name: "próximo vuelo", element: await findCard("AV-8520") },
      { name: "certificaciones", element: await findCard("Certificaciones") },
      {
        name: "novedad o ausencia",
        element: await findCard("Novedad o Ausencia"),
      },
    ]

    for (let index = 1; index < blocks.length; index += 1) {
      const previous = blocks[index - 1]
      const current = blocks[index]
      expect(
        previous.element.compareDocumentPosition(current.element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        `«${current.name}» debe ir después de «${previous.name}» en el DOM`
      ).toBeTruthy()
    }
  })

  // jsdom no aplica order-first: lo que se comprueba es el orden en el DOM, que es el que sigue el lector de pantalla.
  it.each([
    {
      card: "AV-8520",
      label: "Itinerario Confirmado",
      badge: "Mañana",
      action: {
        role: "button" as const,
        name: "Ver Briefing Operacional, próximamente",
      },
    },
    {
      card: "Certificaciones",
      label: "Habilitaciones RAC",
      badge: "Vigente",
      action: { role: "link" as const, name: "Consultar Licencias" },
    },
    {
      card: "Novedad o Ausencia",
      label: "Canal OCC Rápido",
      badge: "Auto-Gestión",
      action: { role: "link" as const, name: "Reportar Ausencia" },
    },
  ])(
    "HL-01 y HT-26: en la tarjeta «$card», la etiqueta lleva ícono y el distintivo «$badge» y la acción van después del h2 en el DOM",
    async ({ card: title, label, badge: badgeText, action }) => {
      renderInicio()

      const card = await findCard(title)
      const heading = within(card).getByRole("heading", {
        level: 2,
        name: title,
      })
      const badge = within(card).getByText(badgeText)
      const labelElement = within(card).getByText(label)
      const actionElement = within(card).getByRole(action.role, {
        name: action.name,
      })

      expect(
        labelElement.querySelector("svg"),
        `la etiqueta «${label}» debe llevar su ícono`
      ).not.toBeNull()
      expect(
        heading.compareDocumentPosition(badge) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        `«${badgeText}» debe ir después del h2 «${title}» en el DOM`
      ).toBeTruthy()
      expect(
        heading.compareDocumentPosition(actionElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        `la acción «${action.name}» debe ir después del h2 «${title}» en el DOM`
      ).toBeTruthy()
    }
  )

  // La parte del banner de HT-26 pasa a AR-02.
  it("HT-26: el estado de asignación es una section con nombre accesible", async () => {
    renderInicio()

    expect(
      await screen.findByRole("region", { name: /^estado de asignación/i })
    ).toBeInTheDocument()
  })
})

describe("Inicio del tripulante: bienvenida y reloj", () => {
  it("HT-05 y HL-02: muestra la base, el reloj maestro, «Sincronizado» y la condición operacional", async () => {
    renderInicio()

    const main = await screen.findByRole("main")
    await waitFor(() => expect(main).toHaveTextContent(/nivel óptimo/i))

    expect(main).toHaveTextContent(/base bog \/ skbo/i)
    expect(main).toHaveTextContent(/reloj maestro/i)
    expect(main).toHaveTextContent(/sincronizado/i)
    expect(main).toHaveTextContent(/condición operacional/i)
  })

  it("HL-02: no aparece «Portal Operacional de Vuelo» ni ningún «•» en la bienvenida", async () => {
    renderInicio()

    const welcome = await screen.findByRole("region", { name: WELCOME })
    await waitFor(() => expect(welcome).toHaveTextContent(/nivel óptimo/i))
    expect(welcome).toHaveTextContent(/base bog \/ skbo/i)

    expect(screen.getByRole("main")).not.toHaveTextContent(
      /portal operacional de vuelo/i
    )
    expect(welcome.textContent).not.toContain("•")
  })

  it("HL-02: la etiqueta se oye «Tripulación activa, Base BOG / SKBO» y su «·» es decorativo", async () => {
    renderInicio()

    const welcome = await screen.findByRole("region", { name: WELCOME })
    await waitFor(() => expect(welcome).toHaveTextContent(/base bog \/ skbo/i))

    const label = getSpokenLine(welcome, [
      "Tripulación activa",
      "Base BOG / SKBO",
    ])
    expect(spokenText(label)).toBe("Tripulación activa, Base BOG / SKBO")
    // Ancla: el separador se ve («·») aunque el lector no lo oiga.
    expect(countDots(label), "la etiqueta debe mostrar un «·»").toBe(1)
  })

  it("HT-06 y HT-09: en la página, la hora va en un <time> HH:MM:SSZ sin aria-live en ningún contenedor", async () => {
    renderInicio()

    const main = await screen.findByRole("main")
    await waitFor(() => expect(main.querySelector("time")).not.toBeNull())

    const time = main.querySelector("time") as HTMLTimeElement
    expect(time.textContent).toMatch(/^\d{2}:\d{2}:\d{2}Z$/)
    for (
      let element: HTMLElement | null = time;
      element;
      element = element.parentElement
    ) {
      expect(element).not.toHaveAttribute("aria-live")
    }
  })
})

describe("Inicio del tripulante: estado de asignación", () => {
  it("HL-03: la región «Estado de asignación» muestra «Disponible» y la nota nueva, sin controles para cambiarlo", async () => {
    renderInicio()

    const region = await screen.findByRole("region", {
      name: "Estado de asignación",
    })
    expect(await within(region).findByText("Disponible")).toBeInTheDocument()
    expect(region).toHaveTextContent(
      "Lo asigna OCC Despacho y determina tus asignaciones y relevos de contingencia."
    )

    for (const role of ["radio", "radiogroup", "button", "combobox"] as const) {
      expect(
        within(region).queryAllByRole(role),
        `no debe haber ningún ${role} en el estado de asignación`
      ).toHaveLength(0)
    }
  })
})

// Spec asignacion-reemplazo-tripulante: AR-02, AR-04…AR-07 con los datos simulados reales
// (AV-9344 y luego AV-9478). Sustituyen a HT-12…HT-18, SN-03 del banner y HL-04/HL-05.
// AR-01, AR-03, AR-07 con una sola asignación y AR-08 están en InicioPage.dataStates.test.tsx.
describe("Inicio del tripulante: asignación de reemplazo", () => {
  const MOTIVO_AV_9344 =
    "Incapacidad médica sobrevenida de tripulante titular. Aprobada por Supervisora Camila Restrepo (OCC Central). Cumple límites RAC 121 / Descanso Reglamentario."
  const LINE_AV_9344 =
    "Hoy, 16:15 UTC (11:15 local), Airbus A320neo, Primer Oficial (Copiloto), 3h 50m"
  const LINE_AV_9478 =
    "Mañana, 13:40 UTC (08:40 local), Airbus A320neo, Primer Oficial (Copiloto), 1h 05m"
  const TOAST_AV_9344 = "Asignación del vuelo AV-9344 marcada como enterada"

  // Pulsa «Enterado» en la asignación visible.
  const acknowledge = async (
    user: ReturnType<typeof userEvent.setup>,
    banner: HTMLElement
  ) => {
    await user.click(within(banner).getByRole("button", { name: "Enterado" }))
  }

  it("AR-02: hay una sola región «Asignación de reemplazo» con un h2 de ese nombre", async () => {
    renderInicio()

    const banner = await findBanner()

    expect(screen.getAllByRole("region", { name: BANNER })).toHaveLength(1)
    expect(
      within(banner).getByRole("heading", { level: 2, name: BANNER })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("region", { name: /solicitud de reemplazo/i })
    ).not.toBeInTheDocument()
  })

  it("AR-02: se ven «Vuelo AV-9344», «+1 pendiente» fuera del h2 y la ruta «BOG → MIA» con los aeropuertos", async () => {
    renderInicio()

    const banner = await findBanner()
    const heading = within(banner).getByRole("heading", {
      level: 2,
      name: BANNER,
    })

    expect(within(banner).getByText("Vuelo AV-9344")).toBeInTheDocument()
    const pending = within(banner).getByText("+1 pendiente")
    expect(heading).not.toContainElement(pending)

    const spoken = spokenText(banner)
    expect(spoken).toContain("BOG → MIA")
    expect(spoken).toContain("(Bogotá El Dorado → Miami Intl)")
  })

  it(`AR-02: la línea de datos se oye «${LINE_AV_9344}»`, async () => {
    renderInicio()

    const banner = await findBanner()

    const line = getSpokenLine(banner, ["Hoy, 16:15 UTC", "3h 50m"])
    expect(spokenText(line)).toBe(LINE_AV_9344)
    // Ancla: los tres separadores se ven («·») aunque el lector no los oiga.
    expect(countDots(line), "la línea debe mostrar tres «·»").toBe(3)
  })

  it("AR-02: AV-9478 no aparece en ningún sitio mientras AV-9344 está visible", async () => {
    renderInicio()

    await findBanner()

    // textContent incluye también lo oculto (detalle cerrado, sr-only).
    expect(document.body.textContent).not.toContain("AV-9478")
    expect(document.body.textContent).not.toContain("Medellín")
    // Los códigos van en <span> pegados: textContent da «BOG→MDE», el lector «BOG → MDE».
    expect(spokenText(document.body)).not.toContain("BOG → MDE")
  })

  it("AR-04: hay botón «Enterado», pero no «Aceptar» ni «Rechazar», ningún alertdialog ni el texto «restantes»", async () => {
    renderInicio()

    const banner = await findBanner()

    // Ancla positiva: el banner ya tiene su acción.
    expect(
      within(banner).getByRole("button", { name: "Enterado" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /aceptar/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /rechazar/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(banner).not.toHaveTextContent(/restantes/i)
    expect(banner).not.toHaveTextContent(/T-11:42/)
    // Antes HL-04: la ruta y la meteorología no vuelven, ni siquiera en el detalle.
    expect(banner).not.toHaveTextContent(/ruta & meteorología/i)
    expect(banner).not.toHaveTextContent(/ruta plan/i)
    expect(banner).not.toHaveTextContent(/metar/i)
  })

  it("AR-06: el chip no roba el foco al cargar ni al volver a pedir los datos; solo tras «Enterado»", async () => {
    renderInicio()

    const banner = await findBanner()
    const chip = within(banner).getByText("Vuelo AV-9344")
    expect(chip).not.toHaveFocus()

    // Simula salir y volver a la pestaña (refetchOnWindowFocus de TanStack Query).
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
    focusManager.setFocused(undefined)

    expect(within(banner).getByText("Vuelo AV-9344")).not.toHaveFocus()
  })

  it("AR-05: el motivo y la tripulación no se ven hasta abrir el detalle", async () => {
    renderInicio()

    const banner = await findBanner()

    for (const text of [
      /^motivo/i,
      /incapacidad médica sobrevenida/i,
      /camila restrepo/i,
      /tripulación a bordo/i,
      /carlos mendivelso/i,
    ]) {
      for (const element of within(banner).queryAllByText(text)) {
        expect(
          element,
          `${text} no debe verse con el detalle cerrado`
        ).not.toBeVisible()
      }
    }
  })

  it("AR-05: «Ver detalle completo» empieza con aria-expanded=false y aria-controls a un panel oculto", async () => {
    renderInicio()

    const banner = await findBanner()
    const toggle = within(banner).getByRole("button", {
      name: "Ver detalle completo",
    })

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    const panelId = toggle.getAttribute("aria-controls")
    expect(panelId).toBeTruthy()
    expectHiddenOrAbsent(document.getElementById(panelId ?? ""))
  })

  it("AR-05: al abrirlo, «Motivo» dice «Aprobada por Supervisora Camila Restrepo (OCC Central)», «Tripulación a bordo» y «Descanso post-vuelo» van en dt y el botón pasa a «Ocultar detalle»; al volver a pulsarlo, se cierra", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await user.click(
      within(banner).getByRole("button", { name: "Ver detalle completo" })
    )

    const hide = within(banner).getByRole("button", { name: "Ocultar detalle" })
    expect(hide).toHaveAttribute("aria-expanded", "true")
    const panel = document.getElementById(
      hide.getAttribute("aria-controls") ?? ""
    )
    expect(panel).not.toBeNull()
    expect(panel).toBeVisible()
    const terms = Array.from(
      (panel as HTMLElement).querySelectorAll("dt"),
      (term) => normalize(term.textContent)
    )
    expect(terms).toEqual([
      "Motivo",
      "Tripulación a bordo",
      "Descanso post-vuelo",
    ])
    expect(panel).toHaveTextContent(
      "Aprobada por Supervisora Camila Restrepo (OCC Central)"
    )
    expect(panel).toHaveTextContent(MOTIVO_AV_9344)
    expect(panel).not.toHaveTextContent(/solicita/i)
    expect(panel).toHaveTextContent("Comandante: Cap. Carlos Mendivelso")
    expect(panel).toHaveTextContent("Descanso garantizado: 18h en KMIA")
    // Segunda línea (nota) de cada dato del detalle.
    expect(panel).toHaveTextContent("Jefe de Cabina: Mariana Santos + 3 TCPs")
    expect(panel).toHaveTextContent("Retorno asignado: AV-9345 día siguiente")

    await user.click(hide)

    const show = within(banner).getByRole("button", {
      name: "Ver detalle completo",
    })
    expect(show).toHaveAttribute("aria-expanded", "false")
    expectHiddenOrAbsent(panel)
  })

  it(`AR-06: pulsar «Enterado» en AV-9344 muestra un toast de éxito «${TOAST_AV_9344}» fuera del banner`, async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await acknowledge(user, banner)

    const toast = await findToast(TOAST_AV_9344)
    expect(toast).toHaveAttribute("data-type", "success")
    expect(screen.getByRole("main")).not.toContainElement(toast)
  })

  it(`AR-06: tras «Enterado», se ven «Vuelo AV-9478», «BOG → MDE» y «${LINE_AV_9478}», sin «pendiente» ni AV-9344`, async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await acknowledge(user, banner)

    const next = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(next).toHaveTextContent("Vuelo AV-9478"))
    expect(spokenText(next)).toContain("BOG → MDE")
    expect(spokenText(next)).toContain(
      "(Bogotá El Dorado → Medellín José María Córdova)"
    )
    const line = getSpokenLine(next, ["Mañana, 13:40 UTC", "1h 05m"])
    expect(spokenText(line)).toBe(LINE_AV_9478)
    expect(countDots(line), "la línea debe mostrar tres «·»").toBe(3)
    expect(within(next).queryByText(/pendiente/i)).not.toBeInTheDocument()
    expect(next).not.toHaveTextContent("Vuelo AV-9344")
    expect(screen.getAllByRole("region", { name: BANNER })).toHaveLength(1)
  })

  it("AR-06: si el detalle estaba abierto, la asignación siguiente aparece con el detalle cerrado y su propio motivo", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await user.click(
      within(banner).getByRole("button", { name: "Ver detalle completo" })
    )
    // Ancla: el detalle de AV-9344 sí estaba abierto antes de pulsar «Enterado».
    expect(
      within(banner).getByRole("button", { name: "Ocultar detalle" })
    ).toHaveAttribute("aria-expanded", "true")

    await acknowledge(user, banner)

    const next = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(next).toHaveTextContent("Vuelo AV-9478"))
    const toggle = within(next).getByRole("button", {
      name: "Ver detalle completo",
    })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    const panel = document.getElementById(
      toggle.getAttribute("aria-controls") ?? ""
    )
    expectHiddenOrAbsent(panel)

    // Al abrirlo, el detalle es el de AV-9478, no el de AV-9344.
    await user.click(toggle)
    const opened = document.getElementById(
      within(next)
        .getByRole("button", { name: "Ocultar detalle" })
        .getAttribute("aria-controls") ?? ""
    )
    expect(opened).toBeVisible()
    expect(opened).toHaveTextContent(
      "Aprobada por Supervisor Andrés Pardo (OCC Central)"
    )
    expect(opened).not.toHaveTextContent(/camila restrepo/i)
  })

  it("AR-06: tras «Enterado», el foco queda en el chip «Vuelo AV-9478»", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await acknowledge(user, banner)

    const chip = await screen.findByText("Vuelo AV-9478")
    await waitFor(() => expect(chip).toHaveFocus())
  })

  it("AR-07: tras «Enterado» en las dos asignaciones, la región desaparece y el foco pasa a main#contenido, no a body", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await acknowledge(user, banner)
    const next = await screen.findByRole("region", { name: BANNER })
    await waitFor(() => expect(next).toHaveTextContent("Vuelo AV-9478"))

    await acknowledge(user, next)

    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: BANNER })
      ).not.toBeInTheDocument()
    )
    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "contenido")
    await waitFor(() => expect(main).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("Inicio del tripulante: tarjetas", () => {
  it("HT-19: la tarjeta del próximo vuelo muestra itinerario, ruta, salida, puerta y rol", async () => {
    renderInicio()

    const card = await findCard("AV-8520")

    expect(card).toHaveTextContent(/itinerario confirmado/i)
    expect(card).toHaveTextContent("Mañana")
    expect(card).toHaveTextContent("BOG")
    expect(card).toHaveTextContent("CLO")
    expect(card).toHaveTextContent(/alfonso bonilla aragón/i)
    expect(card).toHaveTextContent("07:15 UTC")
    expect(card).toHaveTextContent("Puerta B4")
    expect(card).toHaveTextContent("Copiloto Activo")
  })

  it("HT-20: «Ver Briefing Operacional» es un botón aria-disabled, enfocable y con el texto «Próximamente»", async () => {
    renderInicio()

    const card = await findCard("AV-8520")
    const briefing = within(card).getByRole("button", {
      name: "Ver Briefing Operacional, próximamente",
    })

    expect(briefing).toHaveAttribute("aria-disabled", "true")
    expect(briefing).not.toHaveAttribute("disabled")
    expect(briefing).toHaveTextContent(/próximamente/i)
    briefing.focus()
    expect(briefing).toHaveFocus()
    expect(
      screen.queryByRole("link", { name: /ver briefing operacional/i })
    ).not.toBeInTheDocument()
  })

  it("HT-20: pulsar «Ver Briefing Operacional» no navega", async () => {
    const user = userEvent.setup()
    const router = renderInicio()

    const card = await findCard("AV-8520")
    await user.click(
      within(card).getByRole("button", {
        name: "Ver Briefing Operacional, próximamente",
      })
    )

    expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
    expect(router.state.location.hash).toBe("")
  })

  // Datos simulados reales de certifications.data (fechas relativas a hoy). Los casos con
  // fecha fijada y datos sustituidos están en InicioPage.dataStates.test.tsx.
  it("HL-06: la tarjeta de certificaciones calcula «4 Requisitos», «Evaluación Médica Clase 1» «En 35 días» y «Vigente», sin el examen psicofísico", async () => {
    renderInicio()

    const card = await findCard("Certificaciones")

    expect(card).toHaveTextContent(/habilitaciones rac/i)
    expect(within(card).getByText("Vigente")).toBeInTheDocument()
    expect(card).toHaveTextContent("Certificaciones Aptas:")
    expect(within(card).getByText("4 Requisitos")).toBeInTheDocument()
    expect(
      within(card).getByText("Evaluación Médica Clase 1")
    ).toBeInTheDocument()
    expect(within(card).getByText("En 35 días")).toBeInTheDocument()
    expect(card).not.toHaveTextContent(/examen psicofísico/i)
    expect(
      within(card).getByRole("link", { name: /consultar licencias/i })
    ).toHaveAttribute("href", PATHS.tripulante.certificaciones)
  })

  it("HL-07 (HT-22): la tarjeta de novedad o ausencia muestra el canal y el enlace para reportar, sin «Alineado con Política Safety & SMS»", async () => {
    renderInicio()

    const card = await findCard("Novedad o Ausencia")

    expect(card).toHaveTextContent(/canal occ rápido/i)
    expect(card).toHaveTextContent("Auto-Gestión")
    expect(card).toHaveTextContent(
      "Reporte oportuno por incapacidad médica, fatiga operacional o calamidad doméstica para activar relevos en cascada."
    )
    expect(card).not.toHaveTextContent(/alineado con política/i)
    expect(
      within(card).getByRole("link", { name: /reportar ausencia/i })
    ).toHaveAttribute("href", PATHS.tripulante.reportarAusencia)
  })

  it.each([
    {
      card: "Certificaciones",
      link: /consultar licencias/i,
      to: PATHS.tripulante.certificaciones,
      h1: "Certificaciones y Licencias",
    },
    {
      card: "Novedad o Ausencia",
      link: /reportar ausencia/i,
      to: PATHS.tripulante.reportarAusencia,
      h1: "Reportar Novedad de Ausencia",
    },
  ])(
    "HT-23: el enlace de la tarjeta «$card» lleva a $to dentro del mismo layout",
    async ({ card: title, link, to, h1 }) => {
      const user = userEvent.setup()
      const router = renderInicio()

      const card = await findCard(title)
      await user.click(within(card).getByRole("link", { name: link }))

      await waitFor(() => expect(router.state.location.pathname).toBe(to))
      expect(
        // Reportar Ausencia es lazy: margen para el chunk en frío.
        await screen.findByRole(
          "heading",
          { level: 1, name: h1 },
          { timeout: 3000 }
        )
      ).toBeInTheDocument()
      expect(
        screen.getByRole("navigation", { name: "Navegación principal" })
      ).toBeInTheDocument()
    }
  )
})

// CP-07 (spec configuracion-perfil, D1 = A): con el nombre completo en el store,
// el navbar y el saludo del Inicio siguen mostrando el nombre corto.
describe("CP-07: el navbar y el Inicio no cambian con el nombre completo", () => {
  it("CP-07: con el tripulante simulado, el botón se llama «Menú de perfil de Juan Pablo» y muestra las iniciales «JP»", async () => {
    renderInicio()

    const trigger = await screen.findByRole("button", {
      name: "Menú de perfil de Juan Pablo",
    })
    expect(within(trigger).getByText("JP")).toBeInTheDocument()
  })

  it("CP-07: con el tripulante simulado, el h1 del Inicio sigue siendo «Juan Pablo, Bienvenido a AirCrew»", async () => {
    renderInicio()

    expect(
      await screen.findByRole("heading", { level: 1, name: WELCOME })
    ).toBeInTheDocument()
  })

  it("CP-07 y D1: el menú de perfil lee displayName, no fullName", async () => {
    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    useAuthStore.setState({
      user: {
        ...(user as NonNullable<typeof user>),
        displayName: "Ana María",
        fullName: "Ana María Pérez Gómez",
      },
    })

    renderInicio()

    const trigger = await screen.findByRole("button", {
      name: "Menú de perfil de Ana María",
    })
    expect(within(trigger).getByText("AM")).toBeInTheDocument()
  })
})
