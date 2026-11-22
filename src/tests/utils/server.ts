import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

import {
  API_URL,
  AUTH_URLS,
  errorBody,
  sessionErrorBody,
} from "../mocks/authApi"

// Servidor MSW de todos los tests (se arranca en setup.ts). Handlers por defecto:
// - /auth/me → 401 `auth_required` (formato real de una visita sin cookie): no hay
//   sesión que restaurar ni aviso (FE1-F1), así que los tests que no la ponen
//   terminan en el Login como hoy;
// - /auth/logout → 204: los tests que pulsan «Cerrar sesión» no dan petición sin handler;
// - /users/me → 404: MainLayout pide el perfil (foto del navbar) con sesión real. Un 404
//   deja las iniciales sin cerrar la sesión (un 401 la cerraría);
// - /notification/notifications → campana vacía: la pide el navbar con sesión real;
// - /admin/users/stats, /flights/aircraft/stats, /crew/certifications/stats y
//   /crew/shifts/current → indicadores en cero (forma real): los pide el Inicio del admin
//   con sesión real (FE-5), y los tests que solo pasan por él no dan petición sin handler.
//   MSW no mira la query: shifts/current también responde al ?base= del supervisor.
// Cada test los sobrescribe con server.use(...); setup.ts los repone tras cada test.
export const server = setupServer(
  http.get(AUTH_URLS.me, () =>
    HttpResponse.json(sessionErrorBody("auth_required"), { status: 401 })
  ),
  http.post(AUTH_URLS.logout, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API_URL}/api/admin/users/me`, () =>
    HttpResponse.json(errorBody("No encontrado"), { status: 404 })
  ),
  http.get(`${API_URL}/api/notification/notifications`, () =>
    HttpResponse.json({ items: [], unread_count: 0 })
  ),
  http.get(`${API_URL}/api/admin/users/stats`, () =>
    HttpResponse.json({
      total: 0,
      by_role: { crew: 0, supervisor: 0, super_admin: 0 },
      in_flight: 0,
      on_duty: 0,
      crew_available: 0,
      medical_fitness_percent: null,
    })
  ),
  http.get(`${API_URL}/api/flights/aircraft/stats`, () =>
    HttpResponse.json({
      total: 0,
      operational: 0,
      maintenance: 0,
      total_seats: 0,
      models_in_service: [],
    })
  ),
  http.get(`${API_URL}/api/crew/certifications/stats`, () =>
    HttpResponse.json({
      total: 0,
      by_status: { verified: 0, pending_verification: 0, uncertified: 0 },
    })
  ),
  http.get(`${API_URL}/api/crew/shifts/current`, () =>
    HttpResponse.json({
      shift: "morning",
      base: null,
      flights_today: 0,
      standby_total: 0,
      standby_ready: 0,
      staffing_delays: 0,
    })
  )
)
