import type {
  LoginResult,
  MaskedContacts,
  Role,
} from "./types"

/**
 * Contrato que debe cumplir el backend. Cuando exista la API, basta con crear
 * otra implementación (httpAuthService) y cambiar el export `authService`.
 */
export interface AuthService {
  login(email: string, password: string): Promise<LoginResult>
  /** Devuelve contactos enmascarados, o null si la cuenta no existe. */
  getRecoveryContacts(email: string): Promise<MaskedContacts | null>
  resetPassword(email: string, newPassword: string): Promise<void>
}

/* -------------------------------------------------------------------------- */
/* Implementación demo (sin backend). Eliminar al conectar la API real.       */
/* -------------------------------------------------------------------------- */

// Cuenta de prueba guardada en memoria
type DemoAccount = {
  email: string
  password: string
  phone: string
  role: Role
}

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

// Implementación falsa del servicio, usa las cuentas en memoria
const demoAuthService: AuthService = {
  // Valida email y contraseña; devuelve la sesión si son correctos
  async login(email, password) {
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

  // Reemplaza la contraseña de una cuenta registrada.
  async resetPassword(email, newPassword) {
    await wait()
    const account = demoAccounts.get(normalize(email))
    if (!account) throw new Error("account_not_found")
    demoAccounts.set(account.email, { ...account, password: newPassword })
  },
}

// Implementación activa; cambiar aquí al conectar la API real
export const authService: AuthService = demoAuthService