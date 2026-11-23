import { screen, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import {
  getAbsencesSummary,
  getReplacementRequestsSummary,
} from "@/modules/supervisorHome/data/supervisorHome.data"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// FE-5 (docs/specs/cierre-pendientes.md): con la sesión real, el Inicio del supervisor
// - cuenta solo las ausencias por vuelo (?kind=flight), las que piden reemplazo: una
//   ausencia por fechas (madre, flight_id null) crea una hija por cada vuelo afectado y,
//   sin kind, se contaría dos veces;
// - envía la base del supervisor (?base= de bases/me) a GET /absences/stats, para que el
//   backend calcule «hoy» en la zona de su hub.
// MSW casa sin mirar la query: los handlers leen searchParams y filtran como el backend.

const BASE_ME_URL = `${API_URL}/api/admin/bases/me`
const ABSENCES_URL = `${API_URL}/api/crew/absences`
const STATS_URL = `${ABSENCES_URL}/stats`

const JFK_BASE = {
  unit: "Delta Air Lines",
  hq_code: "ATL",
  base_name: "Base JFK",
  city: "New York",
  iata: "JFK",
  icao: "KJFK",
  operational_condition: "normal",
}

const HOUR = 60 * 60 * 1000
const inHours = (hours: number) =>
  new Date(Date.now() + hours * HOUR).toISOString()

// Una ausencia por fechas (madre) y sus hijas por vuelo: 2 por cubrir (una sale en 1 h),
// 1 esperando el «Enterado» y 1 ya cubierta.
const absences = () => {
  const mother = {
    id: "ab-0",
    kind: "dates",
    parent_absence_id: null,
    flight_id: null,
    flight_departure_at: null,
    status: "reported",
  }
  const child = (id: string, status: string, hours: number) => ({
    id,
    kind: "flight",
    parent_absence_id: "ab-0",
    flight_id: `fl-${id}`,
    flight_departure_at: inHours(hours),
    status,
  })
  return [
    mother,
    child("ab-1", "reported", 1),
    child("ab-2", "reported", 5),
    child("ab-3", "pending_ack", 3),
    child("ab-4", "covered", 0.5),
  ]
}

let kinds: (string | null)[]
let statsBases: (string | null)[]

beforeEach(() => {
  kinds = []
  statsBases = []
  server.use(
    http.get(BASE_ME_URL, () => HttpResponse.json(JFK_BASE)),
    http.get(ABSENCES_URL, ({ request }) => {
      const kind = new URL(request.url).searchParams.get("kind")
      kinds.push(kind)
      const all = absences()
      return HttpResponse.json(
        kind ? all.filter((absence) => absence.kind === kind) : all
      )
    }),
    http.get(STATS_URL, ({ request }) => {
      statsBases.push(new URL(request.url).searchParams.get("base"))
      return HttpResponse.json({
        reported: 2,
        pending_ack: 1,
        covered_today: 1,
        resolution_rate: 50,
      })
    })
  )
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
})

describe("FE-5: ausencias del Inicio del supervisor (sesión real)", () => {
  it("FE-5 pide GET /absences con kind=flight", async () => {
    await getAbsencesSummary()

    expect(kinds).toEqual(["flight"])
  })

  it("FE-5 «abiertas» cuenta solo las hijas por vuelo sin resolver (3, no 4 con la madre) y «salidas críticas» la que sale en menos de 2 h", async () => {
    expect(await getAbsencesSummary()).toEqual({
      open: 3,
      criticalDepartures: 1,
    })
  })

  it("FE-5 GET /absences/stats lleva la base del supervisor (base=JFK)", async () => {
    await getReplacementRequestsSummary()

    expect(statsBases).toEqual(["JFK"])
  })

  it("FE-5 la tarjeta «Ausencias» muestra las 3 abiertas", async () => {
    server.use(
      http.get(`${API_URL}/api/crew/shifts/current`, () =>
        HttpResponse.json({
          shift: "morning",
          base: "JFK",
          flights_today: 6,
          standby_total: 2,
          standby_ready: 2,
          staffing_delays: 0,
        })
      ),
      http.get(`${API_URL}/api/crew/shift-crew`, () =>
        HttpResponse.json({ base: "JFK", shift: "day", members: [] })
      ),
      http.get(`${API_URL}/api/recommendation/schedule/days`, () =>
        HttpResponse.json([])
      )
    )
    renderRoute(PATHS.superVisor.inicio)

    const card = await screen.findByRole("article", { name: "Ausencias" })
    expect(await within(card).findByText("3 abiertas")).toBeInTheDocument()
    expect(statsBases.every((base) => base === "JFK")).toBe(true)
    expect(kinds.every((kind) => kind === "flight")).toBe(true)
  })
})
