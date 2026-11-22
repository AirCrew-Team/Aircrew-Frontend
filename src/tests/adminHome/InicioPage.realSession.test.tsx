import { screen, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { AIRCRAFT_URL, API_STATS as AIRCRAFT_STATS } from "../mocks/aircraftApi"
import { API_URL } from "../mocks/authApi"
import { CERTIFICATIONS_URL } from "../mocks/certificationsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { API_STATS as USERS_STATS, USERS_STATS_URL } from "../mocks/usersApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// FE-6 (docs/specs/cierre-pendientes.md, D7): con la sesión real, la bienvenida y el
// banner del Inicio del admin no muestran la base de Bogotá de los datos de ejemplo
// («BOG-HQ», «Base Eldorado», «SKBO», pista y QNH), sino textos neutros de la operación
// de Delta. Lo que el backend no tiene (condición operacional, pista, QNH) no se inventa:
// la condición queda en «—» y la pista y el QNH no se muestran. El admin no tiene base:
// no se pide bases/me. Con la cuenta demo sigue lo de siempre (InicioPage.test.tsx).

const H1 = `${REAL_USERS.admin.displayName}, Bienvenido a AirCrew`
const HERO_H2 = "Operaciones de la red Delta"
const COLOMBIAN_TEXTS = ["BOG", "Eldorado", "Bogotá", "SKBO", "RWY", "QNH"]
const INVENTED_TEXTS = [
  "Nivel Óptimo",
  "Operaciones Normales",
  "meteorológicas",
]

beforeEach(() => {
  // Las otras tarjetas del Inicio piden sus indicadores con la sesión real.
  server.use(
    http.get(USERS_STATS_URL, () => HttpResponse.json(USERS_STATS)),
    http.get(`${AIRCRAFT_URL}/stats`, () => HttpResponse.json(AIRCRAFT_STATS)),
    // FE-5: certificaciones y guardias también son reales.
    http.get(`${CERTIFICATIONS_URL}/stats`, () =>
      HttpResponse.json({
        total: 0,
        by_status: { verified: 0, pending_verification: 0, uncertified: 0 },
      })
    ),
    http.get(`${API_URL}/api/crew/shifts/current`, () =>
      HttpResponse.json({
        shift: "morning",
        base: null,
        flights_today: 0,
        standby_total: 0,
        standby_ready: 0,
        staffing_delays: 0,
      })
    )
  )
  useAuthStore.getState().setUser(REAL_USERS.admin)
})

const openHome = async () => {
  renderRoute(PATHS.superAdmin.inicio)
  await screen.findByRole("heading", { level: 1, name: H1 })
}

describe("FE-6: Inicio del admin con la sesión real", () => {
  it("FE-6: la bienvenida muestra la operación de Delta y la condición operacional en «—»", async () => {
    await openHome()

    const welcome = screen.getByRole("region", { name: H1 })
    expect(await within(welcome).findByText("Delta Air Lines")).toBeVisible()
    expect(welcome).toHaveTextContent("Condición Operacional—")
    for (const text of [...COLOMBIAN_TEXTS, ...INVENTED_TEXTS]) {
      expect(welcome).not.toHaveTextContent(text)
    }
  })

  it("FE-6: el banner tiene un h2 neutro de la red de Delta, sin pista ni QNH", async () => {
    await openHome()

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: HERO_H2,
    })
    const hero = heading.closest("section") as HTMLElement
    expect(hero).toHaveTextContent("Delta Air Lines")
    expect(hero.querySelectorAll("dl, dt, dd")).toHaveLength(0)
    expect(hero).not.toHaveTextContent("Pista activa")
    for (const text of [...COLOMBIAN_TEXTS, ...INVENTED_TEXTS]) {
      expect(hero).not.toHaveTextContent(text)
    }
  })

  it("FE-6: el admin no pide bases/me (no tiene base)", async () => {
    const requests = recordRequests()

    await openHome()
    await screen.findByRole("heading", { level: 2, name: HERO_H2 })

    expect(requests).not.toContain(`GET ${API_URL}/api/admin/bases/me`)
  })
})
