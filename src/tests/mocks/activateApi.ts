// Contrato de POST /api/admin/auth/activate que simulan los tests de la spec activar-cuenta.
// Los valores son simples a propósito: Gitleaks marca los que parecen secretos.
import { http, HttpResponse } from "msw"

import { server } from "../utils/server"

import { API_URL, type ApiUser } from "./authApi"

export const ACTIVATE_URL = `${API_URL}/api/admin/auth/activate`

export const TEST_TOKEN = "token-de-prueba"
export const VALID_PASSWORD = "Clave-de-prueba1"

export const ACTIVATED_MESSAGE = "Cuenta activada. Ya puedes iniciar sesión."

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

// POST /activate: registra cada body recibido y responde con `respond`.
export const mockActivate = (
  respond: () => Response | Promise<Response> = () =>
    HttpResponse.json(activateBody())
) => {
  const bodies: unknown[] = []
  server.use(
    http.post(ACTIVATE_URL, async ({ request }) => {
      bodies.push(await request.json())
      return respond()
    })
  )
  return bodies
}

export const activateError = (status: number) => () =>
  HttpResponse.json({ error: { message: `Error ${status}` } }, { status })
