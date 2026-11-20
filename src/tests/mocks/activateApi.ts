// Contrato de la activación que simulan los tests de la spec activar-cuenta:
// - POST /api/admin/auth/activate con { token, password } → 200 { message, user };
// - POST /api/admin/auth/activate/check con { token } → 200 { valid: true } o
//   400 { error: "<texto>" } (Ampliación B de recuperar-contrasena: la pantalla
//   comprueba el enlace al abrirse).
// Los valores son simples a propósito: Gitleaks marca los que parecen secretos.
import { http, HttpResponse } from "msw"

import { server } from "../utils/server"

import { API_URL, type ApiUser } from "./authApi"

export const ACTIVATE_URL = `${API_URL}/api/admin/auth/activate`
export const ACTIVATE_CHECK_URL = `${ACTIVATE_URL}/check`

export const TEST_TOKEN = "token-de-prueba"
export const VALID_PASSWORD = "Clave-de-prueba1"

export const ACTIVATED_MESSAGE = "Cuenta activada. Ya puedes iniciar sesión."

// Mensaje del 400 de activate/check (formato real: { error: "<texto>" }).
export const INVALID_ACTIVATION_MESSAGE =
  "El token de activación no es válido o ya venció."

// Tripulante recién activado: rol crew, con un correo distinto al de API_USERS.crew.
export const ACTIVATED_USER: ApiUser = {
  id: "u-crew-2",
  name: "Ana Torres Rivas",
  email: "ana.torres@aircrew.com",
  role: "crew",
}

export const activateBody = (user: ApiUser = ACTIVATED_USER) => ({
  message: ACTIVATED_MESSAGE,
  user,
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

// POST /activate: registra cada body recibido y responde con `respond`.
export const mockActivate = (
  respond: Respond = () => HttpResponse.json(activateBody())
) => mockPost(ACTIVATE_URL, respond)

// Comprobación del enlace al abrir /activar-cuenta. Por defecto, enlace válido.
export const mockCheckActivationToken = (
  respond: Respond = () => HttpResponse.json({ valid: true })
) => mockPost(ACTIVATE_CHECK_URL, respond)

export const activateError = (status: number) => () =>
  HttpResponse.json({ error: { message: `Error ${status}` } }, { status })
