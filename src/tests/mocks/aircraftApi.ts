// Contrato de aeronaves del servicio flights (backend de la rama feature/aircraft-superAdmin)
// que simulan los tests de la sesión real. Todas las rutas son del super_admin:
// - GET    /api/flights/aircraft?page=&page_size=&search=&status= → { items, page, page_size, total }
// - GET    /api/flights/aircraft/stats → { total, operational, maintenance, total_seats, models_in_service }
// - GET    /api/flights/aircraft/options → { models, bases, maintenance_types }
// - GET    /api/flights/aircraft/manifest → [items]
// - POST   /api/flights/aircraft → 201 con el item · PUT /:id → el item · DELETE /:id → 204
// - GET    /:id/report → { aircraft, maintenance, history }
// - PATCH  /:id/maintenance/tasks/:index { done } → el mantenimiento · POST /:id/release → el item
// - PUT    /:id/photo { mime_type, data_base64 } → { photo_updated_at } · GET y DELETE /:id/photo
// Errores planos { error: "texto" } (errorHandler de shared).
import { http, HttpResponse } from "msw"

import { API_URL } from "./authApi"

export const AIRCRAFT_URL = `${API_URL}/api/flights/aircraft`
export const aircraftUrl = (id: string) => `${AIRCRAFT_URL}/${id}`

export const AIRCRAFT_IDS = {
  operating: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  maintenance: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const

export const PHOTO_UPDATED_AT = "2026-11-20T10:00:00.000Z"

export const API_OPERATING = {
  id: AIRCRAFT_IDS.operating,
  registration: "N391DN",
  msn: "10342",
  model_id: "a321neo",
  model_name: "Airbus A321neo",
  category: "narrow_body",
  capacity: 194,
  minimum_crew: { pilots: 2, cabin: 4 },
  engines: "2 × Pratt & Whitney PW1100G",
  base: "ATL",
  base_name: "Atlanta (ATL)",
  manufacture_year: 2021,
  in_fleet_since: "2021-06-14",
  flight_hours: 14820,
  cycles: 6210,
  status: "operating",
  maintenance_type: null,
  maintenance_note: null,
  photo_updated_at: PHOTO_UPDATED_AT,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
}

export const API_MAINTENANCE = {
  ...API_OPERATING,
  id: AIRCRAFT_IDS.maintenance,
  registration: "N271SY",
  msn: "17000812",
  model_id: "e175",
  model_name: "Embraer E175",
  category: "regional",
  capacity: 76,
  minimum_crew: { pilots: 2, cabin: 2 },
  engines: "2 × General Electric CF34-8E",
  base: "MSP",
  base_name: "Minneapolis (MSP)",
  status: "maintenance",
  maintenance_type: "motor",
  maintenance_note: "Vibración en el motor derecho.",
  photo_updated_at: null,
}

// Textos del backend, distintos a propósito de los ejemplos: así se ve que la pantalla
// usa el catálogo y no una lista propia.
export const API_OPTIONS = {
  models: [
    {
      id: "a321neo",
      name: "Airbus A321neo",
      category: "narrow_body",
      capacity: 194,
      minimum_crew: { pilots: 2, cabin: 4 },
      engines: "2 × Pratt & Whitney PW1100G",
    },
    {
      id: "e175",
      name: "Embraer E175",
      category: "regional",
      capacity: 76,
      minimum_crew: { pilots: 2, cabin: 2 },
      engines: "2 × General Electric CF34-8E",
    },
  ],
  bases: [
    { code: "ATL", name: "Atlanta (ATL)" },
    { code: "MSP", name: "Minneapolis (MSP)" },
  ],
  maintenance_types: [
    {
      code: "motor",
      label: "Motor (catálogo)",
      tasks: ["Inspección", "Prueba en tierra"],
    },
    { code: "ala", label: "Ala (catálogo)", tasks: ["Reparación"] },
  ],
}

export const API_STATS = {
  total: 2,
  operational: 1,
  maintenance: 1,
  total_seats: 270,
  models_in_service: ["Airbus A321neo", "Boeing 737-900ER"],
}

export const API_MAINTENANCE_RECORD = {
  order_number: "OT-2026-0412",
  type: "motor",
  description: "Vibración en el motor derecho.",
  hangar: "Hangar 1 · MSP",
  opened_on: "2026-11-02",
  tasks: [
    { name: "Inspección", done: true },
    { name: "Prueba en tierra", done: false },
  ],
}

export const apiError = (message: string, status: number) =>
  HttpResponse.json({ error: message }, { status })

// Lista, indicadores, catálogos e informes. `listRequests` guarda las URL pedidas a la
// lista, para revisar los parámetros.
export const aircraftHandlers = () => {
  const listRequests: URL[] = []
  const items = [API_OPERATING, API_MAINTENANCE]
  return {
    listRequests,
    handlers: [
      http.get(AIRCRAFT_URL, ({ request }) => {
        const url = new URL(request.url)
        listRequests.push(url)
        const status = url.searchParams.get("status")
        const filtered = status
          ? items.filter((item) => item.status === status)
          : items
        return HttpResponse.json({
          items: filtered,
          page: Number(url.searchParams.get("page") ?? 1),
          page_size: Number(url.searchParams.get("page_size") ?? 10),
          total: filtered.length,
        })
      }),
      http.get(`${AIRCRAFT_URL}/stats`, () => HttpResponse.json(API_STATS)),
      http.get(`${AIRCRAFT_URL}/options`, () => HttpResponse.json(API_OPTIONS)),
      http.get(`${aircraftUrl(AIRCRAFT_IDS.operating)}/report`, () =>
        HttpResponse.json({
          aircraft: API_OPERATING,
          maintenance: null,
          history: [
            {
              order_number: "OT-2026-0118",
              type: "ala",
              description: "Golpe en la punta del ala.",
              hangar: "Hangar 1 · ATL",
              opened_on: "2026-03-02",
              closed_on: "2026-03-09",
            },
          ],
        })
      ),
      http.get(`${aircraftUrl(AIRCRAFT_IDS.maintenance)}/report`, () =>
        HttpResponse.json({
          aircraft: API_MAINTENANCE,
          maintenance: API_MAINTENANCE_RECORD,
          history: [],
        })
      ),
      // Las fotos que pide el <img> (jsdom no las descarga, pero por si acaso).
      http.get(`${AIRCRAFT_URL}/:id/photo`, () => new HttpResponse(null)),
    ],
  }
}
