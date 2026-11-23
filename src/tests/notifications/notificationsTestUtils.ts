import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { expect } from "vitest"

import type { AppNotification } from "@/App/actions/notifications/notifications.actions"

import {
  ABSENCES_URL,
  absenceError,
  COVERED_ABSENCE,
  REPORTED_ABSENCE,
} from "../mocks/absencesApi"
import { API_URL } from "../mocks/authApi"
import { server } from "../utils/server"

// Utilidades de los tests de docs/specs/notificaciones-navegables.md (NL-01 a NL-07).
// No es un *.test: Vitest no lo recoge.

export type User = ReturnType<typeof userEvent.setup>
type AppRouter = ReturnType<typeof import("../utils/renderRoute").renderRoute>

export const NOTIFICATIONS_URL = `${API_URL}/api/notification/notifications`

export const normalize = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// ISO de solo día de «hoy + N» en fecha local, como dayFromToday de Programación.
export const localDay = (offset: number) => {
  const now = new Date()
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offset
  )
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

// Instante ISO de «hoy + N» a las hh:mm locales. A las 23:30 en Bogotá (UTC−5) el día UTC
// ya es el siguiente: una implementación con toISOString().slice(0, 10) elegiría mal el día.
export const localInstant = (
  offset: number,
  hours: number,
  minutes: number
) => {
  const now = new Date()
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offset,
    hours,
    minutes
  ).toISOString()
}

// ---------------------------------------------------------------- campana

export interface BellItem {
  id: string
  type: string
  message: string
  data: Record<string, unknown>
  read?: boolean
}

// GET de la campana con `items` y POST read-all (al cerrar el menú con avisos sin leer).
// Devuelve el estado para contar las marcas de leído.
export const mockBell = (items: BellItem[]) => {
  const state = { readAll: 0, items }
  server.use(
    http.get(NOTIFICATIONS_URL, () =>
      HttpResponse.json({
        items: state.items.map((item): AppNotification => ({
          id: item.id,
          type: item.type,
          message: item.message,
          data: item.data,
          read: Boolean(item.read),
          read_at: item.read ? "2026-11-22T12:00:00.000Z" : null,
          created_at: new Date().toISOString(),
        })),
        unread_count: state.items.filter((item) => !item.read).length,
      })
    ),
    http.post(`${NOTIFICATIONS_URL}/read-all`, () => {
      state.readAll += 1
      const updated = state.items.filter((item) => !item.read).length
      state.items = state.items.map((item) => ({ ...item, read: true }))
      return HttpResponse.json({ updated })
    })
  )
  return state
}

// Abre la campana (el nombre lleva «(n sin leer)» o no) y devuelve el menú.
export const openBell = async (user: User) => {
  const trigger = await screen.findByRole("button", {
    name: /^Notificaciones/,
  })
  await user.click(trigger)
  return screen.findByRole("menu")
}

// Contrato: el nombre accesible del ítem CONTIENE el mensaje (puede llevar la hora y
// «· nueva»).
const containing = (message: string) => (name: string) =>
  normalize(name).includes(message)

export const findBellItem = (message: string) =>
  screen.findByRole("menuitem", { name: containing(message) })

export const queryBellItem = (message: string) =>
  screen.queryByRole("menuitem", { name: containing(message) })

// Abre la campana y pulsa el aviso con el ratón.
export const clickBellItem = async (user: User, message: string) => {
  await openBell(user)
  await user.click(await findBellItem(message))
}

export const expectMenuClosed = () =>
  waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())

// Todas las ubicaciones por las que pasa el router (pathname + search). El módulo de
// destino quita el parámetro con replace en cuanto lo lee: comprobar solo la ubicación
// final daría una carrera.
export const recordLocations = (router: AppRouter) => {
  const visited = [
    `${router.state.location.pathname}${router.state.location.search}`,
  ]
  router.subscribe((state) => {
    visited.push(`${state.location.pathname}${state.location.search}`)
  })
  return visited
}

// Comprueba que se pasó por `pathname` con exactamente esos parámetros (sin importar el
// orden).
export const expectVisited = async (
  visited: string[],
  pathname: string,
  params: Record<string, string>
) => {
  const expected = new URLSearchParams(params)
  expected.sort()
  await waitFor(() =>
    expect(
      visited.some((location) => {
        const url = new URL(location, "http://localhost")
        url.searchParams.sort()
        return (
          url.pathname === pathname &&
          url.searchParams.toString() === expected.toString()
        )
      }),
      `debe pasar por ${pathname}?${expected.toString()} (visitadas: ${visited.join(", ")})`
    ).toBe(true)
  )
}

// Contrato: tras leer el parámetro, el módulo lo quita de la URL (replace).
export const expectParamCleared = (router: AppRouter, pathname: string) =>
  waitFor(() => {
    expect(router.state.location.pathname).toBe(pathname)
    expect(router.state.location.search).toBe("")
    // Se quita con replace: Atrás no vuelve a la URL con el parámetro.
    expect(router.state.historyAction).toBe("REPLACE")
  })

// hidden: con un popup modal abierto, Base UI deja el resto de la página inaccesible y
// queryAllByRole no vería las alertas de `main`.
export const alertsIn = (container: HTMLElement) =>
  within(container).queryAllByRole("alert", { hidden: true })

// ---------------------------------------------------------------- supervisor: backend

// Cola de Recomendaciones: ausencias por vuelo, de la salida más próxima a la más lejana.
// La solicitud del aviso es la segunda, así que no es la seleccionada por defecto.
const queueRow = (n: number, flightNumber: string) => ({
  id: `abs-vuelo-${n}`,
  kind: "flight",
  parent_absence_id: null,
  flight_id: `f-cola-${n}`,
  flight_number: flightNumber,
  flight_departure_at: `2099-01-0${n}T15:00:00.000Z`,
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
})

export const QUEUE = [
  queueRow(1, "DL-1001"),
  queueRow(2, "DL-1002"),
  queueRow(3, "DL-1003"),
]
export const DEFAULT_REQUEST = QUEUE[0]
export const TARGET_REQUEST = QUEUE[1]
export const OTHER_REQUEST = QUEUE[2]

// Ausencias del tablero (sin `kind`): la reportada y la cubierta de mocks/absencesApi.
export const BOARD = [REPORTED_ABSENCE, COVERED_ABSENCE]

// Programación: el vuelo del aviso sale hoy + 3 a las 23:30 locales. Es el tercero de su
// día; el primero por completar (selección por defecto) es otro.
export const TARGET_DAY_OFFSET = 3

interface FlightFixture {
  id: string
  flightNumber: string
  dayOffset: number
  hours: number
  minutes: number
}

export const TODAY_FLIGHTS: FlightFixture[] = [
  { id: "f-hoy-1", flightNumber: "DL2001", dayOffset: 0, hours: 9, minutes: 0 },
  {
    id: "f-hoy-2",
    flightNumber: "DL2002",
    dayOffset: 0,
    hours: 14,
    minutes: 0,
  },
]
export const TARGET_DAY_FLIGHTS: FlightFixture[] = [
  { id: "f-dia-1", flightNumber: "DL1101", dayOffset: 3, hours: 8, minutes: 0 },
  {
    id: "f-dia-2",
    flightNumber: "DL1102",
    dayOffset: 3,
    hours: 12,
    minutes: 0,
  },
  {
    id: "f-dia-3",
    flightNumber: "DL1103",
    dayOffset: 3,
    hours: 23,
    minutes: 30,
  },
]
export const TARGET_FLIGHT = TARGET_DAY_FLIGHTS[2]
export const TARGET_DAY_DEFAULT_FLIGHT = TARGET_DAY_FLIGHTS[0]
export const TODAY_DEFAULT_FLIGHT = TODAY_FLIGHTS[0]

// Vuelo de la programación en la forma del backend: un solo puesto (capitán) vacío, así
// queda «incompleto» y cuenta como por completar.
const apiFlight = (flight: FlightFixture) => ({
  id: flight.id,
  flight_number: flight.flightNumber,
  date: localDay(flight.dayOffset),
  origin: { code: "JFK", city: "Nueva York" },
  destination: { code: "LAX", city: "Los Ángeles" },
  departure_at: localInstant(flight.dayOffset, flight.hours, flight.minutes),
  arrival_at: localInstant(flight.dayOffset, flight.hours + 2, flight.minutes),
  duration_minutes: 120,
  scope: "domestic",
  gate: "B4",
  aircraft: {
    model: "Airbus A320",
    family: "A320",
    registration: "N101DL",
    seats: 180,
  },
  minimum_crew: { pilots: 1, cabin: 0 },
  status: "incomplete",
  slots: [
    {
      id: "captain",
      role: "captain",
      accepts: ["captain"],
      label: "Capitán",
      assignee: null,
    },
  ],
})

const FLIGHTS_BY_DAY = new Map<string, FlightFixture[]>([
  [localDay(0), TODAY_FLIGHTS],
  [localDay(TARGET_DAY_OFFSET), TARGET_DAY_FLIGHTS],
])

// Todo lo que piden Ausencias, Solicitudes de reemplazo y Programación con la sesión real
// del supervisor. GET /api/crew/absences lo usan dos pantallas (MSW no mira la query): con
// status=reported&kind=flight es la cola; sin parámetros, el tablero. Devuelve los ids
// pedidos al detalle de ausencia.
export const mockSupervisorBackend = () => {
  const detailIds: string[] = []
  server.use(
    http.get(ABSENCES_URL, ({ request }) => {
      const params = new URL(request.url).searchParams
      if (params.get("kind") === "flight") return HttpResponse.json(QUEUE)
      return HttpResponse.json(BOARD)
    }),
    http.get(`${ABSENCES_URL}/:id`, ({ params }) => {
      const id = String(params.id)
      detailIds.push(id)
      const absence = BOARD.find((item) => item.id === id)
      return absence
        ? HttpResponse.json(absence)
        : absenceError(404, "Ausencia no encontrada.")
    }),
    http.get(`${API_URL}/api/recommendation/absences/:id/candidates`, () =>
      HttpResponse.json({
        suggestions_state: "ready",
        reason: null,
        candidates: [],
      })
    ),
    http.get(`${API_URL}/api/admin/bases/me`, () =>
      HttpResponse.json(
        { error: { message: "No tienes una base asignada.", code: "no_base" } },
        { status: 404 }
      )
    ),
    http.get(`${API_URL}/api/recommendation/schedule/days`, () =>
      HttpResponse.json(
        Array.from({ length: 7 }, (_, offset) => {
          const count = FLIGHTS_BY_DAY.get(localDay(offset))?.length ?? 0
          return {
            date: localDay(offset),
            flight_count: count,
            pending_count: count,
          }
        })
      )
    ),
    http.get(`${API_URL}/api/recommendation/schedule`, ({ request }) => {
      const date = new URL(request.url).searchParams.get("date") ?? ""
      return HttpResponse.json((FLIGHTS_BY_DAY.get(date) ?? []).map(apiFlight))
    })
  )
  return detailIds
}

// ---------------------------------------------------------------- supervisor: destinos

// Popup de detalle de Ausencias abierto con la ausencia `crewName` ya cargada.
export const expectAbsenceDetailOpen = async (crewName: string) => {
  const dialog = await screen.findByRole("dialog")
  await waitFor(() => expect(dialog).toHaveTextContent(crewName))
  return dialog
}

// La pestaña de la cola de Recomendaciones de `flightNumber`.
export const requestTab = (flightNumber: string) => {
  const main = screen.getByRole("main")
  const tab = within(main)
    .queryAllByRole("tab")
    .find((element) => normalize(element.textContent).includes(flightNumber))
  if (!tab) throw new Error(`No hay pestaña de la solicitud ${flightNumber}`)
  return tab
}

export const expectRequestSelected = (flightNumber: string) =>
  waitFor(() =>
    expect(requestTab(flightNumber)).toHaveAttribute("aria-selected", "true")
  )

// Botón del grupo «Día» de Programación con el día local de «hoy + offset».
export const dayButton = (offset: number) => {
  const group = screen.getByRole("group", { name: "Día" })
  const [, month, day] = localDay(offset).split("-").map(Number)
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ]
  const label = `${day} ${months[month - 1]}`
  const button = within(group)
    .getAllByRole("button")
    .find((element) => normalize(element.textContent).includes(label))
  if (!button) throw new Error(`No hay botón del día ${label}`)
  return button
}

// Pestaña de un vuelo en la lista de Programación.
export const flightTab = (flightNumber: string) => requestTab(flightNumber)

// Programación con el día de «hoy + offset» elegido y la pestaña de `flightNumber`
// seleccionada.
export const expectFlightSelected = (offset: number, flightNumber: string) =>
  waitFor(() => {
    expect(dayButton(offset)).toHaveAttribute("aria-pressed", "true")
    expect(flightTab(flightNumber)).toHaveAttribute("aria-selected", "true")
  })
