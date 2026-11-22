import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Una ausencia por fechas no está ligada a un vuelo: el backend manda `flight` con todos
// sus campos en null (no `flight: null`). La pantalla la trata como «sin vuelo» y no se
// rompe al filtrar ni al buscar.

const ABSENT_NAME = "Nora Fitzgerald"
const REASON = "fatigue"

const SHIFT = [
  {
    id: "sc-1",
    employee_code: "SC-1",
    full_name: ABSENT_NAME,
    position: "Tripulante de Cabina",
    rank: "Tripulante de Cabina",
    phone: null,
    radio_channel: null,
    expiring_certification: null,
    status: "absent",
    reason: REASON,
    flight: { id: null, flight_number: null, origin: null, destination: null },
  },
]

const renderBoard = async () => {
  server.use(
    http.get(`${API_URL}/api/admin/bases/me`, () =>
      HttpResponse.json({
        unit: "Delta Air Lines",
        hq_code: "ATL",
        base_name: "Base JFK",
        city: "New York",
        iata: "JFK",
        icao: "KJFK",
        operational_condition: "normal",
      })
    ),
    http.get(`${API_URL}/api/crew/shift-crew`, () =>
      HttpResponse.json({ base: "JFK", shift: "day", members: SHIFT })
    )
  )
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  const user = userEvent.setup()
  renderRoute(PATHS.superVisor.tripulacion)
  await screen.findByRole("heading", { level: 1, name: "Tripulación" })
  const main = screen.getByRole("main")
  await waitFor(() =>
    expect(within(main).queryByText("Cargando tripulación…")).toBeNull()
  )
  return { user, main }
}

describe("Tripulación: ausente por fechas, sin vuelo", () => {
  it("muestra al ausente sin vuelo y deja buscarlo", async () => {
    const { user, main } = await renderBoard()

    const list = await within(main).findByRole("list", {
      name: "Tripulantes del turno",
    })
    expect(within(list).getByText(ABSENT_NAME)).toBeInTheDocument()
    expect(within(list).queryByText(/null/)).toBeNull()
    // El motivo llega en inglés del backend y se muestra con su etiqueta.
    expect(
      within(list).getByText("Fatiga operacional / 14 CFR 117.5")
    ).toBeInTheDocument()
    expect(within(list).queryByText(REASON)).toBeNull()

    await user.type(within(main).getByRole("searchbox"), "nora")
    expect(within(list).getByText(ABSENT_NAME)).toBeInTheDocument()
  })
})
