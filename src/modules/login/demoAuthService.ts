import { MOCK_USERS } from "@/stores/auth.store"

import type { AuthService } from "./authService"
import type { Role } from "./types"

/* -------------------------------------------------------------------------- */
/* Implementación demo (sin backend). Solo la usan los tests del login.       */
/* -------------------------------------------------------------------------- */

type DemoAccount = {
  email: string
  password: string
  phone: string
  role: Role
}

// Código de verificación demo para el bloqueo tras tres intentos fallidos.
export const DEMO_RECOVERY_CODE = "123456"

const INITIAL_DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@gmail.com", password: "1234567", phone: "+57 300 000 0001", role: "admin" },
  { email: "supervisor@gmail.com", password: "1234567", phone: "+57 300 000 0002", role: "supervisor" },
  { email: "tripulante@gmail.com", password: "1234567", phone: "+57 300 000 0003", role: "crew" },
]

const demoAccounts = new Map<string, DemoAccount>(
  INITIAL_DEMO_ACCOUNTS.map((account): [string, DemoAccount] => [
    account.email,
    account,
  ])
)

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))
const normalize = (email: string) => email.trim().toLowerCase()

export const demoAuthService: AuthService = {
  async login(email, password) {
    await wait()
    const account = demoAccounts.get(normalize(email))
    if (!account || account.password !== password) {
      return { ok: false, reason: "invalid_credentials" }
    }
    return {
      ok: true,
      session: {
        email: account.email,
        role: account.role,
        token: "demo-token",
        user: MOCK_USERS[account.role],
      },
    }
  },

  async getCurrentUser() {
    return null
  },

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
    await wait()
  },

  async verifyRecoveryCode(email, code) {
    await wait(200)
    return demoAccounts.has(normalize(email)) && code === DEMO_RECOVERY_CODE
  },

  async resetPassword(email, newPassword) {
    await wait()
    const account = demoAccounts.get(normalize(email))
    if (!account) throw new Error("account_not_found")
    demoAccounts.set(account.email, { ...account, password: newPassword })
  },
}
