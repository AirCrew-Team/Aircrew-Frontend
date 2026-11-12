import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast, queryAllToasts } from "../utils/toasts"

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

// Espera a que el banner tenga sus datos (mientras carga puede existir sin ellos).
const findBanner = async () => {
  const banner = await screen.findByRole("region", {
    name: /solicitud de reemplazo urgente/i,
  })
  await waitFor(() => expect(banner).toHaveTextContent(/vuelo av-9344/i))
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

  it("HT-26: el banner tiene un h2 «Solicitud de reemplazo urgente» dentro de su región", async () => {
    renderInicio()

    const banner = await findBanner()

    expect(
      within(banner).getByRole("heading", {
        level: 2,
        name: /solicitud de reemplazo urgente/i,
      })
    ).toBeInTheDocument()
  })

  it("HL-01: el orden del DOM es bienvenida, estado de asignación, solicitud, próximo vuelo, certificaciones y novedad o ausencia", async () => {
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
      { name: "solicitud", element: await findBanner() },
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

  it("HT-26: los bloques son section con nombre accesible", async () => {
    renderInicio()

    expect(
      await screen.findByRole("region", { name: /^estado de asignación/i })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("region", {
        name: /solicitud de reemplazo urgente/i,
      })
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

describe("Inicio del tripulante: solicitud de reemplazo urgente", () => {
  it("HL-04: el banner muestra el h2, el plazo fuera del h2, el vuelo y la ruta con la flecha audible", async () => {
    renderInicio()

    const banner = await findBanner()

    const heading = within(banner).getByRole("heading", {
      level: 2,
      name: "Solicitud de reemplazo urgente",
    })
    const deadline = within(banner).getByText("T-11:42 restantes")
    expect(heading).not.toContainElement(deadline)
    expect(banner).toHaveTextContent("Vuelo AV-9344")

    const spoken = spokenText(banner)
    expect(spoken).toContain("BOG → MIA")
    expect(spoken).toContain("Bogotá El Dorado → Miami Intl")
  })

  it("HL-04: la línea de datos se oye «Sale 16:15 UTC (11:15 local), Airbus A320neo, Primer Oficial (Copiloto), 3h 50m»", async () => {
    renderInicio()

    const banner = await findBanner()

    const line = getSpokenLine(banner, ["Sale 16:15 UTC", "3h 50m"])
    expect(spokenText(line)).toBe(
      "Sale 16:15 UTC (11:15 local), Airbus A320neo, Primer Oficial (Copiloto), 3h 50m"
    )
    // Ancla: los tres separadores se ven («·») aunque el lector no los oiga.
    expect(countDots(line), "la línea debe mostrar tres «·»").toBe(3)
  })

  it("HL-04: el motivo y la tripulación no se ven hasta abrir el detalle", async () => {
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

  it("HL-04: «Ruta & Meteorología», el plan de ruta y el METAR no aparecen, ni siquiera en el detalle", async () => {
    renderInicio()

    const banner = await findBanner()

    expect(banner).not.toHaveTextContent(/ruta & meteorología/i)
    expect(banner).not.toHaveTextContent(/ruta plan/i)
    expect(banner).not.toHaveTextContent(/W19 \/ MNX/)
    expect(banner).not.toHaveTextContent(/metar/i)
  })

  it("HL-05: «Ver detalle completo» empieza con aria-expanded=false y aria-controls a un panel oculto", async () => {
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

  it("HL-05: al abrirlo, el panel muestra «Motivo», «Tripulación a bordo» y «Descanso post-vuelo» en dt y el botón pasa a «Ocultar detalle»; al volver a pulsarlo, vuelve al inicio", async () => {
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
      "Incapacidad médica sobrevenida de tripulante titular. Solicita Supervisora Camila Restrepo (OCC Central). Cumple límites RAC 121 / Descanso Reglamentario."
    )
    expect(panel).toHaveTextContent("Comandante: Cap. Carlos Mendivelso")
    expect(panel).toHaveTextContent("Jefe de Cabina: Mariana Santos + 3 TCPs")
    expect(panel).toHaveTextContent("Descanso garantizado: 18h en KMIA")
    expect(panel).toHaveTextContent("Retorno asignado: AV-9345 día siguiente")

    await user.click(hide)

    const show = within(banner).getByRole("button", {
      name: "Ver detalle completo",
    })
    expect(show).toHaveAttribute("aria-expanded", "false")
    expectHiddenOrAbsent(panel)
  })

  const DIALOGS = [
    {
      trigger: "Aceptar",
      title: "Confirmar Aceptación de Reemplazo",
      confirm: "Confirmar Asignación",
      message: "Aceptaste la solicitud del vuelo AV-9344",
    },
    {
      trigger: "Rechazar",
      title: "Rechazar Solicitud de Contingencia",
      confirm: "Confirmar Rechazo",
      message: "Rechazaste la solicitud del vuelo AV-9344",
    },
  ]

  it("HT-15: «Aceptar» abre un alertdialog con el vuelo y la hora en la descripción", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await user.click(within(banner).getByRole("button", { name: /^aceptar$/i }))

    const dialog = await screen.findByRole("alertdialog", {
      name: "Confirmar Aceptación de Reemplazo",
    })
    expect(dialog).toHaveAccessibleDescription(/AV-9344/)
    expect(dialog).toHaveAccessibleDescription(/16:15 UTC/)
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Confirmar Asignación" })
    ).toBeInTheDocument()
  })

  it("HT-16: «Rechazar» abre un alertdialog «Rechazar Solicitud de Contingencia»", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await user.click(
      within(banner).getByRole("button", { name: /^rechazar$/i })
    )

    const dialog = await screen.findByRole("alertdialog", {
      name: "Rechazar Solicitud de Contingencia",
    })
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Confirmar Rechazo" })
    ).toBeInTheDocument()
  })

  it.each(DIALOGS)(
    "HT-17: al abrir «$trigger», el foco queda dentro del diálogo",
    async ({ trigger, title }) => {
      const user = userEvent.setup()
      renderInicio()

      const banner = await findBanner()
      await user.click(
        within(banner).getByRole("button", {
          name: new RegExp(`^${trigger}$`, "i"),
        })
      )

      const dialog = await screen.findByRole("alertdialog", { name: title })
      await waitFor(() =>
        expect(dialog).toContainElement(document.activeElement as HTMLElement)
      )
    }
  )

  it.each(DIALOGS)(
    "HT-17: en «$trigger», «Cancelar» cierra sin cambios y devuelve el foco al botón",
    async ({ trigger, title, message }) => {
      const user = userEvent.setup()
      renderInicio()

      const banner = await findBanner()
      const opener = within(banner).getByRole("button", {
        name: new RegExp(`^${trigger}$`, "i"),
      })
      await user.click(opener)
      const dialog = await screen.findByRole("alertdialog", { name: title })

      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
      )
      await waitFor(() => expect(opener).toHaveFocus())
      expect(opener).toBeEnabled()
      expect(banner).not.toHaveTextContent(message)
    }
  )

  it.each(DIALOGS)(
    "HT-17: en «$trigger», Escape cierra sin cambios y devuelve el foco al botón",
    async ({ trigger, title, message }) => {
      const user = userEvent.setup()
      renderInicio()

      const banner = await findBanner()
      const opener = within(banner).getByRole("button", {
        name: new RegExp(`^${trigger}$`, "i"),
      })
      await user.click(opener)
      await screen.findByRole("alertdialog", { name: title })

      await user.keyboard("{Escape}")

      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
      )
      await waitFor(() => expect(opener).toHaveFocus())
      expect(opener).toBeEnabled()
      expect(banner).not.toHaveTextContent(message)
    }
  )

  // Abre el diálogo de «trigger», confirma y espera a que se cierre.
  const confirmDecision = async ({
    trigger,
    title,
    confirm,
  }: (typeof DIALOGS)[number]) => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await user.click(
      within(banner).getByRole("button", {
        name: new RegExp(`^${trigger}$`, "i"),
      })
    )
    const dialog = await screen.findByRole("alertdialog", { name: title })

    await user.click(within(dialog).getByRole("button", { name: confirm }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    return banner
  }

  it.each(DIALOGS)(
    "SN-03: en «$trigger», «Cancelar» no muestra ningún toast",
    async ({ trigger, title }) => {
      const user = userEvent.setup()
      renderInicio()

      const banner = await findBanner()
      await user.click(
        within(banner).getByRole("button", {
          name: new RegExp(`^${trigger}$`, "i"),
        })
      )
      const dialog = await screen.findByRole("alertdialog", { name: title })
      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
      )
      expect(queryAllToasts()).toHaveLength(0)
    }
  )

  it.each(DIALOGS)(
    "SN-03: al confirmar «$trigger», aparece un toast de éxito «$message»",
    async (dialog) => {
      const banner = await confirmDecision(dialog)

      const toast = await findToast(dialog.message)
      expect(toast).toHaveAttribute("data-type", "success")
      expect(banner).not.toContainElement(toast)
    }
  )

  it.each(DIALOGS)(
    "SN-03 y HT-18: al confirmar «$trigger», «$message» sigue visible en el banner sin role=status ni tabIndex, y las acciones quedan deshabilitadas",
    async (dialog) => {
      const banner = await confirmDecision(dialog)

      await waitFor(() => expect(banner).toHaveTextContent(dialog.message))
      const result = within(banner).getByText(dialog.message)
      expect(result).toBeVisible()
      expect(result).not.toHaveAttribute("role")
      expect(result).not.toHaveAttribute("tabindex")
      // Ya cargado, el banner no tiene ningún role=status (ni el del resultado).
      expect(within(banner).queryAllByRole("status")).toHaveLength(0)
      expect(
        within(banner).getByRole("button", { name: /^aceptar$/i })
      ).toBeDisabled()
      expect(
        within(banner).getByRole("button", { name: /^rechazar$/i })
      ).toBeDisabled()
    }
  )

  it.each(DIALOGS)(
    "SN-03 y HL-05: al cerrarse el diálogo de «$trigger», el foco pasa a «Ver detalle completo», que sigue habilitado",
    async (dialog) => {
      const banner = await confirmDecision(dialog)

      const detail = within(banner).getByRole("button", {
        name: "Ver detalle completo",
      })
      // Si volviera a Aceptar/Rechazar (deshabilitados) caería en body.
      await waitFor(() => expect(detail).toHaveFocus())
      expect(detail).toBeEnabled()
    }
  )
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
