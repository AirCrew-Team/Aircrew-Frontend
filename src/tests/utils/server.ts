import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

import { API_URL, AUTH_URLS, errorBody } from "../mocks/authApi"

// Servidor MSW de todos los tests (se arranca en setup.ts). Handlers por defecto:
// - /auth/me → 401: sin cookie no hay sesión que restaurar, así que los tests que no
//   la ponen terminan en el Login como hoy;
// - /auth/logout → 204: los tests que pulsan «Cerrar sesión» no dan petición sin handler;
// - /users/me → 404: MainLayout pide el perfil (foto del navbar) con sesión real. Un 404
//   deja las iniciales sin cerrar la sesión (un 401 la cerraría).
// Cada test los sobrescribe con server.use(...); setup.ts los repone tras cada test.
export const server = setupServer(
  http.get(AUTH_URLS.me, () =>
    HttpResponse.json(errorBody("Token requerido"), { status: 401 })
  ),
  http.post(AUTH_URLS.logout, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API_URL}/api/admin/users/me`, () =>
    HttpResponse.json(errorBody("No encontrado"), { status: 404 })
  )
)
