import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Inicio del supervisor (spec docs/specs/inicio-supervisor.md, criterios IS-03…IS-06 e IS-09):
// contenido con los datos simulados reales de supervisorHome.data.ts.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
})

const H1 = "Camila Restrepo, Bienvenida a AirCrew"

// Espera el h1 exacto: los negativos de cada test solo valen si la página ya está montada.
const renderHome = async () => {
  const router = renderRoute(PATHS.superVisor.inicio)
  await screen.findByRole("heading", { level: 1, name: H1 })
  return router
}

const findArticle = async (title: string) =>
  (await screen.findByRole("heading", { level: 2, name: title })).closest(
    "article"
  ) as HTMLElement

describe("Inicio del supervisor: bienvenida (IS-03)", () => {
  it("IS-03 muestra la etiqueta, el h1 exacto, el reloj y la condición operacional", async () => {
    await renderHome()

    const welcome = screen.getByRole("region", { name: H1 })
    expect(
      await within(welcome).findByText("Supervisión de Guardia")
    ).toBeInTheDocument()
    expect(welcome).toHaveTextContent("/ BOG-HQ Base Eldorado")
    expect(within(welcome).getByText("Reloj maestro")).toBeInTheDocument()
    expect(welcome.querySelector("time")?.textContent).toMatch(
      /^\d{2}:\d{2} UTC$/
    )
    expect(
      within(welcome).getByText("Condición Operacional")
    ).toBeInTheDocument()
    expect(within(welcome).getByText("Nivel Óptimo")).toBeInTheDocument()
  })

  it("IS-03 no muestra el subtítulo del admin ni la barra decorativa del reloj", async () => {
    await renderHome()

    const welcome = screen.getByRole("region", { name: H1 })
    await within(welcome).findByText("Nivel Óptimo")
    expect(screen.queryByText(/Centro de Operaciones/)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Despacho Aéreo • Turno Activo/)
    ).not.toBeInTheDocument()
    // La spec nombra la barra (h-1 decorativa) del reloj: no debe existir en la bienvenida.
    expect(
      welcome.querySelector('[aria-hidden="true"].h-1'),
      "la bienvenida del supervisor no lleva la barra h-1 bajo el reloj"
    ).toBeNull()
  })
})

describe("Inicio del supervisor: foto del turno (IS-04)", () => {
  it("IS-04 muestra la etiqueta, la ubicación, el h2 y el párrafo", async () => {
    await renderHome()

    const hero = await screen.findByRole("region", {
      name: "Disponibilidad y Relevos en Tiempo Real",
    })
    expect(
      within(hero).getByRole("heading", {
        level: 2,
        name: "Disponibilidad y Relevos en Tiempo Real",
      })
    ).toBeInTheDocument()
    expect(
      within(hero).getByText("Control Operacional y Contingencias")
    ).toBeInTheDocument()
    expect(
      within(hero).getByText("SKBO • Hub Central Eldorado")
    ).toBeInTheDocument()
    expect(
      within(hero).getByText(
        "Monitoreo permanente de turnos, guardias activas y contingencias inmediatas para garantizar la puntualidad de vuelo."
      )
    ).toBeInTheDocument()
  })

  it("IS-04 muestra «Vuelos hoy» «42 Vuelos» y «Guardia activa» «100% Lista» en un dl", async () => {
    await renderHome()

    const hero = await screen.findByRole("region", {
      name: "Disponibilidad y Relevos en Tiempo Real",
    })
    const dl = hero.querySelector("dl")
    expect(dl, "los datos de la foto van en un dl").not.toBeNull()
    const terms = Array.from(dl!.querySelectorAll("dt")).map((dt) =>
      dt.textContent?.trim()
    )
    const values = Array.from(dl!.querySelectorAll("dd")).map((dd) =>
      dd.textContent?.trim()
    )
    expect(terms).toEqual(["Vuelos hoy", "Guardia activa"])
    expect(values).toEqual(["42 Vuelos", "100% Lista"])
  })
})

const CARDS = [
  {
    title: "Solicitudes de Reemplazo",
    description:
      "Sugerencias de reemplazo propuestas por la IA, pendientes de tu aprobación.",
    badge: "5 por aprobar",
    metricLabel: "Tasa de resolución",
    metricValue: "85.7% Resuelto",
    link: "Revisar Solicitudes",
    path: PATHS.superVisor.solicitudesReemplazo,
  },
  {
    title: "Ausencias",
    description:
      "Novedades médicas y operacionales de tripulantes, priorizadas por impacto en itinerario.",
    badge: "3 abiertas",
    metricLabel: "Salidas críticas",
    metricValue: "1 crítica <2h",
    link: "Gestionar Ausencias",
    path: PATHS.superVisor.ausencias,
  },
  {
    title: "Tripulación",
    description: "Disponibilidad y guardias de la tripulación del turno.",
    badge: "34 en servicio",
    metricLabel: "Disponibilidad en turno",
    metricValue: "92% Apto",
    link: "Ver Tripulación",
    path: PATHS.superVisor.tripulacion,
  },
]

describe("Inicio del supervisor: tarjetas (IS-05)", () => {
  it("IS-05 las 3 tarjetas son article, en orden: Solicitudes de Reemplazo, Ausencias, Tripulación", async () => {
    await renderHome()

    await screen.findByRole("heading", { level: 2, name: CARDS[0].title })
    const titles = screen
      .getAllByRole("article")
      .map(
        (article) =>
          within(article).getByRole("heading", { level: 2 }).textContent
      )
    expect(titles).toEqual(CARDS.map((card) => card.title))
    for (const card of CARDS) {
      expect(screen.getByRole("article", { name: card.title })).toBeVisible()
    }
  })

  it.each(CARDS)(
    "IS-05 la tarjeta «$title» muestra su descripción, distintivo, dato y enlace",
    async ({ title, description, badge, metricLabel, metricValue, link }) => {
      await renderHome()

      const card = await findArticle(title)
      expect(card, `«${title}» debe estar dentro de un article`).not.toBeNull()
      expect(within(card).getByText(description)).toBeInTheDocument()
      expect(await within(card).findByText(badge)).toBeInTheDocument()
      expect(within(card).getByText(metricLabel)).toBeInTheDocument()
      expect(within(card).getByText(metricValue)).toBeInTheDocument()
      expect(within(card).getByRole("link", { name: link })).toBeInTheDocument()
    }
  )

  it.each(CARDS)(
    "IS-05 «$link» lleva a $path",
    async ({ title, link, path }) => {
      const user = userEvent.setup()
      const router = await renderHome()

      const card = await findArticle(title)
      await user.click(within(card).getByRole("link", { name: link }))

      await waitFor(() => expect(router.state.location.pathname).toBe(path))
    }
  )
})

describe("Inicio del supervisor: sin franja de guardia (IS-06)", () => {
  it("IS-06 no hay franja de disponibilidad de guardia ni botón «Convocar Guardia»; el pie sigue", async () => {
    await renderHome()

    // Ancla positiva: la última tarjeta ya está montada.
    await screen.findByText("34 en servicio")
    expect(
      screen.queryByRole("button", { name: /convocar guardia/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/disponibilidad de guardia/i)
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/en standby/i)).not.toBeInTheDocument()
    expect(
      screen.getByText("AirCrew Operational Deck • UTC Synchronized")
    ).toBeInTheDocument()
  })
})

describe("Inicio del supervisor: navbar y h1 (IS-09)", () => {
  it("IS-09 el navbar del supervisor tiene Inicio, Solicitudes de Reemplazo, Tripulación y Ausencias", async () => {
    await renderHome()

    const nav = screen.getAllByRole("navigation")[0]
    for (const label of [
      "Inicio",
      "Solicitudes de Reemplazo",
      "Tripulación",
      "Ausencias",
    ]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument()
    }
    for (const adminLabel of ["Usuarios", "Aeronaves", "Certificaciones"]) {
      expect(
        within(nav).queryByRole("link", { name: adminLabel })
      ).not.toBeInTheDocument()
    }
  })

  it("IS-09 la pantalla tiene un solo h1", async () => {
    await renderHome()

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })
})
