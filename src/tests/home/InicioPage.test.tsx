import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Pantalla completa con los datos simulados reales de home.data.ts y la sesión del tripulante por defecto.

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

describe("Inicio del tripulante: página", () => {
  it("HT-02: hay un único h1 «Juan Pablo, Bienvenido a AirCrew»", async () => {
    renderInicio()

    expect(
      await screen.findByRole("heading", { level: 1, name: WELCOME })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("HT-02: el nombre del h1 sale de la sesión, no de los datos simulados", async () => {
    const user = useAuthStore.getState().user
    expect(user).not.toBeNull()
    useAuthStore.setState({
      user: { ...(user as NonNullable<typeof user>), fullName: "Ana María" },
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

  // jsdom no aplica order-first: lo que se comprueba es el orden en el DOM, que es el que sigue el lector de pantalla.
  it.each([
    { card: "AV-8520", badge: "Mañana" },
    { card: "Certificaciones", badge: "Vigente" },
    { card: "Novedad o Ausencia", badge: "Auto-Gestión" },
  ])(
    "HT-26: en la tarjeta «$card», el distintivo «$badge» va después del h2 en el DOM",
    async ({ card: title, badge: label }) => {
      renderInicio()

      const card = await findCard(title)
      const heading = within(card).getByRole("heading", {
        level: 2,
        name: title,
      })
      const badge = within(card).getByText(label)

      expect(
        heading.compareDocumentPosition(badge) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        `«${label}» debe ir después del h2 «${title}» en el DOM`
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
  it("HT-05: muestra la base, el subtítulo, el reloj maestro, «Sincronizado» y la condición operacional", async () => {
    renderInicio()

    const main = await screen.findByRole("main")
    await waitFor(() => expect(main).toHaveTextContent(/nivel óptimo/i))

    expect(main).toHaveTextContent(/base bog \/ skbo/i)
    expect(main).toHaveTextContent(/portal operacional de vuelo/i)
    expect(main).toHaveTextContent(/reloj maestro/i)
    expect(main).toHaveTextContent(/sincronizado/i)
    expect(main).toHaveTextContent(/condición operacional/i)
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
  it("HT-10: grupo de radio «Estado de asignación» con Disponible marcado al cargar", async () => {
    renderInicio()

    const group = await screen.findByRole("radiogroup", {
      name: /^estado de asignación$/i,
    })
    const radios = await within(group).findAllByRole("radio")

    // Por nombre accesible: vale igual para <input type="radio"> con <label> que para role="radio".
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveAccessibleName("Disponible")
    expect(radios[1]).toHaveAccessibleName("Vacaciones")
    expect(radios[2]).toHaveAccessibleName("Incapacitado")
    expect(
      within(group).getByRole("radio", { name: "Disponible" })
    ).toBeChecked()
    expect(
      within(group).getByRole("radio", { name: "Vacaciones" })
    ).not.toBeChecked()
    expect(
      within(group).getByRole("radio", { name: "Incapacitado" })
    ).not.toBeChecked()
  })

  it("HT-11: con clic, la opción elegida queda marcada y la anterior se desmarca", async () => {
    const user = userEvent.setup()
    renderInicio()

    const group = await screen.findByRole("radiogroup", {
      name: /^estado de asignación$/i,
    })
    const disponible = await within(group).findByRole("radio", {
      name: "Disponible",
    })
    const vacaciones = within(group).getByRole("radio", { name: "Vacaciones" })

    await user.click(vacaciones)

    expect(vacaciones).toBeChecked()
    expect(disponible).not.toBeChecked()
  })

  it("HT-11: con las flechas del teclado, la selección pasa a la opción siguiente", async () => {
    const user = userEvent.setup()
    renderInicio()

    const group = await screen.findByRole("radiogroup", {
      name: /^estado de asignación$/i,
    })
    const disponible = await within(group).findByRole("radio", {
      name: "Disponible",
    })
    await user.click(disponible)
    expect(disponible).toHaveFocus()

    await user.keyboard("{ArrowRight}")
    expect(
      within(group).getByRole("radio", { name: "Vacaciones" })
    ).toBeChecked()
    expect(disponible).not.toBeChecked()

    await user.keyboard("{ArrowRight}")
    expect(
      within(group).getByRole("radio", { name: "Incapacitado" })
    ).toBeChecked()
    expect(
      within(group).getByRole("radio", { name: "Vacaciones" })
    ).not.toBeChecked()
  })
})

describe("Inicio del tripulante: solicitud de reemplazo urgente", () => {
  it("HT-12: el banner muestra plazo, vuelo, ruta, horas, equipo, posición, duración y solicitante", async () => {
    renderInicio()

    const banner = await findBanner()

    expect(banner).toHaveTextContent(/t-11:42 restantes/i)
    expect(banner).toHaveTextContent("Vuelo AV-9344")
    expect(banner).toHaveTextContent("BOG")
    expect(banner).toHaveTextContent("MIA")
    expect(banner).toHaveTextContent(/bogotá el dorado/i)
    expect(banner).toHaveTextContent(/miami intl/i)
    expect(banner).toHaveTextContent("16:15 UTC")
    expect(banner).toHaveTextContent("11:15 Local")
    expect(banner).toHaveTextContent("Airbus A320neo")
    expect(banner).toHaveTextContent("Primer Oficial (Copiloto)")
    expect(banner).toHaveTextContent("3h 50m")
    expect(banner).toHaveTextContent(/motivo/i)
    expect(banner).toHaveTextContent(
      "Supervisora Camila Restrepo (OCC Central)"
    )
  })

  it("HT-14: el detalle empieza oculto, con aria-expanded=false y aria-controls al panel", async () => {
    renderInicio()

    const banner = await findBanner()
    const toggle = within(banner).getByRole("button", {
      name: /ver detalle completo de la solicitud/i,
    })

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    const panelId = toggle.getAttribute("aria-controls")
    expect(panelId).toBeTruthy()
    expectHiddenOrAbsent(document.getElementById(panelId ?? ""))
    expectHiddenOrAbsent(screen.queryByText(/tripulación a bordo/i))
  })

  it("HT-14: al pulsarlo se muestra el panel y el botón cambia a «Ocultar»; al volver a pulsarlo, vuelve al inicio", async () => {
    const user = userEvent.setup()
    renderInicio()

    const banner = await findBanner()
    await user.click(
      within(banner).getByRole("button", {
        name: /ver detalle completo de la solicitud/i,
      })
    )

    const hide = within(banner).getByRole("button", {
      name: /ocultar detalle de la solicitud/i,
    })
    expect(hide).toHaveAttribute("aria-expanded", "true")
    const panel = document.getElementById(
      hide.getAttribute("aria-controls") ?? ""
    )
    expect(panel).not.toBeNull()
    expect(panel).toBeVisible()
    expect(panel).toHaveTextContent(/tripulación a bordo/i)
    expect(panel).toHaveTextContent(/ruta & meteorología/i)
    expect(panel).toHaveTextContent(/ventana de descanso post-vuelo/i)

    await user.click(hide)

    const show = within(banner).getByRole("button", {
      name: /ver detalle completo de la solicitud/i,
    })
    expect(show).toHaveAttribute("aria-expanded", "false")
    expectHiddenOrAbsent(screen.queryByText(/tripulación a bordo/i))
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

  it.each(DIALOGS)(
    "HT-18: al confirmar «$trigger», se cierra, se anuncia «$message», el foco pasa al mensaje y las acciones quedan deshabilitadas",
    async ({ trigger, title, confirm, message }) => {
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
      await waitFor(() =>
        expect(within(banner).getByRole("status")).toHaveTextContent(message)
      )
      // El foco pasa al mensaje de resultado; si volviera a Aceptar/Rechazar (deshabilitados) caería en body.
      await waitFor(() =>
        expect(within(banner).getByRole("status")).toHaveFocus()
      )
      expect(
        within(banner).getByRole("button", { name: /^aceptar$/i })
      ).toBeDisabled()
      expect(
        within(banner).getByRole("button", { name: /^rechazar$/i })
      ).toBeDisabled()
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

  it("HT-21: la tarjeta de certificaciones muestra estado, requisitos, vencimiento y el enlace a licencias", async () => {
    renderInicio()

    const card = await findCard("Certificaciones")

    expect(card).toHaveTextContent(/habilitaciones rac/i)
    expect(card).toHaveTextContent("Vigente")
    expect(card).toHaveTextContent(/certificaciones aptas/i)
    expect(card).toHaveTextContent("4 Requisitos")
    expect(card).toHaveTextContent("Médico Clase 1")
    expect(card).toHaveTextContent("En 35 días")
    expect(card).toHaveTextContent(/psicofísico/i)
    expect(
      within(card).getByRole("link", { name: /consultar licencias/i })
    ).toHaveAttribute("href", PATHS.tripulante.certificaciones)
  })

  it("HT-22: la tarjeta de novedad o ausencia muestra el canal, la política y el enlace para reportar", async () => {
    renderInicio()

    const card = await findCard("Novedad o Ausencia")

    expect(card).toHaveTextContent(/canal occ rápido/i)
    expect(card).toHaveTextContent("Auto-Gestión")
    expect(card).toHaveTextContent(/alineado con política safety & sms/i)
    expect(
      within(card).getByRole("link", { name: /reportar ausencia/i })
    ).toHaveAttribute("href", PATHS.tripulante.reportarAusencia)
  })

  it.each([
    {
      card: "Certificaciones",
      link: /consultar licencias/i,
      to: PATHS.tripulante.certificaciones,
      h1: "Certificaciones",
    },
    {
      card: "Novedad o Ausencia",
      link: /reportar ausencia/i,
      to: PATHS.tripulante.reportarAusencia,
      h1: "Reportar Ausencia",
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
        await screen.findByRole("heading", { level: 1, name: h1 })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("navigation", { name: "Navegación principal" })
      ).toBeInTheDocument()
    }
  )
})
