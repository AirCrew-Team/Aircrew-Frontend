import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { API_URL } from "../mocks/authApi"
import {
  EMPTY_CERTIFICATION,
  mockMetrics,
  mockMyAbsences,
  mockMyAssignments,
  mockMyCertification,
  TODAY,
} from "../mocks/crewFlightsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { LAZY, loadingStatuses, normalize } from "./realAbsencesTestUtils"

// Spec ausencias-reales, F2: Mis vuelos y Certificaciones con sesión real muestran su
// estado vacío sin datos de ejemplo (AU-02); con la cuenta demo siguen los datos de
// ejemplo, sin peticiones (AU-03). Desde FE-4 (cierre-pendientes) la sesión real pide sus
// datos al backend: aquí responde que no hay vuelos, ausencias ni certificaciones.

const FLIGHTS_H1 = "Mis Vuelos Asignados"

// GET del perfil que hace MainLayout con sesión real (foto del navbar, configuracion-real A4).
const ME_REQUEST = `GET ${API_URL}/api/admin/users/me`
// La campana del navbar pide los avisos guardados: tampoco es de la pantalla.
const BELL_REQUEST = `GET ${API_URL}/api/notification/notifications?limit=30`
// Peticiones del navbar (foto y campana), que no son de la pantalla.
const isNavbarRequest = (request: string) =>
  request === ME_REQUEST || request === BELL_REQUEST
const CERTIFICATIONS_H1 = "Certificaciones y Licencias"

// Peticiones de cada pantalla real (FE-4), sin repetidas y en orden alfabético. «Hoy» es
// TODAY (22 Nov 2026): las listas piden noviembre de 2026 en hora local (from/to).
const MONTH_RANGE = `from=${new Date(2026, 10, 1).toISOString()}&to=${new Date(2026, 11, 1).toISOString()}`
const FLIGHTS_REQUESTS = [
  `GET ${API_URL}/api/crew/absences/me`,
  `GET ${API_URL}/api/crew/crew-members/me/metrics`,
  `GET ${API_URL}/api/flights/assignments/me?status=completed&${MONTH_RANGE}`,
  `GET ${API_URL}/api/flights/assignments/me?status=upcoming&${MONTH_RANGE}`,
]
const CERTIFICATIONS_REQUESTS = [`GET ${API_URL}/api/crew/certifications/me`]

const screenRequests = (requests: string[]) =>
  [...new Set(requests.filter((request) => !isNavbarRequest(request)))].sort()

// Supuesto: el estado vacío de cada lista dice «No hay vuelos…» o «No tienes vuelos…»
// (hoy: «No hay vuelos para este mes.»).
const NO_FLIGHTS = /^No (hay|tienes) vuelos/
// Supuesto: «No hay licencias cargadas en el expediente.» (el de hoy) o el del Inicio.
const NO_CERTIFICATIONS =
  /^(No hay licencias cargadas|Aún no tienes certificaciones)/

// Valores de ejemplo de las métricas y de las listas (flights.data y certifications.data).
const DEMO_FLIGHT_TEXTS = [
  "AV-9344",
  "AV-8520",
  "AV-9210",
  "45h 00m",
  "16h 20m",
]
const DEMO_CERTIFICATION_TEXTS = [
  "Licencia ATP (Airline Transport Pilot)",
  "Evaluación Médica Clase 1",
  "Type Rating A320 Family",
]

const activePanel = () =>
  waitFor(() => {
    const panels = screen.getAllByRole("tabpanel")
    expect(panels, "un único tabpanel visible").toHaveLength(1)
    return panels[0]
  })

const expectEmptyFlightsPanel = async () => {
  const panel = await activePanel()
  expect(within(panel).queryAllByRole("article")).toHaveLength(0)
  expect(
    Array.from(panel.querySelectorAll<HTMLElement>("*")).some((element) =>
      NO_FLIGHTS.test(normalize(element.textContent))
    ),
    "debe verse el estado vacío de la lista"
  ).toBe(true)
}

const openLoaded = async (path: string, h1: string) => {
  renderRoute(path)
  await screen.findByRole("heading", { level: 1, name: h1 }, LAZY)
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return main
}

afterEach(() => {
  vi.useRealTimers()
})

describe("AU-02: Mis vuelos con sesión real", () => {
  it("AU-02/FE-4: sin vuelos en el mes, Próximos e Historial muestran su estado vacío, sin vuelos ni métricas de ejemplo, y solo se piden las listas del mes, las métricas y las ausencias propias", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(TODAY)
    mockMyAssignments([])
    mockMetrics()
    mockMyAbsences([])
    const requests = recordRequests()
    useAuthStore.getState().setUser(REAL_USERS.crew)
    const user = userEvent.setup()

    const main = await openLoaded(PATHS.tripulante.misVuelos, FLIGHTS_H1)

    await expectEmptyFlightsPanel()
    for (const text of DEMO_FLIGHT_TEXTS) {
      expect(main).not.toHaveTextContent(text)
    }
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)

    await user.click(
      screen.getByRole("tab", { name: /^Historial de Vuelos Anteriores/ })
    )
    await expectEmptyFlightsPanel()
    expect(main).not.toHaveTextContent("AV-9102")

    // Además del perfil y la campana del navbar, solo las peticiones de la pantalla.
    expect(screenRequests(requests)).toEqual(FLIGHTS_REQUESTS)
  })
})

describe("AU-02: Certificaciones con sesión real", () => {
  it("AU-02/FE-4: con el expediente vacío muestra el estado vacío, sin licencias de ejemplo, y solo se pide certifications/me", async () => {
    mockMyCertification(EMPTY_CERTIFICATION)
    const requests = recordRequests()
    useAuthStore.getState().setUser(REAL_USERS.crew)

    const main = await openLoaded(
      PATHS.tripulante.certificaciones,
      CERTIFICATIONS_H1
    )

    await waitFor(() =>
      expect(
        Array.from(main.querySelectorAll<HTMLElement>("p")).some((element) =>
          NO_CERTIFICATIONS.test(normalize(element.textContent))
        ),
        "debe verse el estado vacío de las licencias"
      ).toBe(true)
    )
    for (const text of DEMO_CERTIFICATION_TEXTS) {
      expect(main).not.toHaveTextContent(text)
    }
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    // Además del perfil y la campana del navbar, solo la certificación propia.
    expect(screenRequests(requests)).toEqual(CERTIFICATIONS_REQUESTS)
  })
})

describe("AU-03: Mis vuelos y Certificaciones con la cuenta demo", () => {
  it("AU-03: el tripulante demo sigue viendo los vuelos y las métricas de ejemplo, sin peticiones", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)

    const main = await openLoaded(PATHS.tripulante.misVuelos, FLIGHTS_H1)

    const panel = await activePanel()
    await waitFor(() =>
      expect(within(panel).getAllByRole("article").length).toBeGreaterThan(0)
    )
    expect(main).toHaveTextContent("AV-9344")
    expect(main).toHaveTextContent("45h 00m")
    expect(requests).toEqual([])
  })

  it("AU-03: el tripulante demo sigue viendo las licencias de ejemplo, sin peticiones", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)

    const main = await openLoaded(
      PATHS.tripulante.certificaciones,
      CERTIFICATIONS_H1
    )

    await waitFor(() =>
      expect(main).toHaveTextContent(DEMO_CERTIFICATION_TEXTS[0])
    )
    expect(requests).toEqual([])
  })
})
