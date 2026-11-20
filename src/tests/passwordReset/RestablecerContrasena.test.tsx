import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { TEST_TOKEN, VALID_PASSWORD } from "../mocks/activateApi"
import {
  API_USERS,
  AUTH_URLS,
  CREW_PROFILE,
  errorBody,
  loginBody,
  type ApiUser,
} from "../mocks/authApi"
import {
  INVALID_RESET_MESSAGES,
  LIMIT_MESSAGES,
  RESET_MESSAGE,
  RESET_PATH,
  RESET_USER,
  apiError,
  createGate,
  mockCheckResetToken,
  mockResetPassword,
  resetBody,
} from "../mocks/passwordResetApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast, queryAllToasts } from "../utils/toasts"

// Spec recuperar-contrasena, F2: pantalla pública /restablecer-contrasena (PR-07 a PR-13)
// y Ampliación A: comprobación del enlace al abrirlo (PR-15 a PR-19).

// Ampliación A: al abrir la pantalla con token se comprueba el enlace. Por defecto el
// enlace es válido (200), así PR-07 a PR-13 prueban lo mismo que antes. Los tests que
// necesitan otra respuesta llaman a mockCheckResetToken(...), que tiene prioridad.
beforeEach(() => {
  mockCheckResetToken()
})

const WITH_TOKEN = `${RESET_PATH}?token=${TEST_TOKEN}`

const TEXTS = {
  subtitle: "Crea una contraseña nueva para tu cuenta.",
  invalidLink:
    "Este enlace para restablecer la contraseña no es válido o ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?» en el inicio de sesión.",
  network: "No pudimos conectar con el servidor. Intenta de nuevo.",
  welcome: "Contraseña actualizada. ¡Bienvenido de nuevo!",
  updatedOnly: RESET_MESSAGE,
}

const RULES = [
  "Al menos 12 caracteres",
  "Una letra mayúscula",
  "Una letra minúscula",
  "Un número",
  "Un carácter especial",
]

const WAIT = { timeout: 2000 }

type UserEventInstance = ReturnType<typeof userEvent.setup>

const findHeading = () =>
  screen.findByRole("heading", { level: 1, name: "Restablece tu contraseña" })

const passwordInput = () =>
  screen.getByLabelText(/^Nueva contraseña$/, { selector: "input" })
const confirmInput = () =>
  screen.getByLabelText(/^Confirmar contraseña$/, { selector: "input" })
const submitButton = () =>
  screen.getByRole("button", { name: "Cambiar contraseña" })
const loginLink = () =>
  screen.getByRole("link", { name: "Ir al inicio de sesión" })

const findSubmitButton = () =>
  screen.findByRole("button", { name: "Cambiar contraseña" }, WAIT)

// Abre la pantalla y espera el formulario: el h1 ya se ve mientras se comprueba el
// enlace, así que no basta con esperar el título.
const openForm = async (path = WITH_TOKEN) => {
  const router = renderRoute(path)
  await findHeading()
  await findSubmitButton()
  return router
}

const fillForm = async (
  user: UserEventInstance,
  password = VALID_PASSWORD,
  confirm = password
) => {
  await user.type(passwordInput(), password)
  await user.type(confirmInput(), confirm)
}

const submitValidForm = async (user: UserEventInstance) => {
  await fillForm(user)
  await user.click(submitButton())
}

// POST /auth/login (login automático) y el perfil de crew que pide el login de un tripulante.
const mockLogin = (respond: () => Response) => {
  const bodies: unknown[] = []
  server.use(
    http.post(AUTH_URLS.login, async ({ request }) => {
      bodies.push(await request.json())
      return respond()
    }),
    http.get(AUTH_URLS.crewProfile, () => HttpResponse.json(CREW_PROFILE))
  )
  return bodies
}

const loginOk =
  (user: ApiUser = RESET_USER) =>
  () =>
    HttpResponse.json(loginBody(user))
const loginRejected = () =>
  HttpResponse.json(errorBody("Credenciales inválidas"), { status: 401 })

const countLogout = () => {
  let calls = 0
  server.use(
    http.post(AUTH_URLS.logout, () => {
      calls += 1
      return new HttpResponse(null, { status: 204 })
    })
  )
  return () => calls
}

const PREVIOUS_SESSION: AuthUser = {
  id: "u-sup-otra",
  displayName: "Sara Gómez",
  fullName: "Sara Gómez Ruiz",
  position: "Supervisor",
  role: ROLES.SUPER_VISOR,
}

const expectInvalidLink = async () => {
  const alert = await screen.findByRole("alert", {}, WAIT)
  expect(alert).toHaveTextContent(TEXTS.invalidLink)
  expect(loginLink()).toHaveAttribute("href", PATHS.login)
  expect(screen.queryByLabelText(/^Nueva contraseña$/)).toBeNull()
  expect(
    screen.queryByRole("button", { name: "Cambiar contraseña" })
  ).toBeNull()
}

describe("PR-07: la pantalla con token", () => {
  it("PR-07 /restablecer-contrasena?token=abc muestra el h1 «Restablece tu contraseña», el subtítulo, los dos campos y el botón «Cambiar contraseña»", async () => {
    await openForm(`${RESET_PATH}?token=abc`)

    expect(screen.getByText(TEXTS.subtitle)).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute("type", "password")
    expect(confirmInput()).toHaveAttribute("type", "password")
    expect(submitButton()).toBeEnabled()
  })

  it("PR-07 la lista «Requisitos de contraseña» tiene las cinco reglas de la activación en orden", async () => {
    await openForm()

    const list = screen.getByRole("list", { name: "Requisitos de contraseña" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(RULES.length)
    RULES.forEach((rule, index) => {
      expect(items[index]).toHaveTextContent(rule)
    })
  })
})

describe("PR-08: el envío", () => {
  it('PR-08 envía POST /reset-password con { token: "abc", password } exactos', async () => {
    const bodies = mockResetPassword()
    mockLogin(loginOk())
    const user = userEvent.setup()
    await openForm(`${RESET_PATH}?token=abc`)

    await submitValidForm(user)

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ token: "abc", password: VALID_PASSWORD })
  })

  it("PR-08 con una contraseña que no cumple las reglas, marca el campo y no llama al backend", async () => {
    const bodies = mockResetPassword()
    const user = userEvent.setup()
    await openForm()

    await fillForm(user, "Aa1-corta")
    await user.click(submitButton())

    await waitFor(() =>
      expect(passwordInput()).toHaveAttribute("aria-invalid", "true")
    )
    expect(bodies).toHaveLength(0)
  })

  it("PR-08 mientras se envía el botón dice «Cambiando…» y está deshabilitado, y un doble clic hace una sola petición", async () => {
    const { gate, release } = createGate()
    onTestFinished(() => release())
    const bodies = mockResetPassword(async () => {
      await gate
      return apiError(400, INVALID_RESET_MESSAGES.link)()
    })
    const user = userEvent.setup()
    await openForm()

    await fillForm(user)
    await user.dblClick(submitButton())

    const busy = await screen.findByRole("button", { name: "Cambiando…" })
    expect(busy).toBeDisabled()
    expect(bodies).toHaveLength(1)

    release()
    await expectInvalidLink()
    expect(bodies).toHaveLength(1)
  })
})

describe("PR-09: éxito con login automático", () => {
  it.each([
    { label: "tripulante", apiUser: RESET_USER, role: ROLES.TRIPULANTE },
    {
      label: "supervisor",
      apiUser: API_USERS.supervisor,
      role: ROLES.SUPER_VISOR,
    },
  ])(
    "PR-09 ($label) hace login con el correo de la respuesta, abre la sesión, muestra «Contraseña actualizada. ¡Bienvenido de nuevo!» y llega al inicio del rol con replace",
    async ({ apiUser, role }) => {
      mockResetPassword(() => HttpResponse.json(resetBody(apiUser)))
      const loginBodies = mockLogin(loginOk(apiUser))
      const user = userEvent.setup()
      const router = await openForm()

      await submitValidForm(user)

      await findToast(TEXTS.welcome)
      expect(loginBodies).toEqual([
        { email: apiUser.email, password: VALID_PASSWORD },
      ])
      await waitFor(
        () =>
          expect(router.state.location.pathname).toBe(HOME_PATH_BY_ROLE[role]),
        WAIT
      )
      expect(router.state.historyAction).toBe("REPLACE")
      expect(useAuthStore.getState().user).toMatchObject({ role })
    }
  )
})

describe("PR-10: éxito sin login", () => {
  it("PR-10 si el login falla, muestra «Contraseña actualizada. Ya puedes iniciar sesión.» y va a /login sin sesión", async () => {
    mockResetPassword()
    mockLogin(loginRejected)
    const user = userEvent.setup()
    const router = await openForm()

    await submitValidForm(user)

    await findToast(TEXTS.updatedOnly)
    await waitFor(
      () => expect(router.state.location.pathname).toBe(PATHS.login),
      WAIT
    )
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("PR-10 con la sesión de otra persona abierta, si el login falla cierra esa sesión y va a /login sin usuario", async () => {
    const logoutCalls = countLogout()
    mockResetPassword()
    mockLogin(loginRejected)
    useAuthStore.getState().setUser(PREVIOUS_SESSION)
    const user = userEvent.setup()
    const router = await openForm()

    await submitValidForm(user)

    await findToast(TEXTS.updatedOnly)
    await waitFor(
      () => expect(router.state.location.pathname).toBe(PATHS.login),
      WAIT
    )
    expect(logoutCalls()).toBe(1)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("PR-11: enlace no válido", () => {
  it.each([
    ["sin token", RESET_PATH],
    ["con token vacío", `${RESET_PATH}?token=`],
  ])(
    "PR-11 %s: aviso de enlace no válido con el enlace a /login, sin formulario y sin petición",
    async (_label, path) => {
      const bodies = mockResetPassword()
      renderRoute(path)

      await findHeading()
      await expectInvalidLink()
      expect(bodies).toHaveLength(0)
    }
  )

  it.each([
    ["token vencido o usado", INVALID_RESET_MESSAGES.link],
    ["datos no válidos", INVALID_RESET_MESSAGES.body],
  ])(
    "PR-11 con un 400 (%s) cambia el formulario por el aviso, con el foco en «Ir al inicio de sesión» y sin toast",
    async (_label, message) => {
      mockResetPassword(apiError(400, message))
      const user = userEvent.setup()
      await openForm()

      await submitValidForm(user)

      await expectInvalidLink()
      await waitFor(() => expect(loginLink()).toHaveFocus())
      expect(queryAllToasts()).toHaveLength(0)
      expect(screen.queryByText(TEXTS.subtitle)).toBeNull()
    }
  )
})

describe("PR-12: error de red o 500", () => {
  it.each([
    ["500", apiError(500, "Error interno")],
    ["error de red", () => HttpResponse.error()],
  ])(
    "PR-12 con %s muestra «No pudimos conectar…», conserva lo escrito y permite reenviar",
    async (_label, respond) => {
      const bodies = mockResetPassword(respond)
      mockLogin(loginRejected)
      const user = userEvent.setup()
      await openForm()

      await submitValidForm(user)

      const alert = await screen.findByRole("alert", {}, WAIT)
      expect(alert).toHaveTextContent(TEXTS.network)
      expect(passwordInput()).toHaveValue(VALID_PASSWORD)
      expect(confirmInput()).toHaveValue(VALID_PASSWORD)
      const button = await screen.findByRole("button", {
        name: "Cambiar contraseña",
      })
      await waitFor(() => expect(button).toBeEnabled())
      expect(
        screen.queryByRole("link", { name: "Ir al inicio de sesión" })
      ).toBeNull()

      await user.click(button)
      await waitFor(() => expect(bodies).toHaveLength(2))
    }
  )
})

describe("PR-12b: límite de cambios (429)", () => {
  // El único 429 real de /reset-password es el de cambios. Los otros mensajes prueban que
  // la pantalla muestra el `error` del body y no un texto fijo.
  it.each([
    ["cambios", LIMIT_MESSAGES.changes],
    ["otro mensaje del body", LIMIT_MESSAGES.requests],
  ])(
    "PR-12b con el 429 (%s) el formulario se cambia por el mensaje del body en un role=status, con el foco en «Ir al inicio de sesión», sin toast, sin login y sin sesión",
    async (_label, message) => {
      mockResetPassword(apiError(429, message))
      const loginBodies = mockLogin(loginOk())
      const user = userEvent.setup()
      await openForm()

      await submitValidForm(user)

      const notice = await screen.findByText(message, {}, WAIT)
      expect(
        notice.closest('[role="status"]'),
        "el aviso debe ser role=status"
      ).not.toBeNull()
      expect(
        notice.closest('[role="alert"]'),
        "el aviso no debe ser role=alert"
      ).toBeNull()
      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.queryByLabelText(/^Nueva contraseña$/)).toBeNull()
      expect(
        screen.queryByRole("button", { name: "Cambiar contraseña" })
      ).toBeNull()
      expect(loginLink()).toHaveAttribute("href", PATHS.login)
      await waitFor(() => expect(loginLink()).toHaveFocus())
      expect(queryAllToasts()).toHaveLength(0)
      expect(loginBodies).toHaveLength(0)
      expect(useAuthStore.getState().user).toBeNull()
    }
  )

  it("PR-12b con un 429 sin `error` en el body aparece el texto de respaldo del límite de cambios en un role=status", async () => {
    mockResetPassword(apiError(429))
    const user = userEvent.setup()
    await openForm()

    await submitValidForm(user)

    const notice = await screen.findByText(LIMIT_MESSAGES.changes, {}, WAIT)
    expect(notice.closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    await waitFor(() => expect(loginLink()).toHaveFocus())
  })

  it("PR-12b con el 429 el enlace enfocado «Ir al inicio de sesión» tiene el aviso del límite como descripción accesible", async () => {
    mockResetPassword(apiError(429, LIMIT_MESSAGES.changes))
    const user = userEvent.setup()
    await openForm()

    await submitValidForm(user)

    await waitFor(() => expect(loginLink()).toHaveFocus(), WAIT)
    expect(loginLink()).toHaveAccessibleDescription(LIMIT_MESSAGES.changes)
  })
})

describe("PR-13: ruta pública y token fuera del almacenamiento", () => {
  it("PR-13 sin sesión no redirige a /login: se queda en /restablecer-contrasena con el h1", async () => {
    const router = renderRoute(WITH_TOKEN)

    await findHeading()
    expect(router.state.location.pathname).toBe(RESET_PATH)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("PR-13 con una sesión ya abierta tampoco redirige: muestra el formulario", async () => {
    useAuthStore.getState().setUser(PREVIOUS_SESSION)
    const router = renderRoute(WITH_TOKEN)

    await findHeading()
    expect(await findSubmitButton()).toBeEnabled()
    expect(router.state.location.pathname).toBe(RESET_PATH)
  })

  it("PR-13 tras el flujo de éxito, el token no se escribió en localStorage, sessionStorage ni document.cookie", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    const setCookie = vi.spyOn(document, "cookie", "set")
    onTestFinished(() => {
      setItem.mockRestore()
      setCookie.mockRestore()
    })
    // Sondas: confirman que los espías ven las escrituras antes de limpiarlos.
    sessionStorage.setItem("sonda", "x")
    document.cookie = "sonda=x"
    expect(setItem).toHaveBeenCalledWith("sonda", "x")
    expect(setCookie).toHaveBeenCalledWith("sonda=x")
    sessionStorage.removeItem("sonda")
    document.cookie = "sonda=; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    setItem.mockClear()
    setCookie.mockClear()

    mockResetPassword()
    mockLogin(loginOk())
    const user = userEvent.setup()
    const router = await openForm()

    await submitValidForm(user)
    await findToast(TEXTS.welcome)
    await waitFor(
      () =>
        expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio),
      WAIT
    )

    const written = [...setItem.mock.calls, ...setCookie.mock.calls].flat()
    expect(written.join(" ")).not.toContain(TEST_TOKEN)
    const dump = (storage: Storage) =>
      JSON.stringify(Object.fromEntries(Object.entries(storage)))
    expect(dump(localStorage)).not.toContain(TEST_TOKEN)
    expect(dump(sessionStorage)).not.toContain(TEST_TOKEN)
    expect(document.cookie).not.toContain(TEST_TOKEN)
  })
})

// Ampliación A: comprobación del enlace al abrir la pantalla.

const CHECKING = "Comprobando el enlace…"

// Espera la comprobación y que todas las peticiones lleven `{ token }`. No fija cuántas:
// con StrictMode un efecto puede pedirla dos veces y TanStack Query la deduplica.
const expectCheckedWith = async (bodies: unknown[], token: string) => {
  await waitFor(
    () =>
      expect(bodies, "debe enviar POST /reset-password/check").not.toHaveLength(
        0
      ),
    WAIT
  )
  bodies.forEach((body) => expect(body).toEqual({ token }))
}

const expectNoForm = () => {
  expect(screen.queryByLabelText(/^Nueva contraseña$/)).toBeNull()
  expect(
    screen.queryByRole("button", { name: "Cambiar contraseña" })
  ).toBeNull()
}

describe("PR-15: comprobación del enlace al abrir la pantalla", () => {
  it('PR-15 al abrir ?token=abc envía POST /reset-password/check con { token: "abc" }', async () => {
    const checkBodies = mockCheckResetToken()
    renderRoute(`${RESET_PATH}?token=abc`)

    await findHeading()
    await expectCheckedWith(checkBodies, "abc")
  })

  it("PR-15 mientras se comprueba se ve «Comprobando el enlace…» en un role=status con el h1 y sin el formulario; con el 200 aparece el formulario", async () => {
    const { gate, release } = createGate()
    onTestFinished(() => release())
    const checkBodies = mockCheckResetToken(async () => {
      await gate
      return HttpResponse.json({ valid: true })
    })
    renderRoute(WITH_TOKEN)

    await findHeading()
    const checking = await screen.findByText(CHECKING, {}, WAIT)
    expect(
      checking.closest('[role="status"]'),
      "«Comprobando el enlace…» debe estar en un role=status"
    ).not.toBeNull()
    expectNoForm()
    await expectCheckedWith(checkBodies, TEST_TOKEN)

    release()
    expect(await findSubmitButton()).toBeEnabled()
    expect(passwordInput()).toBeInTheDocument()
    expect(confirmInput()).toBeInTheDocument()
    expect(screen.getByText(TEXTS.subtitle)).toBeInTheDocument()
    expect(screen.queryByText(CHECKING)).toBeNull()
  })
})

describe("PR-16: la comprobación responde 400", () => {
  it("PR-16 aparece el aviso de enlace no válido sin escribir nada, sin mover el foco al enlace y sin llamar a reset-password", async () => {
    const checkBodies = mockCheckResetToken(
      apiError(400, INVALID_RESET_MESSAGES.link)
    )
    const resetBodies = mockResetPassword()
    renderRoute(WITH_TOKEN)

    await findHeading()
    await expectCheckedWith(checkBodies, TEST_TOKEN)
    await expectInvalidLink()
    expect(loginLink()).not.toHaveFocus()
    expect(screen.queryByText(TEXTS.subtitle)).toBeNull()
    expect(queryAllToasts()).toHaveLength(0)
    expect(resetBodies).toHaveLength(0)
  })
})

describe("PR-17: la comprobación responde 429", () => {
  // Los dos mensajes prueban que la pantalla muestra el `error` del body y no un texto fijo.
  it.each([
    ["cambios", LIMIT_MESSAGES.changes],
    ["otro mensaje del body", LIMIT_MESSAGES.requests],
  ])(
    "PR-17 con el 429 (%s) aparece el mensaje del body en un role=status con el enlace a /login, sin formulario y sin llamar a reset-password",
    async (_label, message) => {
      const checkBodies = mockCheckResetToken(apiError(429, message))
      const resetBodies = mockResetPassword()
      renderRoute(WITH_TOKEN)

      await findHeading()
      await expectCheckedWith(checkBodies, TEST_TOKEN)
      const notice = await screen.findByText(message, {}, WAIT)
      expect(
        notice.closest('[role="status"]'),
        "el aviso debe ser role=status"
      ).not.toBeNull()
      expect(
        notice.closest('[role="alert"]'),
        "el aviso no debe ser role=alert"
      ).toBeNull()
      expect(screen.queryByRole("alert")).toBeNull()
      expectNoForm()
      expect(loginLink()).toHaveAttribute("href", PATHS.login)
      expect(queryAllToasts()).toHaveLength(0)
      expect(resetBodies).toHaveLength(0)
    }
  )
})

describe("PR-18: la comprobación falla por red o 500", () => {
  it.each([
    ["500", apiError(500, "Error interno")],
    ["error de red", () => HttpResponse.error()],
  ])(
    "PR-18 con %s aparece el formulario, sin aviso de error, y se puede enviar normalmente",
    async (_label, respond) => {
      const checkBodies = mockCheckResetToken(respond)
      const resetBodies = mockResetPassword()
      mockLogin(loginOk())
      const user = userEvent.setup()
      renderRoute(WITH_TOKEN)

      await findHeading()
      await expectCheckedWith(checkBodies, TEST_TOKEN)
      await findSubmitButton()
      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.queryByText(CHECKING)).toBeNull()

      await submitValidForm(user)

      await findToast(TEXTS.welcome)
      expect(resetBodies).toEqual([
        { token: TEST_TOKEN, password: VALID_PASSWORD },
      ])
    }
  )
})

describe("PR-19: sin token no se comprueba", () => {
  it.each([
    ["sin token", RESET_PATH],
    ["con token vacío", `${RESET_PATH}?token=`],
  ])(
    "PR-19 %s no se llama a check y aparece el aviso de enlace no válido",
    async (_label, path) => {
      const checkBodies = mockCheckResetToken()
      renderRoute(path)

      await findHeading()
      await expectInvalidLink()
      // Margen para una petición lanzada al montar: es un «no llamó», no hay evento que esperar.
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(checkBodies).toHaveLength(0)
    }
  )
})
