import { create } from "zustand"

// Alerta recibida por el socket durante la sesión. El backend no guarda historial:
// la lista vive en memoria y se vacía al cerrar sesión o recargar.
export interface LiveAlert {
  id: string
  type: string
  message: string
  // ISO del backend (sent_at).
  sentAt: string
  read: boolean
}

// Máximo de alertas que se guardan; las más viejas se descartan.
const MAX_ALERTS = 30

interface AlertsState {
  alerts: LiveAlert[]
  add: (alert: Omit<LiveAlert, "id" | "read">) => void
  markAllRead: () => void
  clear: () => void
}

let nextId = 0

export const useAlertsStore = create<AlertsState>()((set) => ({
  alerts: [],
  // La más reciente primero.
  add: (alert) =>
    set((state) => ({
      alerts: [
        { ...alert, id: `alert-${(nextId += 1)}`, read: false },
        ...state.alerts,
      ].slice(0, MAX_ALERTS),
    })),
  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
    })),
  clear: () => set({ alerts: [] }),
}))
