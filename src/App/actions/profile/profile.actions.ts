import apiClient from "@/service/api-client"

// Datos de la cuenta y del perfil de crew que sí ofrece el backend (a través del gateway).

// Valores de `status` del tripulante en el backend.
export type CrewMemberStatus =
  "available" | "on_duty" | "in_flight" | "medical_leave"

export interface MyAccount {
  id: string
  name: string
  email: string
  // Rol en el formato del backend: crew | supervisor | super_admin.
  role: string
  is_active: boolean
  created_at: string
}

export interface MyCrewMember {
  employee_code: string
  position: string
  current_location: string | null
  status: CrewMemberStatus
}

export const getMyAccount = async (): Promise<MyAccount> => {
  const { data } = await apiClient.get<MyAccount>("/api/admin/auth/me")
  return data
}

export const getMyCrewMember = async (): Promise<MyCrewMember> => {
  const { data } = await apiClient.get<MyCrewMember>(
    "/api/crew/crew-members/me"
  )
  return data
}
