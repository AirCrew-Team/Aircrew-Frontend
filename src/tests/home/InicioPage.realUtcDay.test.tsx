import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  type AssignmentBody,
  mockMyAssignments,
  mockMyCertification,
  mockNextAssignment,
  REPLACEMENT_ASSIGNMENT,
} from "../mocks/crewFlightsApi"
import { crewMemberHandler, REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Revisión final de FE-4: en el Inicio real el día («Hoy», «Mañana», «Lun 23 Nov») va
// junto a una hora UTC, así que se cuenta en UTC, como «Lun 23 Nov, 16:15 UTC» de Mis
// Vuelos. Con el día local, en Nueva York a las 10:00 del 22 un vuelo de las 03:30 UTC
// del 23 (22:30 del 22 en Nueva York) diría «Hoy, 03:30 UTC», que es otra fecha.
//
// Zona por test como en tests/absences/absenceSchema.timezone.test.ts.

const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
const BANNER = "Asignación de reemplazo"

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// Reemplazo del 23 a las 03:30 UTC; confirmar antes del 22 a las 23:00 UTC (18:00 en NY).
const NIGHT_REPLACEMENT = {
  ...REPLACEMENT_ASSIGNMENT,
  replacement: {
    ...REPLACEMENT_ASSIGNMENT.replacement,
    deadline_at: "2026-11-22T23:00:00.000Z",
  },
  flight: {
    ...REPLACEMENT_ASSIGNMENT.flight,
    departure_at: "2026-11-23T03:30:00.000Z",
    arrival_at: "2026-11-23T08:25:00.000Z",
  },
} satisfies AssignmentBody

afterEach(() => {
  vi.useRealTimers()
  vi.stubEnv("TZ", ORIGINAL_ZONE)
  vi.unstubAllEnvs()
})

describe("Inicio real: el día junto a la hora UTC es el día UTC", () => {
  it("en Nueva York a las 10:00 del 22, el vuelo de las 03:30 UTC del 23 es «Mañana» en el próximo vuelo y en el banner", async () => {
    vi.stubEnv("TZ", "America/New_York")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-22T15:00:00.000Z"))
    expect(new Date().getTimezoneOffset(), "la zona surtió efecto").toBe(300)

    mockMyAssignments([NIGHT_REPLACEMENT])
    mockNextAssignment(NIGHT_REPLACEMENT)
    mockMyCertification()
    server.use(crewMemberHandler())
    useAuthStore.getState().setUser(REAL_USERS.crew)
    renderRoute(PATHS.tripulante.inicio)

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "DL2201",
    })
    const card = heading.closest("article") as HTMLElement
    await waitFor(() => expect(normalize(card.textContent)).toContain("Mañana"))
    expect(normalize(card.textContent)).not.toContain("Hoy")

    const banner = await screen.findByRole("region", { name: BANNER })
    const text = normalize(banner.textContent)
    expect(text).toContain("Mañana, 03:30 UTC (22:30 local)")
    expect(text).not.toContain("Hoy, 03:30 UTC")
    // Plazo del «Enterado»: 23:00 UTC del 22, que en UTC sigue siendo hoy.
    expect(text).toContain("Hoy, 23:00 UTC")
  })
})
