import { isAxiosError } from "axios"

import {
  toAuthUser,
  type ApiAuthResult,
  type ApiUser,
  type AuthUser,
} from "@/App/types/auth.types"
import apiClient from "@/service/api-client"

import type {
  LoginResult,
  MaskedContacts,
  RecoveryChannel,
} from "./types"

/**
 * Contrato del servicio de autenticación. La implementación activa es la HTTP
 * (gateway); demoAuthService.ts tiene la simulada que usan los tests.
 */
export interface AuthService {
  login(email: string, password: string): Promise<LoginResult>
  /** Usuario del token guardado (restaurar la sesión al recargar), o null si ya no sirve. */
  getCurrentUser(): Promise<AuthUser | null>
  /** Devuelve contactos enmascarados, o null si la cuenta no existe. */
  getRecoveryContacts(email: string): Promise<MaskedContacts | null>
  requestRecoveryCode(email: string, channel: RecoveryChannel): Promise<void>
  verifyRecoveryCode(email: string, code: string): Promise<boolean>
  resetPassword(email: string, newPassword: string): Promise<void>
}

// El backend todavía no tiene endpoints de recuperación de contraseña.
export const RECOVERY_UNAVAILABLE_MESSAGE =
  "La recuperación de contraseña aún no está disponible. Contacta a tu supervisor."

const recoveryUnavailable = (): never => {
  throw new Error(RECOVERY_UNAVAILABLE_MESSAGE)
}

export const httpAuthService: AuthService = {
  async login(email, password) {
    try {
      const { data } = await apiClient.post<ApiAuthResult>(
        "/admin/auth/login",
        { email: email.trim(), password }
      )
      const user = toAuthUser(data.user)
      return {
        ok: true,
        session: { email: data.user.email, role: user.role, token: data.token, user },
      }
    } catch (error) {
      // 400/401: datos o credenciales inválidos (o cuenta sin activar).
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 400 || status === 401) {
        return { ok: false, reason: "invalid_credentials" }
      }
      return { ok: false, reason: "unavailable" }
    }
  },

  async getCurrentUser() {
    try {
      const { data } = await apiClient.get<ApiUser>("/admin/auth/me")
      return toAuthUser(data)
    } catch {
      return null
    }
  },

  getRecoveryContacts: async () => recoveryUnavailable(),
  requestRecoveryCode: async () => recoveryUnavailable(),
  verifyRecoveryCode: async () => recoveryUnavailable(),
  resetPassword: async () => recoveryUnavailable(),
}

// Implementación activa.
export const authService: AuthService = httpAuthService
