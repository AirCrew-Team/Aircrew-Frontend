import { isAxiosError } from "axios"

import { login, UnknownRoleError } from "@/App/actions/auth/auth.actions"

import type {
  LoginResult,
  MaskedContacts,
  RecoveryChannel,
  Role,
} from "./types"

/**
 * Contrato del servicio de acceso. El login va al backend real salvo con las
 * cuentas demo (D4); la recuperación de contraseña sigue simulada.
 */
export interface AuthService {
  login(email: string, password: string): Promise<LoginResult>
  /** Devuelve contactos enmascarados, o null si la cuenta no existe. */
  getRecoveryContacts(email: string): Promise<MaskedContacts | null>
  requestRecoveryCode(email: string, channel: RecoveryChannel): Promise<void>
  verifyRecoveryCode(email: string, code: string): Promise<boolean>
  resetPassword(email: string, newPassword: string): Promise<void>
}

/* -------------------------------------------------------------------------- */
/* Cuentas demo (D4) y recuperación simulada (el backend aún no la tiene).    */
/* -------------------------------------------------------------------------- */

// Cuenta de prueba guardada en memoria
type DemoAccount = {
  email: string
  password: string
  phone: string
  role: Role
}

// Código de verificación demo para el bloqueo tras tres intentos fallidos.
export const DEMO_RECOVERY_CODE = "123456"

// Una cuenta de ejemplo por cada rol
const INITIAL_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@gmail.com",
    password: "1234567",
    phone: "+57 300 000 0001",
    role: "admin",
  },
  {
    email: "supervisor@gmail.com",
    password: "1234567",
    phone: "+57 300 000 0002",
    role: "supervisor",
  },
  {
    email: "tripulante@gmail.com",
    password: "1234567",
    phone: "+57 300 000 0003",
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

// Login contra el backend o las cuentas demo; la recuperación usa las cuentas en memoria.
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

  // Devuelve email y teléfono parcialmente ocultos (ej. a***@gmail.com)
  async getRecoveryContacts(email) {
    await wait(150)
    const account = demoAccounts.get(normalize(email))
    if (!account) return null
    const [user, domain] = account.email.split("@")
    return {
      email: `${user.slice(0, 1)}***@${domain}`,
      phone: `*** *** **${account.phone.slice(-2)}`,
    }
  },

  async requestRecoveryCode() {
    // El backend real enviaría el código por el canal elegido.
    await wait()
  },

  async verifyRecoveryCode(email, code) {
    await wait(200)
    return demoAccounts.has(normalize(email)) && code === DEMO_RECOVERY_CODE
  },

  // Reemplaza la contraseña de una cuenta registrada.
  async resetPassword(email, newPassword) {
    await wait()
    const account = demoAccounts.get(normalize(email))
    if (!account) throw new Error("account_not_found")
    demoAccounts.set(account.email, { ...account, password: newPassword })
  },
}
