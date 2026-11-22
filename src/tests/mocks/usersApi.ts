// Contrato de usuarios del servicio admin (develop + fix/users-superAdmin del backend) que
// simulan los tests de la sesión real:
// - GET    /api/admin/catalogs/user-options → { bases, crew_positions, shifts, crew_statuses, supervisor_statuses }
// - GET    /api/admin/users?page=&page_size=&search=&role= → { items, page, page_size, total }
// - GET    /api/admin/users/stats → { total, by_role, in_flight, on_duty, crew_available, medical_fitness_percent }
// - GET    /api/admin/users/:id → un item
// - POST   /api/admin/users → 201 con el item (pendiente de activación)
// - PATCH  /api/admin/users/:id → el item actualizado (solo los campos enviados)
// - DELETE /api/admin/users/:id → el item con is_active: false (desactiva, no borra)
// Errores planos { error: "texto" } (errorHandler de shared): no usar errorBody de authApi.
import { http, HttpResponse } from "msw"

import { API_URL } from "./authApi"

export const USERS_URL = `${API_URL}/api/admin/users`
export const USERS_STATS_URL = `${USERS_URL}/stats`
export const USER_OPTIONS_URL = `${API_URL}/api/admin/catalogs/user-options`
export const userUrl = (id: string) => `${USERS_URL}/${id}`

export const UUIDS = {
  crew: "11111111-1111-4111-8111-111111111111",
  supervisor: "22222222-2222-4222-8222-222222222222",
  admin: "33333333-3333-4333-8333-333333333333",
  pending: "44444444-4444-4444-8444-444444444444",
} as const

export const API_ITEMS = {
  crew: {
    id: UUIDS.crew,
    name: "Diego Salcedo Pérez",
    email: "d.salcedo@delta.com",
    role: "crew",
    is_active: true,
    pending_activation: false,
    created_at: "2026-11-02T15:00:00.000Z",
    phone: "+14045550142",
    employee_code: "AC-0001",
    position: "Comandante",
    base: "ATL",
    status: "in_flight",
    shift: null,
  },
  supervisor: {
    id: UUIDS.supervisor,
    name: "Camila Restrepo",
    email: "c.restrepo@delta.com",
    role: "supervisor",
    is_active: true,
    pending_activation: false,
    created_at: "2026-10-20T15:00:00.000Z",
    phone: "+12125550177",
    employee_code: null,
    position: null,
    base: "JFK",
    status: "off_duty",
    shift: "afternoon",
  },
  admin: {
    id: UUIDS.admin,
    name: "Mateo Morales",
    email: "m.morales@delta.com",
    role: "super_admin",
    is_active: false,
    pending_activation: false,
    created_at: "2026-09-01T15:00:00.000Z",
    phone: null,
    employee_code: null,
    position: null,
    base: null,
    status: null,
    shift: null,
  },
  pending: {
    id: UUIDS.pending,
    name: "Laura Gómez",
    email: "laura.gomez@delta.com",
    role: "crew",
    is_active: true,
    pending_activation: true,
    created_at: "2026-11-20T15:00:00.000Z",
    phone: "+14045550123",
    employee_code: "AC-0002",
    position: "Copiloto",
    base: "MSP",
    status: "available",
    shift: null,
  },
}

// Textos del backend; el de la base de Atlanta es distinto a propósito de los ejemplos,
// para ver que la pantalla usa el catálogo y no una lista propia.
export const API_USER_OPTIONS = {
  bases: [
    { code: "ATL", label: "Base ATL / Atlanta (catálogo)" },
    { code: "JFK", label: "Base JFK / Nueva York" },
    { code: "MSP", label: "Base MSP / Minneapolis–St. Paul" },
  ],
  crew_positions: ["Comandante", "Copiloto", "Auxiliar de Vuelo"],
  shifts: [
    { code: "morning", label: "Turno 1 (mañana)" },
    { code: "afternoon", label: "Turno 2 (tarde)" },
    { code: "night", label: "Turno 3 (noche)" },
  ],
  crew_statuses: [
    { code: "available", label: "Disponible" },
    { code: "on_duty", label: "En guardia" },
    { code: "in_flight", label: "En vuelo" },
    { code: "medical_leave", label: "Permiso médico" },
  ],
  supervisor_statuses: [
    { code: "available", label: "Disponible" },
    { code: "on_duty", label: "En turno" },
    { code: "off_duty", label: "Fuera de turno" },
    { code: "leave", label: "De licencia" },
  ],
}

export const API_STATS = {
  total: 4,
  by_role: { crew: 2, supervisor: 1, super_admin: 1 },
  in_flight: 1,
  on_duty: 0,
  crew_available: 1,
  medical_fitness_percent: null,
}

export const apiError = (message: string, status: number) =>
  HttpResponse.json({ error: message }, { status })

// Catálogos, lista, indicadores y ficha de cada usuario. `listRequests` guarda las URL
// pedidas a la lista, para revisar los parámetros.
export const usersHandlers = () => {
  const listRequests: URL[] = []
  const items = Object.values(API_ITEMS)
  return {
    listRequests,
    handlers: [
      http.get(USER_OPTIONS_URL, () => HttpResponse.json(API_USER_OPTIONS)),
      http.get(USERS_URL, ({ request }) => {
        const url = new URL(request.url)
        listRequests.push(url)
        const role = url.searchParams.get("role")
        const filtered = role
          ? items.filter((item) => item.role === role)
          : items
        return HttpResponse.json({
          items: filtered,
          page: Number(url.searchParams.get("page") ?? 1),
          page_size: Number(url.searchParams.get("page_size") ?? 10),
          total: filtered.length,
        })
      }),
      http.get(USERS_STATS_URL, () => HttpResponse.json(API_STATS)),
      ...items.map((item) =>
        http.get(userUrl(item.id), () => HttpResponse.json(item))
      ),
    ],
  }
}
