// La conexión va al gateway: http://localhost:3000 (sin /api, como VITE_URL_API_BACKEND).
const GATEWAY_URL = (import.meta.env.VITE_URL_API_BACKEND ?? "").replace(
  /\/api\/?$/,
  ""
)

export const ALERTS_STREAM_URL = `${GATEWAY_URL}/api/notification/stream`

export interface AlertsConnection {
  // Escucha un evento del servidor; `data` llega ya convertido de JSON.
  on: (name: string, handler: (payload: unknown) => void) => void
  close: () => void
}

// Conexión SSE (EventSource) a los avisos en tiempo real del servicio de notificaciones.
// La sesión viaja en la cookie httpOnly aircrew_token: withCredentials hace que el
// navegador la mande. Si se cae, el navegador reconecta solo.
export const connectAlerts = (): AlertsConnection => {
  // Entornos sin EventSource (jsdom en los tests): sin conexión.
  if (typeof EventSource === "undefined") {
    return { on: () => {}, close: () => {} }
  }

  const source = new EventSource(ALERTS_STREAM_URL, { withCredentials: true })

  return {
    on: (name, handler) =>
      source.addEventListener(name, (event) => {
        try {
          handler(JSON.parse((event as MessageEvent<string>).data))
        } catch {
          // Un evento mal formado no debe romper la app.
        }
      }),
    close: () => source.close(),
  }
}
