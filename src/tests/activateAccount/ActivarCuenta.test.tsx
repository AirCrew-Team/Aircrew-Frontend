import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, onTestFinished } from "vitest"

import { ROLES, type AuthUser } from "@/App/types/auth.types"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  ACTIVATED_MESSAGE,
  ACTIVATED_USER,
  INVALID_ACTIVATION_MESSAGE,
  TEST_TOKEN,
  VALID_PASSWORD,
  activateError,
  mockActivate,
  mockCheckActivationToken,
} from "../mocks/activateApi"
import { AUTH_URLS, CREW_PROFILE, errorBody, loginBody } from "../mocks/authApi"
import { apiError, createGate } from "../mocks/passwordResetApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast, queryAllToasts } from "../utils/toasts"

// Spec activar-cuenta: pantalla pública /activar-cuenta (AC-01 a AC-12), y Ampliación B
// de recuperar-contrasena: comprobación del enlace al abrirlo (AC-13 a AC-16).

// Ampliación B: al abrir la pantalla con token se comprueba el enlace. Por defecto el
// enlace es válido (200), así AC-01 a AC-12 prueban lo mismo que antes. Los tests que
// necesitan otra respuesta llaman a mockCheckActivationToken(...), que tiene prioridad.
beforeEach(() => {
  mockCheckActivationToken()
})

const ACTIVATE_PATH = "/activar-cuenta"
const WITH_TOKEN = `${ACTIVATE_PATH}?token=${TEST_TOKEN}`

const TEXTS = {
  invalidLink:
    "Este enlace de activación no es válido o ya venció. Pide a tu supervisor que te envíe una nueva invitación. Si ya activaste tu cuenta, inicia sesión.",
  network: "No pudimos conectar con el servidor. Intenta de nuevo.",
  welcome: "Cuenta activada. ¡Bienvenido a AirCrew!",
  activatedOnly: ACTIVATED_MESSAGE,
}

const RULES = [
  "Al menos 12 caracteres",
  "Una letra mayúscula",
  "Una letra minúscula",
  "Un número",
  "Un carácter especial",
]

const WAIT = { timeout: 2000 }

const findHeading = () =>
  screen.findByRole("heading", { level: 1, name: "Activa tu cuenta" })

const passwordInput = () =>
  screen.getByLabelText(/^Nueva contraseña$/, { selector: "input" })
const confirmInput = () =>
  screen.getByLabelText(/^Confirmar contraseña$/, { selector: "input" })
const submitButton = () =>
  screen.getByRole("button", { name: "Activar cuenta" })

const findSubmitButton = () =>
  screen.findByRole("button", { name: "Activar cuenta" }, WAIT)

// Abre la pantalla y espera el formulario: el h1 ya se ve mientras se comprueba el
// enlace, así que no basta con esperar el título.
const openForm = async (path = WITH_TOKEN) => {
  const router = renderRoute(path)
  await findHeading()
  await findSubmitButton()
  return router
}

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  password = VALID_PASSWORD,
  confirm = password
) => {
  await user.type(passwordInput(), password)
  await user.type(confirmInput(), confirm)
}

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

const loginOk = () => HttpResponse.json(loginBody(ACTIVATED_USER))
const loginRejected = () =>
  HttpResponse.json(errorBody("Credenciales inválidas"), { status: 401 })

const ruleItem = (text: string) => {
  const list = screen.getByRole("list", { name: "Requisitos de contraseña" })
  const item = within(list)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.includes(text))
  if (!item) throw new Error(`No hay una regla «${text}»`)
  return item
}
const isMet = (text: string) =>
  ruleItem(text).textContent?.includes("(cumplido)") ?? false

const expectInvalidLink = async () => {
  const alert = await screen.findByRole("alert", {}, WAIT)
  expect(alert).toHaveTextContent(TEXTS.invalidLink)
  const link = screen.getByRole("link", { name: "Ir al inicio de sesión" })
  expect(link).toHaveAttribute("href", "/login")
  expect(screen.queryByLabelText(/^Nueva contraseña$/)).toBeNull()
  expect(screen.queryByRole("button", { name: "Activar cuenta" })).toBeNull()
}

describe("AC-01: la pantalla con token", () => {
  it("AC-01 muestra el h1 «Activa tu cuenta», los dos campos de contraseña con su etiqueta y el botón «Activar cuenta»", async () => {
    await openForm(`${ACTIVATE_PATH}?token=abc`)

    expect(passwordInput()).toHaveAttribute("type", "password")
    expect(confirmInput()).toHaveAttribute("type", "password")
    expect(submitButton()).toBeEnabled()
  })
})

describe("AC-02: enlace sin token", () => {
  it.each([
    ["sin token", ACTIVATE_PATH],
    ["con token vacío", `${ACTIVATE_PATH}?token=`],
  ])(
    "AC-02 %s: aviso de enlace no válido con enlace a /login, sin formulario y sin petición",
    async (_label, path) => {
      const bodies = mockActivate()
      renderRoute(path)

      await expectInvalidLink()
      expect(bodies).toHaveLength(0)
    }
  )
})

describe("AC-03: reglas en vivo", () => {
  it("AC-03 la lista «Requisitos de contraseña» tiene las cinco reglas en orden y todas pendientes al inicio", async () => {
    await openForm()

    const list = screen.getByRole("list", { name: "Requisitos de contraseña" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(RULES.length)
    RULES.forEach((rule, index) => {
      expect(items[index]).toHaveTextContent(rule)
      expect(items[index]).toHaveTextContent("(pendiente)")
    })
  })

  it("AC-03 cada regla pasa a «(cumplido)» al escribir lo que pide: minúscula, mayúscula, número, especial y 12 caracteres", async () => {
    const user = userEvent.setup()
    await openForm()

    await user.type(passwordInput(), "a")
    expect(isMet("Una letra minúscula")).toBe(true)
    expect(isMet("Una letra mayúscula")).toBe(false)

    await user.type(passwordInput(), "B")
    expect(isMet("Una letra mayúscula")).toBe(true)
    expect(isMet("Un número")).toBe(false)

    await user.type(passwordInput(), "1")
    expect(isMet("Un número")).toBe(true)
    expect(isMet("Un carácter especial")).toBe(false)

    await user.type(passwordInput(), "-")
    expect(isMet("Un carácter especial")).toBe(true)
    expect(isMet("Al menos 12 caracteres")).toBe(false)

    await user.type(passwordInput(), "cdefghijk")
    expect(isMet("Al menos 12 caracteres")).toBe(true)
  })

  it("AC-03 una regla vuelve a «(pendiente)» si el usuario borra lo que la cumplía", async () => {
    const user = userEvent.setup()
    await openForm()

    await user.type(passwordInput(), "A")
    expect(isMet("Una letra mayúscula")).toBe(true)
    await user.clear(passwordInput())
    expect(isMet("Una letra mayúscula")).toBe(false)
  })
})

describe("AC-04: validación al enviar", () => {
  const cases: Array<{
    name: string
    password: string
    confirm: string
    invalid: "password" | "confirm"
  }> = [
    { name: "vacío", password: "", confirm: "", invalid: "password" },
    {
      name: "menos de 12 caracteres",
      password: "Aa1-corta",
      confirm: "Aa1-corta",
      invalid: "password",
    },
    {
      name: "sin mayúscula",
      password: "clave-de-prueba1",
      confirm: "clave-de-prueba1",
      invalid: "password",
    },
    {
      name: "sin minúscula",
      password: "CLAVE-DE-PRUEBA1",
      confirm: "CLAVE-DE-PRUEBA1",
      invalid: "password",
    },
    {
      name: "sin número",
      password: "Clave-de-prueba",
      confirm: "Clave-de-prueba",
      invalid: "password",
    },
    {
      name: "sin carácter especial",
      password: "Clavedeprueba1",
      confirm: "Clavedeprueba1",
      invalid: "password",
    },
    {
      // 44 caracteres pero 84 bytes UTF-8.
      name: "más de 72 bytes",
      password: "Aa1-" + "ñ".repeat(40),
      confirm: "Aa1-" + "ñ".repeat(40),
      invalid: "password",
    },
    {
      name: "confirmación distinta",
      password: VALID_PASSWORD,
      confirm: "Otra-clave-1234",
      invalid: "confirm",
    },
  ]

  it.each(cases)(
    "AC-04 $name: marca el campo con aria-invalid, le da el foco y no llama al backend",
    async ({ password, confirm, invalid }) => {
      const bodies = mockActivate()
      const user = userEvent.setup()
      await openForm()

      if (password) await user.type(passwordInput(), password)
      if (confirm) await user.type(confirmInput(), confirm)
      await user.click(submitButton())

      const field = invalid === "password" ? passwordInput() : confirmInput()
      await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"))
      await waitFor(() => expect(field).toHaveFocus())
      expect(bodies).toHaveLength(0)
    }
  )

  it("AC-04 con la confirmación distinta, el mensaje contiene «no coinciden»", async () => {
    const user = userEvent.setup()
    await openForm()

    await fillForm(user, VALID_PASSWORD, `${VALID_PASSWORD}x`)
    await user.click(submitButton())

    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument()
  })

  it("AC-04 con ambos campos vacíos, el foco va al primer campo con error", async () => {
    const user = userEvent.setup()
    await openForm()

    await user.click(submitButton())

    await waitFor(() => expect(passwordInput()).toHaveFocus())
    expect(passwordInput()).toHaveAttribute("aria-invalid", "true")
  })
})

describe("AC-04b: descripción accesible del campo", () => {
  it("AC-04b «Nueva contraseña» se describe con las reglas y, con error, también con el mensaje", async () => {
    const user = userEvent.setup()
    await openForm()

    expect(passwordInput()).toHaveAccessibleDescription(
      expect.stringContaining("Al menos 12 caracteres")
    )

    await user.type(passwordInput(), "Aa1-corta")
    await user.click(submitButton())

    await waitFor(() =>
      expect(passwordInput()).toHaveAttribute("aria-invalid", "true")
    )
    const description = passwordInput().getAttribute("aria-describedby") ?? ""
    const ids = description.split(/\s+/).filter(Boolean)
    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(passwordInput()).toHaveAccessibleDescription(
      expect.stringContaining("Al menos 12 caracteres")
    )
  })

  it("AC-04b el mensaje de más de 72 bytes no habla de bytes", async () => {
    const user = userEvent.setup()
    await openForm()

    const long = "Aa1-" + "ñ".repeat(40)
    await fillForm(user, long)
    await user.click(submitButton())

    expect(
      await screen.findByText(
        "La contraseña es demasiado larga. Usa menos caracteres o evita tildes y símbolos especiales."
      )
    ).toBeInTheDocument()
  })
})

describe("AC-05: el envío", () => {
  it("AC-05 envía POST /activate con { token, password } exactos", async () => {
    const bodies = mockActivate()
    mockLogin(loginOk)
    const user = userEvent.setup()
    await openForm()

    await fillForm(user)
    await user.click(submitButton())

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ token: TEST_TOKEN, password: VALID_PASSWORD })
  })
})

describe("AC-06: éxito con login automático", () => {
  it("AC-06 hace login con el correo de la respuesta y la contraseña, abre la sesión, muestra el toast y llega al inicio del tripulante", async () => {
    mockActivate()
    const loginBodies = mockLogin(loginOk)
    const user = userEvent.setup()
    const router = await openForm()

    await fillForm(user)
    await user.click(submitButton())

    await findToast(TEXTS.welcome)
    expect(loginBodies).toEqual([
      { email: ACTIVATED_USER.email, password: VALID_PASSWORD },
    ])
    await waitFor(
      () =>
        expect(router.state.location.pathname).toBe(
          HOME_PATH_BY_ROLE[ROLES.TRIPULANTE]
        ),
      WAIT
    )
    expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio)
    expect(useAuthStore.getState().user).not.toBeNull()
  })
})

describe("AC-07: éxito sin login", () => {
  it("AC-07 si el login falla, muestra el toast «Cuenta activada. Ya puedes iniciar sesión.» y va a /login sin sesión", async () => {
    mockActivate()
    mockLogin(loginRejected)
    const user = userEvent.setup()
    const router = await openForm()

    await fillForm(user)
    await user.click(submitButton())

    await findToast(TEXTS.activatedOnly)
    await waitFor(
      () => expect(router.state.location.pathname).toBe(PATHS.login),
      WAIT
    )
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("AC-07b con la sesión de otra persona abierta, si el login falla cierra esa sesión y va a /login sin usuario", async () => {
    const previous: AuthUser = {
      id: "u-sup-otra",
      displayName: "Sara Gómez",
      fullName: "Sara Gómez Ruiz",
      position: "Supervisor",
      role: ROLES.SUPER_VISOR,
    }
    let logoutCalls = 0
    server.use(
      http.post(AUTH_URLS.logout, () => {
        logoutCalls += 1
        return new HttpResponse(null, { status: 204 })
      })
    )
    mockActivate()
    mockLogin(loginRejected)
    useAuthStore.getState().setUser(previous)
    const user = userEvent.setup()
    const router = await openForm()

    await fillForm(user)
    await user.click(submitButton())

    await findToast(TEXTS.activatedOnly)
    await waitFor(
      () => expect(router.state.location.pathname).toBe(PATHS.login),
      WAIT
    )
    expect(logoutCalls).toBe(1)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("AC-08: enlace vencido (400)", () => {
  it("AC-08 con 400 cambia el formulario por el aviso de enlace no válido con el enlace a /login y sin toast", async () => {
    mockActivate(activateError(400))
    const user = userEvent.setup()
    await openForm()

    await fillForm(user)
    await user.click(submitButton())

    await expectInvalidLink()
    expect(queryAllToasts()).toHaveLength(0)
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Ir al inicio de sesión" })
      ).toHaveFocus()
    )
    expect(
      screen.queryByText("Crea tu contraseña para entrar a AirCrew.")
    ).toBeNull()
  })
})

describe("AC-09: error de red o 500", () => {
  it.each([
    ["500", activateError(500)],
    ["error de red", () => HttpResponse.error()],
  ])(
    "AC-09 con %s muestra «No pudimos conectar…», conserva lo escrito y permite reenviar",
    async (_label, respond) => {
      const bodies = mockActivate(respond)
      mockLogin(loginRejected)
      const user = userEvent.setup()
      await openForm()

      await fillForm(user)
      await user.click(submitButton())

      const alert = await screen.findByRole("alert", {}, WAIT)
      expect(alert).toHaveTextContent(TEXTS.network)
      expect(passwordInput()).toHaveValue(VALID_PASSWORD)
      expect(confirmInput()).toHaveValue(VALID_PASSWORD)
      const button = await screen.findByRole("button", {
        name: "Activar cuenta",
      })
      expect(button).toBeEnabled()
      expect(
        screen.queryByRole("link", { name: "Ir al inicio de sesión" })
      ).toBeNull()

      await user.click(button)
      await waitFor(() => expect(bodies).toHaveLength(2))
    }
  )
})

// Spec cierre-pendientes, FE-1 (F5): la activación no pasa `limitFallback` a
// NewPasswordPanel. Hoy un 429 de /activate se muestra como «No pudimos conectar…».
// Debe tratarse como límite, igual que en el restablecimiento (PR-12b).
describe("FE1-F5: límite (429) en la activación", () => {
  const ACTIVATION_LIMIT =
    "Demasiados intentos de activación. Intenta más tarde."

  it("FE1-F5: con un 429 con mensaje, el formulario se cambia por ese mensaje en un role=status, sin «No pudimos conectar…», con el foco en «Ir al inicio de sesión» y sin login", async () => {
    const bodies = mockActivate(apiError(429, ACTIVATION_LIMIT))
    const loginBodies = mockLogin(loginOk)
    const user = userEvent.setup()
    await openForm()

    await fillForm(user)
    await user.click(submitButton())

    await waitFor(() => expect(bodies).toHaveLength(1))
    const notice = await screen.findByText(ACTIVATION_LIMIT, {}, WAIT)
    expect(
      notice.closest('[role="status"]'),
      "el aviso debe ser role=status"
    ).not.toBeNull()
    expect(screen.queryByText(TEXTS.network)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByLabelText(/^Nueva contraseña$/)).toBeNull()
    expect(screen.queryByRole("button", { name: "Activar cuenta" })).toBeNull()
    const link = screen.getByRole("link", { name: "Ir al inicio de sesión" })
    expect(link).toHaveAttribute("href", PATHS.login)
    await waitFor(() => expect(link).toHaveFocus())
    expect(queryAllToasts()).toHaveLength(0)
    expect(loginBodies).toHaveLength(0)
    expect(useAuthStore.getState().user).toBeNull()
  })

  // La spec no fija el texto de respaldo de la activación (duda abierta): solo se
  // exige que sea un aviso de límite con texto y no el error de conexión.
  it("FE1-F5: con un 429 sin `error` en el body, aparece un role=status con texto y no «No pudimos conectar…»", async () => {
    mockActivate(apiError(429))
    const user = userEvent.setup()
    await openForm()

    await fillForm(user)
    await user.click(submitButton())

    const notice = await screen.findByRole("status", {}, WAIT)
    expect(notice.textContent?.trim()).not.toBe("")
    expect(screen.queryByText(TEXTS.network)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("button", { name: "Activar cuenta" })).toBeNull()
  })
})

describe("AC-10: envío en curso", () => {
  it("AC-10 mientras se envía el botón dice «Activando…» y está deshabilitado, y un doble clic hace una sola petición", async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const bodies = mockActivate(async () => {
      await gate
      return activateError(400)()
    })
    const user = userEvent.setup()
    await openForm()

    await fillForm(user)
    await user.dblClick(submitButton())

    const busy = await screen.findByRole("button", { name: "Activando…" })
    expect(busy).toBeDisabled()
    expect(bodies).toHaveLength(1)

    release()
    await expectInvalidLink()
    expect(bodies).toHaveLength(1)
  })
})

describe("AC-11: ruta pública", () => {
  it("AC-11 sin sesión no redirige a /login: se queda en /activar-cuenta con el h1", async () => {
    const router = renderRoute(WITH_TOKEN)

    await findHeading()
    expect(router.state.location.pathname).toBe(ACTIVATE_PATH)
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("AC-12: el token no se guarda", () => {
  it("AC-12 tras el flujo de éxito, ni localStorage, ni sessionStorage ni document.cookie contienen el token", async () => {
    mockActivate()
    mockLogin(loginOk)
    const user = userEvent.setup()
    const router = await openForm()

    await fillForm(user)
    await user.click(submitButton())
    await findToast(TEXTS.welcome)
    await waitFor(
      () =>
        expect(router.state.location.pathname).toBe(PATHS.tripulante.inicio),
      WAIT
    )

    const dump = (storage: Storage) =>
      JSON.stringify(Object.fromEntries(Object.entries(storage)))
    expect(dump(localStorage)).not.toContain(TEST_TOKEN)
    expect(dump(sessionStorage)).not.toContain(TEST_TOKEN)
    expect(document.cookie).not.toContain(TEST_TOKEN)
  })
})

// Ampliación B: comprobación del enlace al abrir la pantalla.

const CHECKING = "Comprobando el enlace…"
const SUBTITLE = "Crea tu contraseña para entrar a AirCrew."

// Espera la comprobación y que todas las peticiones lleven `{ token }`. No fija cuántas:
// con StrictMode un efecto puede pedirla dos veces.
const expectCheckedWith = async (bodies: unknown[], token: string) => {
  await waitFor(
    () =>
      expect(bodies, "debe enviar POST /activate/check").not.toHaveLength(0),
    WAIT
  )
  bodies.forEach((body) => expect(body).toEqual({ token }))
}

const expectNoForm = () => {
  expect(screen.queryByLabelText(/^Nueva contraseña$/)).toBeNull()
  expect(screen.queryByRole("button", { name: "Activar cuenta" })).toBeNull()
}

describe("AC-13: comprobación del enlace al abrir la pantalla", () => {
  it('AC-13 al abrir ?token=abc envía POST /activate/check con { token: "abc" }', async () => {
    const checkBodies = mockCheckActivationToken()
    renderRoute(`${ACTIVATE_PATH}?token=abc`)

    await findHeading()
    await expectCheckedWith(checkBodies, "abc")
  })

  it("AC-13 mientras se comprueba se ve «Comprobando el enlace…» en un role=status con el h1 y sin el formulario; con el 200 aparece el formulario", async () => {
    const { gate, release } = createGate()
    onTestFinished(() => release())
    const checkBodies = mockCheckActivationToken(async () => {
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
    expect(screen.getByText(SUBTITLE)).toBeInTheDocument()
    expect(screen.queryByText(CHECKING)).toBeNull()
  })
})

describe("AC-14: la comprobación responde 400", () => {
  it("AC-14 aparece el aviso de enlace no válido sin escribir nada, sin mover el foco al enlace y sin llamar a activate", async () => {
    const checkBodies = mockCheckActivationToken(
      apiError(400, INVALID_ACTIVATION_MESSAGE)
    )
    const activateBodies = mockActivate()
    renderRoute(WITH_TOKEN)

    await findHeading()
    await expectCheckedWith(checkBodies, TEST_TOKEN)
    await expectInvalidLink()
    expect(
      screen.getByRole("link", { name: "Ir al inicio de sesión" })
    ).not.toHaveFocus()
    expect(screen.queryByText(SUBTITLE)).toBeNull()
    expect(queryAllToasts()).toHaveLength(0)
    expect(activateBodies).toHaveLength(0)
  })
})

describe("AC-15: la comprobación falla por red o 500", () => {
  it.each([
    ["500", apiError(500, "Error interno")],
    ["error de red", () => HttpResponse.error()],
  ])(
    "AC-15 con %s aparece el formulario, sin aviso de error, y se puede activar normalmente",
    async (_label, respond) => {
      const checkBodies = mockCheckActivationToken(respond)
      const activateBodies = mockActivate()
      mockLogin(loginOk)
      const user = userEvent.setup()
      renderRoute(WITH_TOKEN)

      await findHeading()
      await expectCheckedWith(checkBodies, TEST_TOKEN)
      await findSubmitButton()
      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.queryByText(CHECKING)).toBeNull()

      await fillForm(user)
      await user.click(submitButton())

      await findToast(TEXTS.welcome)
      expect(activateBodies).toEqual([
        { token: TEST_TOKEN, password: VALID_PASSWORD },
      ])
    }
  )
})

describe("AC-16: sin token no se comprueba", () => {
  it.each([
    ["sin token", ACTIVATE_PATH],
    ["con token vacío", `${ACTIVATE_PATH}?token=`],
  ])(
    "AC-16 %s no se llama a check y aparece el aviso de enlace no válido",
    async (_label, path) => {
      const checkBodies = mockCheckActivationToken()
      renderRoute(path)

      await findHeading()
      await expectInvalidLink()
      // Margen para una petición lanzada al montar: es un «no llamó», no hay evento que esperar.
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(checkBodies).toHaveLength(0)
    }
  )
})
