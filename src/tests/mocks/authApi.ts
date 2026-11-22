// Contrato del backend (servicio admin y crew a través del gateway) que simulan los
// tests del login real (spec login-real). Formas tomadas del openapi del backend:
// - POST /auth/login → { user, token } (UserSummary + JWT);
// - GET /auth/me → el User sin envolver (id, name, email, role, is_active…);
// - GET /crew-members/me → el CrewMember (position, employee_code…).

// Misma URL que test.env.VITE_URL_API_BACKEND en vite.config.ts.
export const API_URL = "http://localhost:3000"

export const AUTH_URLS = {
  login: `${API_URL}/api/admin/auth/login`,
  me: `${API_URL}/api/admin/auth/me`,
  logout: `${API_URL}/api/admin/auth/logout`,
  crewProfile: `${API_URL}/api/crew/crew-members/me`,
} as const

export interface ApiUser {
  id: string
  name: string
  email: string
  role: string
}

// Usuarios reales (no demo): sus correos no están entre las cuentas demo de authService.
export const API_USERS = {
  superAdmin: {
    id: "u-admin-1",
    name: "Admin Real",
    email: "admin.real@aircrew.com",
    role: "super_admin",
  },
  supervisor: {
    id: "u-sup-1",
    name: "Sara Gómez Ruiz",
    email: "sara.gomez@aircrew.com",
    role: "supervisor",
  },
  crew: {
    id: "u-crew-1",
    name: "Luis Pérez Mora",
    email: "luis.perez@aircrew.com",
    role: "crew",
  },
} satisfies Record<string, ApiUser>

export const CREW_PROFILE = {
  id: "cm-1",
  user_id: API_USERS.crew.id,
  position: "Capitán",
  employee_code: "EMP-001",
  base: "BOG",
  status: "active",
}

// JWT de mentira: el frontend nunca debe guardarlo (LR-10).
export const FAKE_TOKEN = "token-falso"

export const loginBody = (user: ApiUser) => ({ user, token: FAKE_TOKEN })

// Lo que devuelve /auth/me (User completo).
export const meBody = (user: ApiUser) => ({
  ...user,
  is_active: true,
  created_at: "2026-01-15T12:00:00.000Z",
})

export const errorBody = (message: string) => ({ error: { message } })
