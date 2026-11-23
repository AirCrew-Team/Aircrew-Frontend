import { isAxiosError } from "axios"

import type { ApiMyCertification } from "@/App/types/myCertification.types"
import apiClient from "@/service/api-client"

// Certificación del tripulante con sesión (FE-4). A diferencia de certifications.actions,
// esta ruta es del rol crew. null si el usuario no tiene perfil de tripulante (404).
export const getMyCertification =
  async (): Promise<ApiMyCertification | null> => {
    try {
      const { data } = await apiClient.get<ApiMyCertification>(
        "/api/crew/certifications/me"
      )
      return data
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null
      throw error
    }
  }
