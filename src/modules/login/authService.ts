import { isAxiosError } from "axios"

import { login, UnknownRoleError } from "@/App/actions/auth/auth.actions"

import type { LoginResult, Role } from "./types"

/**
 * Contrato del servicio de acceso. El login va al backend real salvo con las
 * cuentas demo (D4). La recuperación de contraseña es real y no pasa por aquí
 * (`requestPasswordReset` en `useRecoveryFlow`).
 */
export interface AuthService {
  login(email: string, password: string): Promise<LoginResult>
}

/* -------------------------------------------------------------------------- */
/* Cuentas demo (D4).                                                         */
/* -------------------------------------------------------------------------- */

// Cuenta de prueba guardada en memoria
type DemoAccount = {
  email: string
  password: string
  role: Role
}

// Una cuenta de ejemplo por cada rol
const INITIAL_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@gmail.com",
    password: "1234567",
    role: "admin",
  },
  {
    email: "supervisor@gmail.com",
    password: "1234567",
    role: "supervisor",
  },
  {
    email: "tripulante@gmail.com",
    password: "1234567",
    role: "crew",
  },
]

// "Base de datos" en memoria, indexada por email
const demoAccounts = new Map<string, DemoAccount>(
  INITIAL_DEMO_ACCOUNTS.map((account): [string, DemoAccount] => [
    account.email,
    account,
  ])
)

// Simula la latencia de una petición de red
const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))
// Limpia y pasa a minúsculas el email para buscarlo
const normalize = (email: string) => email.trim().toLowerCase()

// Login contra el backend o las cuentas demo.
export const authService: AuthService = {
  // Valida email y contraseña; devuelve la sesión si son correctos
  async login(email, password) {
    // Cualquier correo que no sea demo va al backend real (F4).
    if (!demoAccounts.has(normalize(email))) {
      try {
        const user = await login(email.trim(), password)
        return {
          ok: true,
          session: { email: email.trim(), role: user.role, user },
        }
      } catch (error) {
        if (error instanceof UnknownRoleError) {
          return { ok: false, reason: "unknown_role" }
        }
        if (isAxiosError(error) && error.response?.status === 401) {
          return { ok: false, reason: "invalid_credentials" }
        }
        // Red caída, 5xx o cualquier otro fallo: no es culpa de las credenciales.
        return { ok: false, reason: "network_error" }
      }
    }

    // Cuentas demo (D4): se validan en memoria, sin llamar al backend.
    await wait()
    const account = demoAccounts.get(normalize(email))
    if (!account || account.password !== password) {
      return { ok: false, reason: "invalid_credentials" }
    }
    return { ok: true, session: { email: account.email, role: account.role } }
  },
}
