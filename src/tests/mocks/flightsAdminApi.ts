// Contrato de vuelos del servicio flights para la pantalla del super_admin (guía
// «Guía backend: crear vuelos desde el super_admin», rama feature/flights-superAdmin):
// - GET  /api/flights/flights/options → { airports, aircraft, statuses }
// - GET  /api/flights/flights/manage?page=&page_size=&search=&status= → { items, page, page_size, total }
// - GET  /api/flights/flights/stats → { total, today, without_crew, by_status }
// - POST /api/flights/flights → 201 con el vuelo completo
// Errores { error, field? } (errorHandler de shared).
import { http, HttpResponse } from "msw"

import { API_URL } from "./authApi"

// El servicio monta los vuelos en /flights, detrás de /api/flights del gateway.
export const FLIGHTS_URL = `${API_URL}/api/flights/flights`
export const FLIGHTS_MANAGE_URL = `${FLIGHTS_URL}/manage`

export const API_FLIGHT_OPTIONS = {
  airports: [
    {
      code: "ATL",
      icao: "KATL",
      city: "Atlanta",
      name: "Hartsfield-Jackson Atlanta International",
      country: "US",
      timezone: "America/New_York",
      is_base: true,
      latitude: 33.6407,
      longitude: -84.4277,
    },
    {
      code: "LHR",
      icao: "EGLL",
      city: "Londres",
      name: "London Heathrow",
      country: "GB",
      timezone: "Europe/London",
      is_base: false,
      latitude: 51.47,
      longitude: -0.4543,
    },
    {
      code: "BOS",
      icao: "KBOS",
      city: "Boston",
      name: "Boston Logan International",
      country: "US",
      timezone: "America/New_York",
      is_base: true,
      latitude: 42.3656,
      longitude: -71.0096,
    },
  ],
  aircraft: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      registration: "N391DN",
      name: "Airbus A321neo · catálogo",
      family: "A320",
      capacity: 194,
      base: "ATL",
    },
  ],
  statuses: [
    { code: "scheduled", label: "Programado" },
    { code: "delayed", label: "Retrasado" },
    { code: "in_flight", label: "En vuelo" },
    { code: "completed", label: "Completado" },
    { code: "cancelled", label: "Cancelado" },
  ],
}

export const API_FLIGHT = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  flight_number: "DL0030",
  status: "delayed",
  gate: null,
  origin: "ATL",
  origin_city: "Atlanta",
  origin_timezone: "America/New_York",
  destination: "LHR",
  destination_city: "Londres",
  destination_timezone: "Europe/London",
  // 19:30 en Atlanta → 08:15 del día siguiente en Londres (enero: UTC-5 y UTC+0).
  departure_at: "2030-01-15T00:30:00.000Z",
  arrival_at: "2030-01-15T08:15:00.000Z",
  aircraft_id: "11111111-1111-4111-8111-111111111111",
  aircraft_name: "Airbus A330-900neo",
  aircraft_registration: "N411DX",
  aircraft_seats: 281,
  scope: "international",
  required_slots: 8,
  crew_status: "incomplete",
}

export const API_FLIGHT_STATS = {
  total: 1,
  today: 0,
  without_crew: 1,
  by_status: {
    scheduled: 0,
    delayed: 1,
    in_flight: 0,
    completed: 0,
    cancelled: 0,
  },
}

// { error, field? }: field es el campo que falló (flight_number, aircraft_id, origin,
// destination, arrival_at o gate), como lo envía el errorHandler de shared.
export const apiError = (message: string, status: number, field?: string) =>
  HttpResponse.json(field ? { error: message, field } : { error: message }, {
    status,
  })

// Catálogo, indicadores y lista. `listRequests` guarda las URL pedidas a la lista.
export const flightsAdminHandlers = () => {
  const listRequests: URL[] = []
  return {
    listRequests,
    handlers: [
      http.get(`${FLIGHTS_URL}/options`, () =>
        HttpResponse.json(API_FLIGHT_OPTIONS)
      ),
      http.get(`${FLIGHTS_URL}/stats`, () =>
        HttpResponse.json(API_FLIGHT_STATS)
      ),
      http.get(FLIGHTS_MANAGE_URL, ({ request }) => {
        const url = new URL(request.url)
        listRequests.push(url)
        return HttpResponse.json({
          items: [API_FLIGHT],
          page: Number(url.searchParams.get("page") ?? 1),
          page_size: Number(url.searchParams.get("page_size") ?? 5),
          total: 1,
        })
      }),
    ],
  }
}
