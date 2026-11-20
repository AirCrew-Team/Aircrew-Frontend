import { http, HttpResponse } from "msw"

import { ROLES, type AuthUser } from "@/App/types/auth.types"

import { AUTH_URLS, errorBody } from "./authApi"

// Contrato del backend que simulan los tests de Configuración con sesión real
// (spec configuracion-sesion-real):
// - GET /auth/me → el User sin envolver (cualquier rol);
// - GET /crew-members/me → el CrewMember del tripulante.
// Los ids NO son ids demo (mock-tripulante, mock-supervisor, mock-admin).

export const REAL_ACCOUNTS = {
  crew: {
    id: "u-real-crew-1",
    name: "Laura Méndez Ríos",
    email: "laura.mendez@aircrew.test",
    role: "crew",
    is_active: true,
    created_at: "2026-11-18T12:00:00.000Z",
  },
  supervisor: {
    id: "u-real-sup-1",
    name: "Mateo Salazar Cruz",
    email: "mateo.salazar@aircrew.test",
    role: "supervisor",
    is_active: true,
    created_at: "2026-11-18T12:00:00.000Z",
  },
  admin: {
    id: "u-real-admin-1",
    name: "Andrés Pardo Gil",
    email: "andres.pardo@aircrew.test",
    role: "super_admin",
    is_active: true,
    created_at: "2026-11-18T12:00:00.000Z",
  },
} as const

export const REAL_CREW_MEMBER = {
  id: "cm-9",
  user_id: REAL_ACCOUNTS.crew.id,
  employee_code: "EMP-100",
  position: "Auxiliar de vuelo",
  current_location: "MDE",
  status: "on_duty",
  is_active: true,
  created_at: "2026-11-18T12:00:00.000Z",
} as const

// Sesiones del store tal como las deja el login real.
export const REAL_USERS = {
  crew: {
    id: REAL_ACCOUNTS.crew.id,
    displayName: "Laura",
    fullName: REAL_ACCOUNTS.crew.name,
    position: "Auxiliar de vuelo",
    role: ROLES.TRIPULANTE,
  },
  supervisor: {
    id: REAL_ACCOUNTS.supervisor.id,
    displayName: "Mateo",
    fullName: REAL_ACCOUNTS.supervisor.name,
    position: "Supervisor",
    role: ROLES.SUPER_VISOR,
  },
  admin: {
    id: REAL_ACCOUNTS.admin.id,
    displayName: "Andrés",
    fullName: REAL_ACCOUNTS.admin.name,
    position: "Super Administrador",
    role: ROLES.SUPER_ADMIN,
  },
} satisfies Record<string, AuthUser>

// Handlers para server.use(...): sobrescriben el 401 por defecto de /auth/me.
export const accountHandler = (account: object) =>
  http.get(AUTH_URLS.me, () => HttpResponse.json(account))

export const accountErrorHandler = () =>
  http.get(AUTH_URLS.me, () =>
    HttpResponse.json(errorBody("Error interno"), { status: 500 })
  )

export const crewMemberHandler = (crewMember: object = REAL_CREW_MEMBER) =>
  http.get(AUTH_URLS.crewProfile, () => HttpResponse.json(crewMember))

export const crewMemberErrorHandler = () =>
  http.get(AUTH_URLS.crewProfile, () =>
    HttpResponse.json(errorBody("Error interno"), { status: 500 })
  )
