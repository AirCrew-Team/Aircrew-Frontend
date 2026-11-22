import { screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { getCrewSummary } from "@/modules/supervisorHome/data/supervisorHome.data"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec docs/specs/tripulacion-sin-asignacion.md, «Ampliación: Inicio y texto de la
// guardia» (TS-09 a TS-11): con la sesión real, la tarjeta «Tripulación» del Inicio usa
// las mismas fórmulas que «Tu base» de Tripulación:
// - en servicio = total − ausentes − sin asignación (cuenta también a los de descanso);
// - Apto = round((total − ausentes) / total × 100), y 0 con total 0.
// TS-13 (datos de ejemplo: «34 en servicio», «92% Apto») ya lo cubren IS-05 en
// InicioPage.test.tsx y TC-20 en shiftCrew.data.test.ts.

// Con la sesión real del supervisor, MainLayout abre el socket de alertas en vivo
// (useLiveAlerts). No es parte de esta spec: se sustituye por uno inerte.
vi.mock("@/lib/socket", () => ({
  connectAlerts: () => ({ on: () => {}, disconnect: () => {} }),
}))

interface ApiMemberLike {
  id: string
  employee_code: string
  full_name: string
  position: string
  rank: string
  phone: string | null
  radio_channel: string | null
  expiring_certification: null
  status: string
  [field: string]: unknown
}

const BASE_ME_URL = `${API_URL}/api/admin/bases/me`
const SHIFT_CREW_URL = `${API_URL}/api/crew/shift-crew`

// getMyBase guarda la base en el queryClient global (staleTime Infinity): todos los tests
// de este archivo usan la misma base y ninguno cuenta las llamadas a bases/me.
const JFK_BASE = {
  unit: "Delta Air Lines",
  hq_code: "ATL",
  base_name: "Base JFK",
  city: "New York",
  iata: "JFK",
  icao: "KJFK",
  operational_condition: "normal",
}

const person = (id: string, fullName: string) => ({
  id,
  employee_code: id.toUpperCase(),
  full_name: fullName,
  position: "Tripulante de Cabina",
  rank: "Tripulante de Cabina",
  phone: "+1 212 555 0100",
  radio_channel: "CH-02 OPS JFK (129.40)",
  expiring_certification: null,
})

const guard = (id: string, fullName: string): ApiMemberLike => ({
  ...person(id, fullName),
  status: "standby",
  location: "Standby Hotel (JFK)",
  minutes_to_ramp: 20,
  guard_until: "2026-11-22T22:00:00.000Z",
  replacement_blocker: null,
})

const rest = (id: string, fullName: string): ApiMemberLike => ({
  ...person(id, fullName),
  status: "rest",
  rest_until: "2026-11-22T20:00:00.000Z",
})

const absent = (id: string, fullName: string): ApiMemberLike => ({
  ...person(id, fullName),
  status: "absent",
  reason: "Incapacidad médica repentina",
  flight: null,
})

const available = (id: string, fullName: string): ApiMemberLike => ({
  ...person(id, fullName),
  status: "available",
})

// Los casos de la spec. Cada uno compara las dos cifras juntas, para que el fallo
// muestre la cifra vieja de las dos.
const CASES = [
  {
    criterion: "TS-09",
    label: "2 de guardia, 1 ausente y 2 libres",
    members: [
      guard("hs-1", "Grace Holloway"),
      guard("hs-2", "Marcus Bell"),
      absent("hs-3", "Nora Fitzgerald"),
      available("hs-4", "Elena Brooks"),
      available("hs-5", "Owen Price"),
    ],
    onDuty: 2,
    availabilityPercent: 80,
  },
  {
    criterion: "TS-10",
    label: "1 de guardia, 1 en descanso y 1 ausente",
    members: [
      guard("hs-1", "Grace Holloway"),
      rest("hs-6", "Lucas Grant"),
      absent("hs-3", "Nora Fitzgerald"),
    ],
    onDuty: 2,
    availabilityPercent: 67,
  },
  {
    criterion: "TS-11",
    label: "solo 2 libres",
    members: [
      available("hs-4", "Elena Brooks"),
      available("hs-5", "Owen Price"),
    ],
    onDuty: 0,
    availabilityPercent: 100,
  },
  {
    criterion: "TS-11",
    label: "members: [] (ancla)",
    members: [],
    onDuty: 0,
    availabilityPercent: 0,
  },
]

// Backend del Inicio con la sesión real: base, turno, ausencias, Programación y la
// tripulación del turno. Solo la tripulación cambia entre casos.
const mockHome = (members: ApiMemberLike[]) => {
  const requestedBases: (string | null)[] = []
  server.use(
    http.get(BASE_ME_URL, () => HttpResponse.json(JFK_BASE)),
    http.get(SHIFT_CREW_URL, ({ request }) => {
      requestedBases.push(new URL(request.url).searchParams.get("base"))
      return HttpResponse.json({ base: "JFK", shift: "day", members })
    }),
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
    http.get(`${API_URL}/api/crew/absences/stats`, () =>
      HttpResponse.json({
        reported: 1,
        pending_ack: 0,
        covered_today: 0,
        resolution_rate: 50,
      })
    ),
    http.get(`${API_URL}/api/crew/absences`, () => HttpResponse.json([])),
    http.get(`${API_URL}/api/recommendation/schedule/days`, () =>
      HttpResponse.json([
        { date: "2026-11-22", flight_count: 3, pending_count: 1 },
      ])
    )
  )
  return requestedBases
}

describe("Inicio del supervisor, sesión real: getCrewSummary (TS-09 a TS-11)", () => {
  it.each(CASES)(
    "$criterion con $label, getCrewSummary da «$onDuty en servicio» y «$availabilityPercent% Apto»",
    async ({ members, onDuty, availabilityPercent }) => {
      const requestedBases = mockHome(members)
      useAuthStore.getState().setUser(REAL_USERS.supervisor)

      const summary = await getCrewSummary()

      expect(requestedBases, "pide la tripulación de su base").toEqual(["JFK"])
      expect(summary).toEqual({ onDuty, availabilityPercent })
    }
  )
})

describe("Inicio del supervisor, sesión real: tarjeta «Tripulación» (TS-09 a TS-11)", () => {
  it.each(CASES)(
    "$criterion con $label, la tarjeta «Tripulación» dice «$onDuty en servicio» y «$availabilityPercent% Apto»",
    async ({ members, onDuty, availabilityPercent }) => {
      mockHome(members)
      useAuthStore.getState().setUser(REAL_USERS.supervisor)
      renderRoute(PATHS.superVisor.inicio)

      const heading = await screen.findByRole("heading", {
        level: 2,
        name: "Tripulación",
      })
      const card = heading.closest("article") as HTMLElement
      expect(card, "la tarjeta es un article").not.toBeNull()
      // Espera a que la tarjeta tenga datos; un handler que falte la dejaría en error.
      await within(card).findByText(/ en servicio$/)
      const main = screen.getByRole("main")
      await waitFor(() =>
        expect(
          within(main).queryAllByRole("status"),
          "sin bloques cargando"
        ).toHaveLength(0)
      )
      expect(
        within(main).queryAllByRole("alert"),
        "sin errores de carga en el Inicio"
      ).toHaveLength(0)

      expect(card).toHaveTextContent(`${onDuty} en servicio`)
      expect(card).toHaveTextContent(`${availabilityPercent}% Apto`)
      expect(within(card).getByText(`${onDuty} en servicio`)).toBeVisible()
      expect(
        within(card).getByText(`${availabilityPercent}% Apto`)
      ).toBeVisible()
    }
  )
})
