import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { API_URL } from "../mocks/authApi"
import {
  EMPTY_CERTIFICATION,
  mockMyAssignments,
  mockMyCertification,
  mockNextAssignment,
} from "../mocks/crewFlightsApi"
import {
  crewMemberErrorHandler,
  crewMemberHandler,
  REAL_CREW_MEMBER,
  REAL_USERS,
} from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { loadingStatuses, normalize } from "./realAbsencesTestUtils"

// Spec ausencias-reales, F1: Inicio del tripulante con sesión real (AU-01) y con la
// cuenta demo (AU-03). La base y el estado salen de GET /api/crew/crew-members/me.
// Desde FE-4 (cierre-pendientes) el Inicio real también pide el próximo vuelo, los
// reemplazos sin «Enterado» y la certificación propia: aquí el backend responde que no
// hay ninguno (404, lista vacía y expediente vacío), para comprobar los estados vacíos.

const STATUS_REGION = "Estado de asignación"
const BANNER = "Asignación de reemplazo"
const NO_FLIGHTS = "No tienes vuelos programados."
const NO_CERTIFICATIONS = "Aún no tienes certificaciones registradas."
const STATUS_ERROR = "No se pudo cargar el estado de asignación."
const ME_REQUEST = `GET ${API_URL}/api/admin/users/me`
// La campana del navbar pide los avisos guardados: tampoco es de la pantalla.
const BELL_REQUEST = `GET ${API_URL}/api/notification/notifications?limit=30`
// Peticiones del navbar (foto y campana), que no son de la pantalla.
const isNavbarRequest = (request: string) =>
  request === ME_REQUEST || request === BELL_REQUEST
// Peticiones del Inicio real (FE-4), sin repetidas y en orden alfabético.
const HOME_REQUESTS = [
  `GET ${API_URL}/api/crew/certifications/me`,
  `GET ${API_URL}/api/crew/crew-members/me`,
  `GET ${API_URL}/api/flights/assignments/me/next`,
  `GET ${API_URL}/api/flights/assignments/me?replacement=true&acknowledged=false`,
]
const NEXT_FLIGHT = "Próximo vuelo"
const DEMO_FLIGHT_LABEL = "Itinerario Confirmado"

// El párrafo de la tarjeta del reloj con «Condición operacional: …».
const conditionLine = (main: HTMLElement) => {
  const matches = Array.from(main.querySelectorAll<HTMLElement>("*")).filter(
    (element) => /Condición operacional/.test(element.textContent ?? "")
  )
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, "debe verse «Condición operacional»").toHaveLength(1)
  return innermost[0]
}

// El backend no tiene vuelos, reemplazos ni certificaciones para el tripulante.
const mockEmptyCrewData = () => {
  mockMyAssignments([])
  mockNextAssignment(null)
  mockMyCertification(EMPTY_CERTIFICATION)
}

const openRealHome = async (crewMember: object = REAL_CREW_MEMBER) => {
  mockEmptyCrewData()
  server.use(crewMemberHandler(crewMember))
  useAuthStore.getState().setUser(REAL_USERS.crew)
  renderRoute(PATHS.tripulante.inicio)
  await screen.findByRole("heading", {
    level: 1,
    name: `${REAL_USERS.crew.displayName}, Bienvenido a AirCrew`,
  })
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return main
}

describe("AU-01: Inicio con sesión real", () => {
  it.each([
    {
      status: "available",
      availability: "Disponible",
      condition: "Disponible",
    },
    { status: "on_duty", availability: "Disponible", condition: "En servicio" },
    { status: "in_flight", availability: "Disponible", condition: "En vuelo" },
    {
      status: "medical_leave",
      availability: "Incapacitado",
      condition: "Incapacidad médica",
    },
    // FE-2 (cierre-pendientes): el backend también tiene «vacation».
    { status: "vacation", availability: "Vacaciones", condition: "Vacaciones" },
  ])(
    "AU-01: con status «$status» la disponibilidad es «$availability» y la condición operacional «$condition»",
    async ({ status, availability, condition }) => {
      const main = await openRealHome({ ...REAL_CREW_MEMBER, status })

      const region = screen.getByRole("region", { name: STATUS_REGION })
      await waitFor(() => expect(region).toHaveTextContent(availability))
      expect(conditionLine(main)).toHaveTextContent(condition)
      // Los datos de ejemplo no se cuelan.
      expect(main).not.toHaveTextContent("Nivel Óptimo")
    }
  )

  it("AU-01: la base es current_location («MDE») y no la de ejemplo", async () => {
    const main = await openRealHome()

    await waitFor(() => expect(main).toHaveTextContent(/Base MDE\b/))
    expect(main).not.toHaveTextContent("BOG / SKBO")
  })

  it("AU-01: sin current_location se muestra «Sin base asignada»", async () => {
    const main = await openRealHome({
      ...REAL_CREW_MEMBER,
      current_location: null,
    })

    await waitFor(() => expect(main).toHaveTextContent("Sin base asignada"))
    expect(main).not.toHaveTextContent("BOG / SKBO")
  })

  it("AU-01: sin próximo vuelo (404) ni certificaciones, sus tarjetas muestran los estados vacíos, sin datos de ejemplo", async () => {
    const main = await openRealHome()

    expect(await within(main).findByText(NO_FLIGHTS)).toBeInTheDocument()
    expect(within(main).getByText(NO_CERTIFICATIONS)).toBeInTheDocument()
    expect(
      within(main).queryByRole("heading", { level: 2, name: "AV-8520" })
    ).toBeNull()
    expect(main).not.toHaveTextContent("AV-8520")
    expect(main).not.toHaveTextContent("Licencia ATP")
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
  })

  it("D1: sin vuelos, la tarjeta lleva la etiqueta «Próximo vuelo» y el Inicio no contiene «Itinerario Confirmado»", async () => {
    const main = await openRealHome()

    const heading = await within(main).findByRole("heading", {
      level: 2,
      name: NEXT_FLIGHT,
    })
    const card = heading.closest("article")
    expect(card, "la tarjeta del próximo vuelo es un article").not.toBeNull()
    // La etiqueta (con su ícono) va antes del h2 visualmente y después en el DOM: el
    // texto de la tarjeta es «Próximo vuelo» (h2) + estado vacío + «Próximo vuelo».
    expect(normalize(card?.textContent ?? null)).toBe(
      `${NEXT_FLIGHT}${NO_FLIGHTS}${NEXT_FLIGHT}`
    )
    expect(main).not.toHaveTextContent(DEMO_FLIGHT_LABEL)
  })

  it("AU-01: sin reemplazos pendientes en assignments/me no se muestra ninguna asignación de reemplazo", async () => {
    const main = await openRealHome()
    // Ancla: la pantalla ya pintó los estados vacíos.
    await within(main).findByText(NO_FLIGHTS)

    expect(screen.queryByRole("region", { name: BANNER })).toBeNull()
    expect(main).not.toHaveTextContent("AV-9344")
    expect(main).not.toHaveTextContent("AV-9478")
  })

  it("AU-01: la tarjeta para reportar ausencia sigue igual", async () => {
    const main = await openRealHome()
    await within(main).findByText(NO_FLIGHTS)

    const links = within(main)
      .getAllByRole("link")
      .filter(
        (link) =>
          link.getAttribute("href") === PATHS.tripulante.reportarAusencia
      )
    expect(links.length).toBeGreaterThan(0)
  })

  it("AU-01/FE-4: el Inicio real solo pide crew-members/me, assignments/me/next, los reemplazos sin «Enterado» y certifications/me", async () => {
    const requests = recordRequests()
    const main = await openRealHome()
    await within(main).findByText(NO_FLIGHTS)

    // El navbar pide el perfil para la foto (spec configuracion-real, CF-12) y la campana:
    // no son del Inicio, así que se quitan antes de comprobar.
    const homeRequests = requests.filter((request) => !isNavbarRequest(request))
    expect([...new Set(homeRequests)].sort()).toEqual(HOME_REQUESTS)
  })

  it("AU-01: si crew-members/me falla, la tarjeta «Estado de asignación» muestra su error en un role=alert", async () => {
    mockEmptyCrewData()
    server.use(crewMemberErrorHandler())
    useAuthStore.getState().setUser(REAL_USERS.crew)
    renderRoute(PATHS.tripulante.inicio)

    const region = await screen.findByRole("region", { name: STATUS_REGION })
    await waitFor(() =>
      expect(
        within(region)
          .queryAllByRole("alert")
          .filter((alert) => normalize(alert.textContent) === STATUS_ERROR)
      ).toHaveLength(1)
    )
    // El error no es de los datos de ejemplo: con ellos no habría fallo.
    expect(screen.getByRole("main")).not.toHaveTextContent("BOG / SKBO")
  })
})

describe("AU-03: Inicio con la cuenta demo", () => {
  it("AU-03: el tripulante demo sigue viendo la base, el vuelo, las certificaciones y la asignación de ejemplo, sin peticiones al backend", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    renderRoute(PATHS.tripulante.inicio)

    expect(
      await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    ).toBeInTheDocument()
    await screen.findByRole("heading", { level: 2, name: "Certificaciones" })
    await screen.findByRole("region", { name: BANNER })
    const main = screen.getByRole("main")
    await waitFor(() => expect(main).toHaveTextContent("Base BOG / SKBO"))
    expect(main).not.toHaveTextContent(NO_FLIGHTS)
    // D1: la demo conserva la etiqueta del diseño de ejemplo.
    expect(main).toHaveTextContent(DEMO_FLIGHT_LABEL)
    expect(requests).toEqual([])
  })
})
