import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  type AssignmentBody,
  mockMetrics,
  mockMyAbsences,
  mockMyAssignments,
  SCHEDULED_ASSIGNMENT,
} from "../mocks/crewFlightsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"

// I-5 (revisión final de FE-4): el mes del selector es el LOCAL del tripulante, así que la
// pantalla pide al backend el rango del mes local (from/to en ISO, to exclusivo) y agrupa
// cada vuelo por su fecha local, no por la de UTC. Si no, la última noche del mes en
// EE. UU. desaparecen los vuelos que salen esa misma noche (en UTC ya es el mes siguiente).
//
// Zona por test (como tests/absences/absenceSchema.timezone.test.ts): vi.stubEnv("TZ", …)
// y, en afterEach, primero la zona original y luego quitar el stub (borrar TZ no hace que
// Node la vuelva a leer).

const LAZY = { timeout: 3000 }
const H1 = "Mis Vuelos Asignados"
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

// Sale a las 20:00 del 30 de noviembre en Nueva York (01:00 UTC del 1 de diciembre).
const LATE_FLIGHT = {
  ...SCHEDULED_ASSIGNMENT,
  id: "asg-9",
  flight: {
    ...SCHEDULED_ASSIGNMENT.flight,
    id: "fl-0100",
    flight_number: "DL0100",
    departure_at: "2026-12-01T01:00:00.000Z",
    arrival_at: "2026-12-01T03:10:00.000Z",
  },
} satisfies AssignmentBody

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const panelFlights = () => {
  const panels = screen.getAllByRole("tabpanel")
  expect(panels, "un único tabpanel visible").toHaveLength(1)
  return within(panels[0])
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 2 }).textContent)
    )
}

afterEach(() => {
  vi.useRealTimers()
  vi.stubEnv("TZ", ORIGINAL_ZONE)
  vi.unstubAllEnvs()
})

describe("I-5: el mes del roster en la zona local del tripulante", () => {
  it("I-5: en Nueva York, a las 18:00 del 30 de noviembre, el vuelo de las 20:00 (01:00 UTC del 1 de diciembre) sale en noviembre y no en diciembre", async () => {
    vi.stubEnv("TZ", "America/New_York")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-30T23:00:00.000Z"))
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(300)
    expect(new Date().getDate()).toBe(30)

    const assignments = mockMyAssignments([LATE_FLIGHT])
    mockMetrics()
    mockMyAbsences([])
    useAuthStore.getState().setUser(REAL_USERS.crew)
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.misVuelos)
    const main = (
      await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
    ).closest("main") as HTMLElement

    await waitFor(() => expect(panelFlights()).toEqual(["DL0100"]))
    // Medianoche del 1 de noviembre (aún en horario de verano, UTC−4) a medianoche del 1
    // de diciembre (UTC−5), en vez de month=2026-11 (que el backend cuenta en UTC).
    const queries = assignments.map((query) =>
      Object.fromEntries(new URLSearchParams(query))
    )
    expect(queries).toContainEqual({
      status: "upcoming",
      from: "2026-11-01T04:00:00.000Z",
      to: "2026-12-01T05:00:00.000Z",
    })
    expect(queries.some((query) => "month" in query)).toBe(false)

    await user.selectOptions(
      within(main).getByRole("combobox", { name: "Mes del roster" }),
      "2026-12"
    )
    await waitFor(() =>
      expect(queries.length, "se piden los vuelos de diciembre").toBeLessThan(
        assignments.length
      )
    )
    await waitFor(() => expect(panelFlights()).toEqual([]))
  })
})
