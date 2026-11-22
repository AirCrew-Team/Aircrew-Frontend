import { isAxiosError } from "axios"

import type {
  ApiFlightAssignment,
  ApiFlightMetrics,
  ApiMyAbsence,
  MyAssignmentsFilters,
} from "@/App/types/flights.types"
import apiClient from "@/service/api-client"

// Vuelos del tripulante con la sesión real (FE-4), a través del gateway y con la cookie
// de sesión. Todas las rutas son solo del rol crew.

const ASSIGNMENTS_PATH = "/api/flights/assignments"

// Mis Vuelos y el banner de reemplazos del Inicio, ordenadas por salida.
export const getMyAssignments = async (
  filters: MyAssignmentsFilters = {}
): Promise<ApiFlightAssignment[]> => {
  const { data } = await apiClient.get<ApiFlightAssignment[]>(
    `${ASSIGNMENTS_PATH}/me`,
    { params: filters }
  )
  return data
}

// El próximo vuelo, o null si no hay (el backend responde 404).
export const getMyNextAssignment =
  async (): Promise<ApiFlightAssignment | null> => {
    try {
      const { data } = await apiClient.get<ApiFlightAssignment>(
        `${ASSIGNMENTS_PATH}/me/next`
      )
      return data
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null
      throw error
    }
  }

// «Enterado» del reemplazo: confirma que cubrirá el vuelo (204).
export const acknowledgeAssignment = async (id: string): Promise<void> => {
  await apiClient.post(
    `${ASSIGNMENTS_PATH}/${encodeURIComponent(id)}/acknowledge`
  )
}

// Métricas del mes actual en la zona de la base del tripulante.
export const getMyFlightMetrics = async (): Promise<ApiFlightMetrics> => {
  const { data } = await apiClient.get<ApiFlightMetrics>(
    "/api/crew/crew-members/me/metrics"
  )
  return data
}

// Ausencias propias, la más reciente primero. Mis Vuelos solo las cruza con sus vuelos.
export const getMyAbsences = async (): Promise<ApiMyAbsence[]> => {
  const { data } = await apiClient.get<ApiMyAbsence[]>("/api/crew/absences/me")
  return data
}
