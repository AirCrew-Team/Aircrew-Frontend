// Contrato de la recuperación de contraseña (spec recuperar-contrasena) que simulan los tests:
// - POST /api/admin/auth/forgot-password con { email } → 200 { message };
// - POST /api/admin/auth/reset-password con { token, password } → 200 { message, user };
// - POST /api/admin/auth/reset-password/check con { token } → 200 { valid: true }, 400 o
//   429 (Ampliación A: la pantalla comprueba el enlace al abrirse).
// Los errores del backend llegan como { error: "<mensaje en texto>" }.
// Los valores son simples a propósito: Gitleaks marca los que parecen secretos.
import { http, HttpResponse } from "msw"

import { server } from "../utils/server"

import { API_URL, type ApiUser } from "./authApi"

export const FORGOT_PASSWORD_URL = `${API_URL}/api/admin/auth/forgot-password`
export const RESET_PASSWORD_URL = `${API_URL}/api/admin/auth/reset-password`
export const RESET_CHECK_URL = `${RESET_PASSWORD_URL}/check`

export const RESET_PATH = "/restablecer-contrasena"

export const FORGOT_MESSAGE =
  "Si el correo corresponde a una cuenta activa, te enviamos un enlace para restablecer la contraseña."
export const RESET_MESSAGE = "Contraseña actualizada. Ya puedes iniciar sesión."

export const INVALID_RESET_MESSAGES = {
  link: "El enlace para restablecer la contraseña no es válido o ya venció.",
  body: "Se requieren el token y una contraseña de 12 a 72 bytes.",
}

// Mensajes de los límites (Decisiones, punto 4).
export const LIMIT_MESSAGES = {
  changes:
    "Ya cambiaste tu contraseña 3 veces en las últimas 24 horas. Podrás cambiarla de nuevo más tarde.",
  wait: "Ya te enviamos un enlace hace poco. Revisa tu correo (también la carpeta de spam) o espera 2 minutos para pedir otro.",
  requests:
    "Alcanzaste el límite de 5 solicitudes en 24 horas. Intenta de nuevo más tarde.",
}

// Tripulante que recupera su contraseña: rol crew, con un correo distinto al de API_USERS.crew.
export const RESET_USER: ApiUser = {
  id: "u-crew-3",
  name: "Ana Torres Rivas",
  email: "ana.torres@aircrew.com",
  role: "crew",
}

export const resetBody = (user: ApiUser = RESET_USER) => ({
  message: RESET_MESSAGE,
  user,
})

// Error con el formato real del backend. Sin `message`, el body no trae `error`.
export const apiError = (status: number, message?: string) => () =>
  HttpResponse.json(message === undefined ? {} : { error: message }, {
    status,
  })

type Respond = () => Response | Promise<Response>

// Registra cada body recibido en `url` y responde con `respond`.
const mockPost = (url: string, respond: Respond) => {
  const bodies: unknown[] = []
  server.use(
    http.post(url, async ({ request }) => {
      bodies.push(await request.json())
      return respond()
    })
  )
  return bodies
}

export const mockForgotPassword = (
  respond: Respond = () => HttpResponse.json({ message: FORGOT_MESSAGE })
) => mockPost(FORGOT_PASSWORD_URL, respond)

export const mockResetPassword = (
  respond: Respond = () => HttpResponse.json(resetBody())
) => mockPost(RESET_PASSWORD_URL, respond)

// Comprobación del enlace al abrir /restablecer-contrasena. Por defecto, enlace válido.
export const mockCheckResetToken = (
  respond: Respond = () => HttpResponse.json({ valid: true })
) => mockPost(RESET_CHECK_URL, respond)

// Respuesta retenida hasta llamar a `release` (para ver el estado «enviando»).
export const createGate = () => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return { gate, release }
}
