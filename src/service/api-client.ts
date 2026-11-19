import axios, { isAxiosError } from "axios"

import type { ApiErrorBody } from "@/service/api-error"
import { useAuthStore } from "@/stores/auth.store"

const BASE_URL = import.meta.env.VITE_URL_API_BACKEND

if (!BASE_URL) {
  throw new Error("Falta la variable VITE_URL_API_BACKEND en el archivo .env")
}

// Códigos con los que el backend indica que el token ya no sirve.
const SESSION_ENDED_CODES = new Set(["token_expired", "invalid_token"])

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
})

// Envía el token de la sesión en cada petición.
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token vencido o inválido: cierra la sesión; ProtectedRoute lleva al login.
apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (
    isAxiosError<ApiErrorBody>(error) &&
    error.response?.status === 401 &&
    SESSION_ENDED_CODES.has(error.response.data?.code ?? "")
  ) {
    useAuthStore.getState().logout()
  }
  return Promise.reject(error)
})

export default apiClient
