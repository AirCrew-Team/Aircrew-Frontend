import { screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { AIRCRAFT_URL, API_STATS as AIRCRAFT_STATS } from "../mocks/aircraftApi"
import { API_URL } from "../mocks/authApi"
import { CERTIFICATIONS_URL } from "../mocks/certificationsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { API_STATS as USERS_STATS, USERS_STATS_URL } from "../mocks/usersApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// FE-5 (docs/specs/cierre-pendientes.md, F12): con la sesión real, la tarjeta
// «Certificaciones y Licencias» sale de GET /api/crew/certifications/stats y el resumen de
// guardias de GET /api/crew/shifts/current SIN base (el admin no tiene base: el backend
// junta todas). Las stats no traen vencimientos: la tarjeta habla de verificación, no de
// renovaciones. Con la cuenta demo sigue lo de siempre (InicioPage.test.tsx).

const H1 = `${REAL_USERS.admin.displayName}, Bienvenido a AirCrew`
const SHIFTS_URL = `${API_URL}/api/crew/shifts/current`

const CERT_STATS = {
  total: 4,
  by_status: { verified: 2, pending_verification: 1, uncertified: 1 },
}

const CURRENT_SHIFT = {
  shift: "night",
  base: null,
  flights_today: 12,
  standby_total: 5,
  standby_ready: 3,
  staffing_delays: 2,
}

let shiftRequests: URL[]
let certRequests: number

beforeEach(() => {
  shiftRequests = []
  certRequests = 0
  server.use(
    http.get(USERS_STATS_URL, () => HttpResponse.json(USERS_STATS)),
    http.get(`${AIRCRAFT_URL}/stats`, () => HttpResponse.json(AIRCRAFT_STATS)),
    http.get(`${CERTIFICATIONS_URL}/stats`, () => {
      certRequests += 1
      return HttpResponse.json(CERT_STATS)
    }),
    http.get(SHIFTS_URL, ({ request }) => {
      shiftRequests.push(new URL(request.url))
      return HttpResponse.json(CURRENT_SHIFT)
    })
  )
  useAuthStore.getState().setUser(REAL_USERS.admin)
})

const openHome = async () => {
  renderRoute(PATHS.superAdmin.inicio)
  await screen.findByRole("heading", { level: 1, name: H1 })
}

const certificationsCard = async () =>
  (
    await screen.findByRole("heading", {
      level: 2,
      name: "Certificaciones y Licencias",
    })
  ).closest("article") as HTMLElement

describe("FE-5: tarjeta «Certificaciones y Licencias» con la sesión real", () => {
  it("FE-5 pide certifications/stats y muestra «1 por verificar», «2 de 4 verificados» y «1 sin certificado»", async () => {
    await openHome()
    const card = await certificationsCard()

    expect(await within(card).findByText("1 por verificar")).toBeVisible()
    expect(card).toHaveTextContent("2 de 4 verificados")
    expect(within(card).getByText("1 sin certificado")).toBeVisible()
    expect(certRequests).toBeGreaterThan(0)
  })

  it("FE-5 no muestra los datos de ejemplo de renovaciones (las stats no traen vencimientos)", async () => {
    await openHome()
    const card = await certificationsCard()
    await within(card).findByText("1 por verificar")

    for (const text of [
      "por renovar",
      "Alertas en",
      "Vigencia reglamentaria",
    ]) {
      expect(card).not.toHaveTextContent(text)
    }
  })

  it("FE-5 si certifications/stats falla, solo esa tarjeta muestra el error", async () => {
    server.use(
      http.get(`${CERTIFICATIONS_URL}/stats`, () =>
        HttpResponse.json({ error: "caído" }, { status: 500 })
      )
    )
    await openHome()
    const card = await certificationsCard()

    expect(
      await within(card).findByText(
        "No se pudo cargar el estado de las certificaciones."
      )
    ).toHaveAttribute("role", "alert")
  })
})

describe("FE-5: resumen de guardias con la sesión real", () => {
  // staffing_delays siempre llega en 0 del backend (revisión final): con la sesión real no
  // se presenta como dato.
  it("FE-5 pide shifts/current sin base y muestra el turno y la guardia, sin la cifra de demoras", async () => {
    await openHome()

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Sistema de suplencias en guardia listo",
    })
    const section = heading.closest("section") as HTMLElement
    expect(section).toHaveTextContent("Turno de la Noche")
    expect(section).toHaveTextContent(
      "5 tripulantes en Standby para el bloque nocturno."
    )
    expect(section).not.toHaveTextContent("demoras")
    await waitFor(() => expect(shiftRequests.length).toBeGreaterThan(0))
    for (const url of shiftRequests) {
      expect(url.searchParams.has("base"), url.search).toBe(false)
    }
  })

  it("FE-5 no muestra el turno de ejemplo («Turno de la Tarde», «bloque vespertino», 3 en Standby)", async () => {
    await openHome()
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Sistema de suplencias en guardia listo",
    })
    const section = heading.closest("section") as HTMLElement

    expect(section).not.toHaveTextContent("Turno de la Tarde")
    expect(section).not.toHaveTextContent("vespertino")
    expect(section).not.toHaveTextContent("3 tripulantes en Standby")
  })

  it.each([
    { shift: "morning", label: "Turno de la Mañana", block: "matutino" },
    { shift: "afternoon", label: "Turno de la Tarde", block: "vespertino" },
  ])(
    "FE-5 el turno «$shift» se muestra como «$label» y el bloque «$block»",
    async ({ shift, label, block }) => {
      server.use(
        http.get(SHIFTS_URL, () =>
          HttpResponse.json({ ...CURRENT_SHIFT, shift })
        )
      )
      await openHome()
      const heading = await screen.findByRole("heading", {
        level: 2,
        name: "Sistema de suplencias en guardia listo",
      })
      const section = heading.closest("section") as HTMLElement

      expect(section).toHaveTextContent(label)
      expect(section).toHaveTextContent(`para el bloque ${block}.`)
    }
  )

  it("FE-5 si shifts/current falla, el resumen muestra su error", async () => {
    server.use(
      http.get(SHIFTS_URL, () =>
        HttpResponse.json({ error: "caído" }, { status: 500 })
      )
    )
    await openHome()

    expect(
      await screen.findByText("No se pudo cargar el resumen de guardias.")
    ).toHaveAttribute("role", "alert")
  })
})
