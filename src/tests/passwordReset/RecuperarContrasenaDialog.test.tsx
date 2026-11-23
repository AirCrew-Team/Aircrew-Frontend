import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, onTestFinished } from "vitest"

import { PATHS } from "@/routes/paths"

import { VALID_PASSWORD } from "../mocks/activateApi"
import { AUTH_URLS, errorBody } from "../mocks/authApi"
import {
  LIMIT_MESSAGES,
  RESET_USER,
  apiError,
  createGate,
  mockForgotPassword,
} from "../mocks/passwordResetApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { queryAllToasts } from "../utils/toasts"

// Spec recuperar-contrasena, F1: diálogo «Recuperar contraseña» del Login (PR-01 a PR-06).

const TEXTS = {
  description:
    "Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para crear una contraseña nueva.",
  invalidEmail: "Ingresa un correo válido para continuar.",
  checkEmail: (email: string) =>
    `Si ${email} corresponde a una cuenta activa, te enviamos un enlace para crear una contraseña nueva. Vence en 10 minutos. Revisa también la carpeta de spam.`,
  sendFailed: "No pudimos enviar el enlace. Intenta de nuevo.",
  tooMany: "Hiciste demasiadas solicitudes. Intenta de nuevo más tarde.",
  locked:
    "Se alcanzó el límite de intentos. Recupera tu contraseña para continuar.",
}

const WAIT = { timeout: 2000 }

type UserEventInstance = ReturnType<typeof userEvent.setup>

// Pausa corta para que una petición tardía (que no debería salir) llegue a contarse.
const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

// El diálogo abierto, sea cual sea su paso (el título cambia en el paso 2).
const currentDialog = () => screen.getByRole("dialog")

const emailInput = (dialog: HTMLElement) =>
  within(dialog).getByRole("textbox", { name: "Correo electrónico" })
const sendButton = (dialog: HTMLElement) =>
  within(dialog).getByRole("button", { name: "Enviar enlace" })

const openDialog = async (user: UserEventInstance) => {
  renderRoute(PATHS.login)
  await user.click(
    await screen.findByRole("button", { name: "¿Olvidaste tu contraseña?" })
  )
  return screen.findByRole("dialog", { name: "Recuperar contraseña" })
}

const requestLink = async (user: UserEventInstance, email: string) => {
  const dialog = await openDialog(user)
  await user.type(emailInput(dialog), email)
  await user.click(sendButton(dialog))
  return dialog
}

// El mensaje está dentro de un role="status" y fuera de cualquier role="alert".
const expectInfoNotice = async (dialog: HTMLElement, text: string) => {
  const message = await within(dialog).findByText(text, {}, WAIT)
  expect(
    message.closest('[role="status"]'),
    "el aviso debe ser role=status"
  ).not.toBeNull()
  expect(
    message.closest('[role="alert"]'),
    "el aviso no debe ser role=alert"
  ).toBeNull()
  expect(within(dialog).queryByRole("alert")).toBeNull()
}

describe("PR-01: abrir el diálogo desde el Login", () => {
  it("PR-01 «¿Olvidaste tu contraseña?» abre el diálogo «Recuperar contraseña» con su descripción, el campo «Correo electrónico» y el botón «Enviar enlace»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.login)
    const trigger = await screen.findByRole("button", {
      name: "¿Olvidaste tu contraseña?",
    })
    expect(screen.queryByRole("dialog")).toBeNull()

    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", {
      name: "Recuperar contraseña",
    })
    expect(dialog).toHaveAccessibleDescription(TEXTS.description)
    expect(emailInput(dialog)).toHaveValue("")
    expect(sendButton(dialog)).toBeEnabled()
  })
})

describe("PR-02: correo con formato inválido", () => {
  it.each(["ana.torres", "ana@aircrew", "ana torres@aircrew.com"])(
    "PR-02 con «%s» aparece «Ingresa un correo válido para continuar.» y no se pide el enlace",
    async (email) => {
      const bodies = mockForgotPassword()
      const user = userEvent.setup()

      const dialog = await requestLink(user, email)

      expect(
        await within(dialog).findByText(TEXTS.invalidEmail)
      ).toBeInTheDocument()
      await settle()
      expect(bodies).toHaveLength(0)
      expect(sendButton(dialog)).toBeEnabled()
    }
  )
})

describe("PR-03: envío del correo y paso «Revisa tu correo»", () => {
  it("PR-03 envía POST /forgot-password con { email } normalizado (sin espacios y en minúsculas)", async () => {
    const bodies = mockForgotPassword()
    const user = userEvent.setup()

    await requestLink(user, "  Ana.Torres@AirCrew.com ")

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({ email: "ana.torres@aircrew.com" })
  })

  it("PR-03 con el 200 el formulario se cambia por «Revisa tu correo» con el correo escrito, sin toast", async () => {
    mockForgotPassword()
    const user = userEvent.setup()

    await requestLink(user, RESET_USER.email)

    const dialog = currentDialog()
    expect(
      await within(dialog).findByRole("heading", { name: "Revisa tu correo" })
    ).toBeInTheDocument()
    expect(dialog).toHaveTextContent(TEXTS.checkEmail(RESET_USER.email))
    expect(
      within(dialog).queryByRole("textbox", { name: "Correo electrónico" })
    ).toBeNull()
    expect(
      within(dialog).queryByRole("button", { name: "Enviar enlace" })
    ).toBeNull()
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("PR-03 «Entendido» cierra el diálogo y deja el Login en /login", async () => {
    mockForgotPassword()
    const user = userEvent.setup()

    await requestLink(user, RESET_USER.email)
    await user.click(
      await within(currentDialog()).findByRole("button", { name: "Entendido" })
    )

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" })
    ).toBeInTheDocument()
  })
})

describe("PR-04: envío en curso", () => {
  it("PR-04 mientras se envía el botón dice «Enviando…» y está deshabilitado, y un doble clic hace una sola petición", async () => {
    const { gate, release } = createGate()
    onTestFinished(() => release())
    const bodies = mockForgotPassword(async () => {
      await gate
      return HttpResponse.json({ message: "ok" })
    })
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    await user.type(emailInput(dialog), RESET_USER.email)
    await user.dblClick(sendButton(dialog))

    const busy = await within(dialog).findByRole("button", {
      name: "Enviando…",
    })
    expect(busy).toBeDisabled()
    expect(bodies).toHaveLength(1)

    release()
    expect(
      await within(currentDialog()).findByRole("heading", {
        name: "Revisa tu correo",
      })
    ).toBeInTheDocument()
    expect(bodies).toHaveLength(1)
  })
})

describe("PR-04b: respuesta de un envío anterior al cierre del diálogo", () => {
  const OTHER_EMAIL = "luis.mora@aircrew.com"

  // Cierra con la X y vuelve a abrir desde «¿Olvidaste tu contraseña?».
  const closeDialog = async (user: UserEventInstance) => {
    await user.click(
      within(currentDialog()).getByRole("button", { name: "Cerrar ventana" })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  }
  const reopenDialog = async (user: UserEventInstance) => {
    await user.click(
      screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" })
    )
    return screen.findByRole("dialog", { name: "Recuperar contraseña" })
  }

  // La 1.ª petición espera la puerta y responde con `first`; las demás, 200.
  const mockHeldFirstResponse = (first: () => Response) => {
    const { gate, release } = createGate()
    onTestFinished(() => release())
    let calls = 0
    const bodies = mockForgotPassword(async () => {
      calls += 1
      if (calls === 1) {
        await gate
        return first()
      }
      return HttpResponse.json({ message: "ok" })
    })
    return { bodies, release }
  }

  const ok = () => HttpResponse.json({ message: "ok" })

  it("PR-04b si la respuesta llega con el diálogo cerrado, el diálogo sigue cerrado, sin aviso ni toast", async () => {
    const { bodies, release } = mockHeldFirstResponse(ok)
    const user = userEvent.setup()

    await requestLink(user, RESET_USER.email)
    await waitFor(() => expect(bodies).toHaveLength(1))
    await closeDialog(user)
    release()
    await settle(300)

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByText("Revisa tu correo")).toBeNull()
    expect(queryAllToasts()).toHaveLength(0)
  })

  it.each([
    ["200", ok],
    ["500", apiError(500, "Error interno")],
    ["429", apiError(429, LIMIT_MESSAGES.wait)],
  ])(
    "PR-04b si la respuesta (%s) llega tras volver a abrir, el diálogo nuevo sigue en el paso del correo, sin alertas, y se puede enviar normalmente",
    async (_label, first) => {
      const { bodies, release } = mockHeldFirstResponse(first)
      const user = userEvent.setup()

      await requestLink(user, RESET_USER.email)
      await waitFor(() => expect(bodies).toHaveLength(1))
      await closeDialog(user)
      const dialog = await reopenDialog(user)
      release()
      await settle(300)

      expect(currentDialog()).toHaveAccessibleName("Recuperar contraseña")
      expect(
        within(dialog).queryByRole("heading", { name: "Revisa tu correo" })
      ).toBeNull()
      expect(within(dialog).queryByRole("alert")).toBeNull()
      expect(within(dialog).queryByRole("status")).toBeNull()
      expect(emailInput(dialog)).toHaveValue("")
      expect(sendButton(dialog)).toBeEnabled()

      await user.type(emailInput(dialog), OTHER_EMAIL)
      await user.click(sendButton(dialog))

      expect(
        await within(currentDialog()).findByRole(
          "heading",
          { name: "Revisa tu correo" },
          WAIT
        )
      ).toBeInTheDocument()
      expect(currentDialog()).toHaveTextContent(TEXTS.checkEmail(OTHER_EMAIL))
      expect(bodies).toEqual([
        { email: RESET_USER.email },
        { email: OTHER_EMAIL },
      ])
    }
  )
})

describe("PR-05: error de red, 5xx o 503", () => {
  it.each([
    ["500", apiError(500, "Error interno")],
    ["503", apiError(503, "Servicio no configurado")],
    ["error de red", () => HttpResponse.error()],
  ])(
    "PR-05 con %s aparece «No pudimos enviar el enlace…» (role=alert), el correo se mantiene y se puede reenviar",
    async (_label, respond) => {
      const bodies = mockForgotPassword(respond)
      const user = userEvent.setup()

      const dialog = await requestLink(user, RESET_USER.email)

      const alert = await within(dialog).findByRole("alert", {}, WAIT)
      expect(alert).toHaveTextContent(TEXTS.sendFailed)
      expect(emailInput(dialog)).toHaveValue(RESET_USER.email)
      const button = await within(dialog).findByRole("button", {
        name: "Enviar enlace",
      })
      await waitFor(() => expect(button).toBeEnabled())
      expect(
        within(dialog).queryByRole("heading", { name: "Revisa tu correo" })
      ).toBeNull()

      await user.click(button)
      await waitFor(() => expect(bodies).toHaveLength(2))
    }
  )
})

describe("PR-05b: límite de solicitudes (429)", () => {
  it.each([
    ["cambios", LIMIT_MESSAGES.changes],
    ["espera", LIMIT_MESSAGES.wait],
    ["solicitudes", LIMIT_MESSAGES.requests],
  ])(
    "PR-05b con el 429 de %s aparece el mensaje del body en un role=status (no alert), sin pasar a «Revisa tu correo» y con el correo escrito",
    async (_label, message) => {
      mockForgotPassword(apiError(429, message))
      const user = userEvent.setup()

      const dialog = await requestLink(user, RESET_USER.email)

      await expectInfoNotice(dialog, message)
      expect(
        within(dialog).queryByRole("heading", { name: "Revisa tu correo" })
      ).toBeNull()
      expect(emailInput(dialog)).toHaveValue(RESET_USER.email)
      expect(queryAllToasts()).toHaveLength(0)
    }
  )

  it("PR-05b con un 429 sin `error` en el body aparece «Hiciste demasiadas solicitudes. Intenta de nuevo más tarde.» en un role=status", async () => {
    mockForgotPassword(apiError(429))
    const user = userEvent.setup()

    const dialog = await requestLink(user, RESET_USER.email)

    await expectInfoNotice(dialog, TEXTS.tooMany)
    expect(emailInput(dialog)).toHaveValue(RESET_USER.email)
    expect(
      within(dialog).queryByRole("heading", { name: "Revisa tu correo" })
    ).toBeNull()
  })

  it("PR-05b tras un 429 el campo «Correo electrónico» tiene el aviso del límite como descripción accesible", async () => {
    mockForgotPassword(apiError(429, LIMIT_MESSAGES.wait))
    const user = userEvent.setup()

    const dialog = await requestLink(user, RESET_USER.email)

    await expectInfoNotice(dialog, LIMIT_MESSAGES.wait)
    expect(emailInput(dialog)).toHaveAccessibleDescription(LIMIT_MESSAGES.wait)
  })
})

describe("PR-06: tercer intento fallido del Login", () => {
  it("PR-06 al tercer 401 el diálogo se abre con el correo ya escrito y no pide el enlace hasta pulsar «Enviar enlace»", async () => {
    let loginCalls = 0
    server.use(
      http.post(AUTH_URLS.login, () => {
        loginCalls += 1
        return HttpResponse.json(errorBody("Credenciales inválidas"), {
          status: 401,
        })
      })
    )
    const bodies = mockForgotPassword()
    const user = userEvent.setup()
    renderRoute(PATHS.login)

    await user.type(
      await screen.findByRole("textbox", { name: "Correo" }),
      RESET_USER.email
    )
    await user.type(
      screen.getByLabelText("Contraseña", { selector: "input" }),
      VALID_PASSWORD
    )
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const button = await screen.findByRole("button", {
        name: "Iniciar sesión",
      })
      await waitFor(() => expect(button).toBeEnabled())
      await user.click(button)
      await waitFor(() => expect(loginCalls).toBe(attempt), WAIT)
    }

    const dialog = await screen.findByRole(
      "dialog",
      { name: "Recuperar contraseña" },
      WAIT
    )
    expect(screen.getByText(TEXTS.locked)).toBeInTheDocument()
    expect(emailInput(dialog)).toHaveValue(RESET_USER.email)
    expect(sendButton(dialog)).toBeEnabled()
    expect(within(dialog).queryByRole("alert")).toBeNull()
    await settle(300)
    expect(bodies).toHaveLength(0)

    // Ancla: al pulsar «Enviar enlace» sí sale la petición con ese correo.
    await user.click(sendButton(dialog))
    await waitFor(() => expect(bodies).toEqual([{ email: RESET_USER.email }]))
  })
})
