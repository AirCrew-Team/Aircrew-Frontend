import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { getDayFlights } from "@/modules/shared/flightAssignment/data/flightAssignment.data"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { server } from "../utils/server"

// Spec tripulantes-nuevos-programacion: un tripulante recién creado puede quedar asignado
// sin habilitación registrada. Su resumen muestra la advertencia del backend y no
// afirma «Habilitado en …».

const flightWith = (warnings?: string[]) => ({
  id: "f-1",
  flight_number: "DL1102",
  date: "2026-11-22",
  origin: { code: "JFK", city: "New York" },
  destination: { code: "LAX", city: "Los Angeles" },
  departure_at: "2026-11-22T15:00:00.000Z",
  arrival_at: "2026-11-22T21:00:00.000Z",
  duration_minutes: 360,
  scope: "domestic",
  gate: null,
  aircraft: {
    model: "A320neo",
    family: "A320",
    registration: "N301DN",
    seats: 180,
  },
  minimum_crew: { pilots: 2, cabin: 3 },
  status: "incomplete",
  slots: [
    {
      id: "first_officer",
      role: "first_officer",
      accepts: ["first_officer"],
      label: "Primer oficial",
      assignee: {
        crew_id: "u-new",
        employee_code: "AC-0099",
        full_name: "Nuevo Copiloto",
        rank: "first_officer",
        month_hours: 6,
        max_month_hours: 100,
        source: "manual",
        rationale: null,
        is_replacement: false,
        ...(warnings ? { warnings } : {}),
      },
    },
  ],
})

const loadAssigneeSummary = async (warnings?: string[]) => {
  server.use(
    http.get(`${API_URL}/api/recommendation/schedule`, () =>
      HttpResponse.json([flightWith(warnings)])
    )
  )
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  const [flight] = await getDayFlights("2026-11-22")
  return flight.slots[0].assignee?.summary
}

describe("Programación: resumen del tripulante asignado", () => {
  it("con advertencias, las muestra y no dice «Habilitado en»", async () => {
    const summary = await loadAssigneeSummary([
      "Sin habilitación registrada en A320",
    ])

    expect(summary).toBe(
      "Sin habilitación registrada en A320 · 6 h de 100 este mes"
    )
  })

  it("sin advertencias, sigue como antes", async () => {
    expect(await loadAssigneeSummary([])).toBe(
      "Habilitado en A320 · 6 h de 100 este mes"
    )
    expect(await loadAssigneeSummary()).toBe(
      "Habilitado en A320 · 6 h de 100 este mes"
    )
  })
})
