import { screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec cierre-pendientes, FE-3: con sesión real, la cola de solicitudes de reemplazo pide
// solo las ausencias por vuelo (`status=reported&kind=flight`). Las ausencias por fechas no
// tienen vuelo (sus candidatos darían 409 «no tiene un vuelo asociado») y no se muestran.

const H1 = "Recomendaciones de Reemplazo"
const ABSENCES_URL = `${API_URL}/api/crew/absences`

// Ausencia por vuelo, hija de una ausencia por fechas (la forma de la lista del backend).
const FLIGHT_ABSENCE = {
  id: "abs-vuelo-1",
  kind: "flight",
  parent_absence_id: "abs-fechas-1",
  flight_id: "f-1",
  flight_number: "DL-1001",
  flight_departure_at: "2099-01-01T15:00:00.000Z",
  flight_origin: "ATL",
  flight_destination: "JFK",
  origin_name: null,
  destination_name: null,
  gate: "A12",
  aircraft_family: "A320",
  slot_role: "first_officer",
  reason: "illness",
  notes: null,
  status: "reported",
  suggestions_state: "ready",
  start_date: null,
  end_date: null,
}

// Ausencia por fechas (la madre): sin vuelo.
const DATES_ABSENCE = {
  ...FLIGHT_ABSENCE,
  id: "abs-fechas-1",
  kind: "dates",
  parent_absence_id: null,
  flight_id: null,
  flight_number: null,
  flight_departure_at: null,
  flight_origin: null,
  flight_destination: null,
  gate: null,
  aircraft_family: null,
  slot_role: null,
  suggestions_state: null,
  start_date: "2099-01-01",
  end_date: "2099-01-03",
}

// Como el backend: filtra por `status` y `kind` si llegan; sin `kind`, todas. Guarda los
// parámetros de cada petición a la lista.
const mockQueue = () => {
  const requests: URLSearchParams[] = []
  const rows = [DATES_ABSENCE, FLIGHT_ABSENCE]
  server.use(
    http.get(ABSENCES_URL, ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const status = params.get("status")
      const kind = params.get("kind")
      return HttpResponse.json(
        rows.filter(
          (row) =>
            (!status || row.status === status) && (!kind || row.kind === kind)
        )
      )
    }),
    http.get(
      `${API_URL}/api/recommendation/absences/:id/candidates`,
      ({ params }) =>
        params.id === FLIGHT_ABSENCE.id
          ? HttpResponse.json({
              suggestions_state: "ready",
              reason: null,
              candidates: [],
            })
          : HttpResponse.json(
              { error: "Esta ausencia no tiene un vuelo asociado." },
              { status: 409 }
            )
    )
  )
  return requests
}

const openQueue = async () => {
  const requests = mockQueue()
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  renderRoute(PATHS.superVisor.solicitudesReemplazo)
  await screen.findByRole("heading", { level: 1, name: H1 })
  const main = screen.getByRole("main")
  return { main, requests }
}

describe("FE-3: la cola real solo tiene ausencias por vuelo", () => {
  it("pide GET /api/crew/absences con status=reported y kind=flight", async () => {
    const { requests } = await openQueue()

    await waitFor(() => expect(requests.length).toBeGreaterThan(0))
    for (const params of requests) {
      expect(params.get("status")).toBe("reported")
      expect(params.get("kind")).toBe("flight")
    }
  })

  it("la ausencia por fechas no aparece en la cola: solo la del vuelo", async () => {
    const { main } = await openQueue()

    expect(
      await within(main).findByRole("heading", {
        level: 2,
        name: "Pendientes (1)",
      })
    ).toBeInTheDocument()
    const tabs = within(main).getAllByRole("tab")
    expect(tabs).toHaveLength(1)
    expect(tabs[0]).toHaveTextContent(FLIGHT_ABSENCE.flight_number)
    await waitFor(() =>
      expect(main).not.toHaveTextContent("no tiene un vuelo asociado")
    )
  })
})
