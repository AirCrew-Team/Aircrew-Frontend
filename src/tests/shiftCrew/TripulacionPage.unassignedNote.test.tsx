import { screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// FE-9, D13 (docs/specs/cierre-pendientes.md): «Tu base» explica por qué «en servicio» y
// «apta» no coinciden cuando hay tripulantes sin asignación: los libres cuentan como aptos
// pero no como en servicio. Con 0 libres la línea no se muestra. Texto estático, sin
// región viva.

const JFK_BASE = {
  unit: "Delta Air Lines",
  hq_code: "ATL",
  base_name: "Base JFK",
  city: "New York",
  iata: "JFK",
  icao: "KJFK",
  operational_condition: "normal",
}

const member = (id: string, status: string) => ({
  id,
  employee_code: id.toUpperCase(),
  full_name: `Tripulante ${id}`,
  position: "Tripulante de Cabina",
  rank: "Tripulante de Cabina",
  phone: null,
  radio_channel: null,
  expiring_certification: null,
  status,
  ...(status === "standby"
    ? {
        location: "Standby Hotel (JFK)",
        minutes_to_ramp: 20,
        guard_until: "2026-11-22T22:00:00.000Z",
        replacement_blocker: null,
      }
    : {}),
  ...(status === "absent" ? { reason: "Incapacidad", flight: null } : {}),
})

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const NOTE = /sin asignación no cuentan? como en servicio\./

const renderBase = async (statuses: string[]) => {
  server.use(
    http.get(`${API_URL}/api/admin/bases/me`, () =>
      HttpResponse.json(JFK_BASE)
    ),
    http.get(`${API_URL}/api/crew/shift-crew`, () =>
      HttpResponse.json({
        base: "JFK",
        shift: "day",
        members: statuses.map((status, index) => member(`m-${index}`, status)),
      })
    )
  )
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  renderRoute(PATHS.superVisor.tripulacion)
  return within(await screen.findByRole("region", { name: "Tu base" }))
}

// Párrafos de «Tu base» con la línea nueva.
const notes = (region: ReturnType<typeof within>) =>
  region
    .queryAllByText(NOTE)
    .map((element: HTMLElement) => normalize(element.textContent))

describe("D13: línea de los sin asignación en «Tu base»", () => {
  it("D13 con 2 libres dice «2 sin asignación no cuentan como en servicio.» en un único párrafo sin región viva", async () => {
    const region = await renderBase([
      "standby",
      "standby",
      "absent",
      "available",
      "available",
    ])

    await waitFor(() =>
      expect(notes(region)).toEqual([
        "2 sin asignación no cuentan como en servicio.",
      ])
    )
    const line = region.getByText(NOTE)
    expect(line.tagName).toBe("P")
    expect(line).not.toHaveAttribute("role")
    expect(line).not.toHaveAttribute("aria-live")
  })

  it("D13 con 1 libre usa el singular «1 sin asignación no cuenta como en servicio.»", async () => {
    const region = await renderBase(["standby", "available"])

    await waitFor(() =>
      expect(notes(region)).toEqual([
        "1 sin asignación no cuenta como en servicio.",
      ])
    )
  })

  it("D13 sin libres no se muestra la línea", async () => {
    const region = await renderBase(["standby", "absent"])

    // Ancla: «Tu base» ya tiene sus cifras.
    await region.findByText("en servicio")
    expect(notes(region)).toEqual([])
  })

  it("D13 con los datos de ejemplo (0 sin asignación) no se muestra la línea", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    renderRoute(PATHS.superVisor.tripulacion)
    const region = within(
      await screen.findByRole("region", { name: "Tu base" })
    )

    await region.findByText("en servicio")
    expect(notes(region)).toEqual([])
  })
})
