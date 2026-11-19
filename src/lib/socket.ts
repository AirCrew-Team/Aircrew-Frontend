import { io, type Socket } from "socket.io-client"

// El socket va al gateway (sin el /api del cliente HTTP): http://localhost:3000.
const GATEWAY_URL = (import.meta.env.VITE_URL_API_BACKEND ?? "").replace(
  /\/api\/?$/,
  ""
)

// Conexión a las alertas en tiempo real del servicio de notificaciones.
export const connectAlerts = (token: string): Socket =>
  io(GATEWAY_URL, {
    path: "/api/notification/socket.io",
    auth: { token },
  })
