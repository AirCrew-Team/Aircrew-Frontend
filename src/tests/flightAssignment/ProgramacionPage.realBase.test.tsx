import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// FE-6 (docs/specs/cierre-pendientes.md, D7): con la sesión real, el antetítulo de
// Programación toma la base de GET /api/admin/bases/me en vez de «Base Eldorado · BOG»
// fijo. Sin base (404 `no_base`) se queda sin ese tramo. Con la cuenta demo sigue el
// texto de siempre (PG-01) y no se pide la base.

const BASE_ME_URL = `${API_URL}/api/admin/bases/me`
const SCHEDULE_DAYS_URL = `${API_URL}/api/recommendation/schedule/days`
const SCHEDULE_URL = `${API_URL}/api/recommendation/schedule`

const JFK_BASE = {
  unit: "Operaciones de Vuelo Nueva York JFK",
  hq_code: "JFK-HQ",
  base_name: "John F. Kennedy International",
  city: "Nueva York",
  iata: "JFK",
  icao: "KJFK",
  operational_condition: "normal",
}

const OVERLINE_PREFIX = "Programación de tripulaciones"
const DEMO_OVERLINE =
  "Programación de tripulaciones · Base Eldorado · BOG · Horas en UTC"

const overline = () => {
  const found = Array.from(screen.getByRole("main").querySelectorAll("p")).find(
    (element) => element.textContent?.startsWith(OVERLINE_PREFIX)
  )
  if (!found) throw new Error("No se encontró el antetítulo de Programación")
  return found
}

const openProgramacion = async () => {
  renderRoute(PATHS.superVisor.programacion)
  await screen.findByRole(
    "heading",
    { level: 1, name: "Programación" },
    { timeout: 3000 }
  )
}

// Días y vuelos de la programación: vacíos, para que el tablero no pida nada más.
const emptySchedule = () => [
  http.get(SCHEDULE_DAYS_URL, () => HttpResponse.json([])),
  http.get(SCHEDULE_URL, () => HttpResponse.json([])),
]

describe("FE-6: base de Programación con la sesión real", () => {
  it("FE-6: con bases/me el antetítulo muestra el nombre y el código IATA de la base", async () => {
    server.use(
      http.get(BASE_ME_URL, () => HttpResponse.json(JFK_BASE)),
      ...emptySchedule()
    )
    useAuthStore.getState().setUser(REAL_USERS.supervisor)

    await openProgramacion()

    await waitFor(() =>
      expect(overline()).toHaveTextContent(
        "Programación de tripulaciones · John F. Kennedy International · JFK · Horas en UTC"
      )
    )
    expect(screen.getByRole("main")).not.toHaveTextContent("Eldorado")
    expect(screen.getByRole("main")).not.toHaveTextContent("BOG")
  })

  it("FE-6: sin base asignada (404 no_base) el antetítulo queda sin la base", async () => {
    const requests = recordRequests()
    server.use(
      http.get(BASE_ME_URL, () =>
        HttpResponse.json(
          {
            error: { message: "No tienes una base asignada.", code: "no_base" },
          },
          { status: 404 }
        )
      ),
      ...emptySchedule()
    )
    useAuthStore.getState().setUser(REAL_USERS.supervisor)

    await openProgramacion()

    await waitFor(() => expect(requests).toContain(`GET ${BASE_ME_URL}`))
    await waitFor(() =>
      expect(overline()).toHaveTextContent(
        "Programación de tripulaciones · Horas en UTC"
      )
    )
    expect(overline().textContent).toBe(
      "Programación de tripulaciones · Horas en UTC"
    )
    expect(screen.getByRole("main")).not.toHaveTextContent("Eldorado")
  })

  it("FE-6: con la cuenta demo sigue «Base Eldorado · BOG» y no se pide bases/me", async () => {
    const requests = recordRequests()
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)

    await openProgramacion()

    expect(overline()).toHaveTextContent(DEMO_OVERLINE)
    expect(requests).not.toContain(`GET ${BASE_ME_URL}`)
  })
})
