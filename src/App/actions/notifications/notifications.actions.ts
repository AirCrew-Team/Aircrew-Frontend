import apiClient from "@/service/api-client"

// Campana: avisos guardados de la persona con sesión (servicio notification, a través
// del gateway y con la cookie). El supervisor ve las alertas de ausencias; el tripulante,
// los avisos dirigidos a él (reemplazo asignado, certificado registrado o verificado).

const NOTIFICATIONS_PATH = "/api/notification/notifications"

export const notificationsQueryKey = ["notifications", "mine"] as const

export interface AppNotification {
  id: string
  type: string
  message: string
  data: Record<string, unknown>
  read: boolean
  read_at: string | null
  // ISO 8601.
  created_at: string
}

export interface MyNotifications {
  items: AppNotification[]
  unread_count: number
}

export const getMyNotifications = async (): Promise<MyNotifications> => {
  const { data } = await apiClient.get<MyNotifications>(NOTIFICATIONS_PATH, {
    params: { limit: 30 },
  })
  return data
}

export const markAllNotificationsRead = async (): Promise<{
  updated: number
}> => {
  const { data } = await apiClient.post<{ updated: number }>(
    `${NOTIFICATIONS_PATH}/read-all`
  )
  return data
}
