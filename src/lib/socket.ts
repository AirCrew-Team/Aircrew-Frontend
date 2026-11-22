import { io, type Socket } from "socket.io-client"

// El socket va al gateway: http://localhost:3000 (sin /api, como VITE_URL_API_BACKEND).
const GATEWAY_URL = (import.meta.env.VITE_URL_API_BACKEND ?? "").replace(
  /\/api\/?$/,
  ""
)

// Conexión a las alertas en tiempo real del servicio de notificaciones. La sesión viaja
// en la cookie httpOnly aircrew_token: withCredentials hace que el navegador la mande.
export const connectAlerts = (): Socket =>
  io(GATEWAY_URL, {
    path: "/api/notification/socket.io",
    withCredentials: true,
  })
