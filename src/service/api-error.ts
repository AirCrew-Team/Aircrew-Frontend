import { isAxiosError } from "axios"

// Cuerpo de error del backend: { error, code?, field? }.
export interface ApiErrorBody {
  error: string
  code?: string
  field?: string
}

// Mensaje del backend, o el de respaldo si no llegó respuesta (o el error no es de la API).
// Va aparte de api-client para que los componentes lo usen sin cargar el cliente HTTP.
export const apiErrorMessage = (error: unknown, fallback: string) =>
  (isAxiosError<ApiErrorBody>(error) && error.response?.data?.error) || fallback
