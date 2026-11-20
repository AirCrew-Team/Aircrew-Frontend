import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse } from "msw"
import { describe, expect, it, onTestFinished, vi } from "vitest"

import { useAuthStore } from "@/stores/auth.store"

import { apiError } from "../mocks/passwordResetApi"
import {
  LAST_CHANGE_DAYS,
  REAL_ACCOUNTS,
  type FakeProfileOptions,
  type RealAccountKey,
} from "../mocks/profileApi"
import { findToast, queryToast } from "../utils/toasts"
import {
  BLOCK,
  CONFIGURACION_PATH,
  FIELD,
  findLoadedMain,
  getSectionByHeading,
  openRealSession,
  REAL_KEYS,
  SAVE,
  SAVED_TOAST,
  waitForCities,
} from "./profileTestUtils"

// Spec configuracion-real, CF-04: el panel actual de «Cambiar contraseña», conectado a
// POST /api/admin/auth/change-password con { current_password, new_password } y con las
// reglas de 12 caracteres (NEW_PASSWORD_RULES). También se portan a MSW los
// comportamientos del panel que la spec conserva (CS-16 y CS-17 de la spec anterior):
// foco al abrir y al cerrar, Enter que envía solo la contraseña y sin doble envío.

// Escriben en tres campos con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

// Datos de prueba sin aspecto de secreto (Gitleaks): derivados de una palabra simple.
const WORD = "Bitacora"
const currentValue = `${WORD}#2026ok`
const nextValue = `${WORD}#2027ok`
// 10 caracteres con mayúscula, minúscula, número y símbolo: válida con la regla vieja de
// 8, inválida con la de 12.
const shortValue = `${WORD.slice(0, 3)}#2027ok`

const PASSWORD_TOAST = "Contraseña actualizada."
const WRONG_CURRENT = "La contraseña actual no es correcta."
const LIMIT_MESSAGE =
  "Ya cambiaste tu contraseña 3 veces en las últimas 24 horas. Podrás cambiarla de nuevo más tarde."
const GENERIC_ERROR = "No pudimos cambiar la contraseña. Intenta de nuevo."

const setup = async (
  key: RealAccountKey = "crew",
  options?: FakeProfileOptions
) => {
  const user = userEvent.setup()
  const session = openRealSession(key, { options })
  const main = await findLoadedMain(REAL_ACCOUNTS[key].email)
  return { ...session, user, main }
}

const securityOf = (main: HTMLElement) =>
  getSectionByHeading(main, BLOCK.security)

// Abre el panel con «Cambiar contraseña» y devuelve sus campos (etiquetas del panel
// actual, sin distinguir mayúsculas).
const openPanel = async (
  user: ReturnType<typeof userEvent.setup>,
  main: HTMLElement
) => {
  const security = securityOf(main)
  await user.click(
    within(security).getByRole("button", { name: "Cambiar contraseña" })
  )
  const group = await within(security).findByRole("group", {
    name: /Cambiar contraseña/i,
  })
  const panel = within(group)
  return {
    group,
    current: panel.getByLabelText(/^contraseña actual/i),
    next: panel.getByLabelText(/^nueva contraseña/i),
    confirm: panel.getByLabelText(/^confirmar contraseña/i),
    submit: panel.getByRole("button", { name: /^Actualizar contraseña/i }),
  }
}

const fillPanel = async (
  user: ReturnType<typeof userEvent.setup>,
  fields: Awaited<ReturnType<typeof openPanel>>,
  { current = currentValue, next = nextValue } = {}
) => {
  await user.type(fields.current, current)
  await user.type(fields.next, next)
  await user.type(fields.confirm, next)
}

// Compuerta: la respuesta del servidor espera a que el test la libere.
const gated = () => {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  onTestFinished(() => release())
  return {
    release,
    respond: async () => {
      await gate
      return HttpResponse.json({
        password_changed_at: new Date().toISOString(),
      })
    },
  }
}

describe("CF-04: cambio de contraseña correcto", () => {
  it.each(REAL_KEYS)(
    "CF-04: con un %s, envía POST con { current_password, new_password }, aparece «Contraseña actualizada.», el panel se cierra, el último cambio pasa a «hoy» y la sesión sigue abierta",
    async (key) => {
      const { user, main, backend, router } = await setup(key)
      // Punto de partida: hace 10 días.
      expect(securityOf(main).textContent).toMatch(
        new RegExp(
          `Último cambio de contraseña:\\s*hace ${LAST_CHANGE_DAYS} días`
        )
      )
      const fields = await openPanel(user, main)

      await fillPanel(user, fields)
      await user.click(fields.submit)

      await findToast(PASSWORD_TOAST)
      expect(backend.bodies.changePassword).toEqual([
        { current_password: currentValue, new_password: nextValue },
      ])
      await waitFor(() => expect(fields.group).not.toBeInTheDocument())
      await waitFor(() =>
        expect(securityOf(main).textContent).toMatch(
          /Último cambio de contraseña:\s*hoy/
        )
      )
      // La sesión no se cierra.
      expect(useAuthStore.getState().user?.id).toBe(REAL_ACCOUNTS[key].id)
      expect(router.state.location.pathname).toBe(CONFIGURACION_PATH)
      // Va aparte del perfil: no hay PATCH ni su toast.
      expect(backend.bodies.patch).toEqual([])
      expect(queryToast(SAVED_TOAST)).toBeNull()
    }
  )

  it("CF-04 (panel actual): tras el cambio, el foco vuelve a «Cambiar contraseña»", async () => {
    const { user, main } = await setup("supervisor")
    const fields = await openPanel(user, main)

    await fillPanel(user, fields)
    await user.click(fields.submit)

    await findToast(PASSWORD_TOAST)
    await waitFor(() =>
      expect(
        within(securityOf(main)).getByRole("button", {
          name: "Cambiar contraseña",
        })
      ).toHaveFocus()
    )
  })
})

describe("CF-04: errores del cambio de contraseña", () => {
  it("CF-04: con un 400, «La contraseña actual no es correcta.» aparece en el campo de la contraseña actual, que recibe el foco", async () => {
    const { user, main, backend } = await setup("crew", {
      respond: { changePassword: apiError(400, WRONG_CURRENT) },
    })
    const fields = await openPanel(user, main)

    await fillPanel(user, fields)
    await user.click(fields.submit)

    await waitFor(() =>
      expect(fields.current).toHaveAccessibleDescription(WRONG_CURRENT)
    )
    expect(fields.current).toHaveAttribute("aria-invalid", "true")
    await waitFor(() => expect(fields.current).toHaveFocus())
    expect(backend.bodies.changePassword).toHaveLength(1)
    expect(queryToast(PASSWORD_TOAST)).toBeNull()
    expect(fields.group).toBeInTheDocument()
  })

  it('CF-04: con un 429, el mensaje del backend aparece como aviso informativo (role="status")', async () => {
    const { user, main } = await setup("admin", {
      respond: { changePassword: apiError(429, LIMIT_MESSAGE) },
    })
    const fields = await openPanel(user, main)

    await fillPanel(user, fields)
    await user.click(fields.submit)

    await waitFor(() => {
      const match = within(securityOf(main))
        .queryAllByRole("status")
        .find((element) => element.textContent?.includes(LIMIT_MESSAGE))
      expect(
        match,
        `debe haber un role=status con «${LIMIT_MESSAGE}»`
      ).toBeDefined()
    })
    expect(fields.current).not.toHaveAttribute("aria-invalid", "true")
    expect(queryToast(PASSWORD_TOAST)).toBeNull()
  })

  it("CF-04: con un 500, aparece «No pudimos cambiar la contraseña. Intenta de nuevo.»", async () => {
    const { user, main } = await setup("supervisor", {
      respond: { changePassword: apiError(500, "Error interno") },
    })
    const fields = await openPanel(user, main)

    await fillPanel(user, fields)
    await user.click(fields.submit)

    expect(
      await within(securityOf(main)).findByText(GENERIC_ERROR)
    ).toBeInTheDocument()
    expect(queryToast(PASSWORD_TOAST)).toBeNull()
  })

  it('CF-04: un 400 con otro mensaje del backend aparece en el aviso general del panel (role="alert") y no en la contraseña actual', async () => {
    const OTHER_400 = "La nueva contraseña debe ser distinta de la actual."
    const { user, main } = await setup("crew", {
      respond: { changePassword: apiError(400, OTHER_400) },
    })
    const fields = await openPanel(user, main)

    await fillPanel(user, fields)
    await user.click(fields.submit)

    expect(await within(fields.group).findByRole("alert")).toHaveTextContent(
      OTHER_400
    )
    expect(fields.current).not.toHaveAttribute("aria-invalid", "true")
    expect(fields.current).not.toHaveAccessibleDescription(OTHER_400)
    expect(queryToast(PASSWORD_TOAST)).toBeNull()
  })

  it.each([
    [429, LIMIT_MESSAGE],
    [500, "Error interno"],
  ])(
    "CF-04: tras un %i enviado con Enter, el foco vuelve a «Actualizar contraseña»",
    async (status, message) => {
      const { user, main, backend } = await setup("admin", {
        respond: { changePassword: apiError(status, message) },
      })
      const fields = await openPanel(user, main)

      await user.type(fields.current, currentValue)
      await user.type(fields.next, nextValue)
      await user.type(fields.confirm, `${nextValue}{Enter}`)

      await waitFor(() => expect(backend.bodies.changePassword).toHaveLength(1))
      await waitFor(() => expect(fields.submit).toHaveFocus())
    }
  )

  it("CF-04: una contraseña nueva de 10 caracteres (válida con la regla vieja de 8) marca «Nueva contraseña» y no envía nada", async () => {
    const { user, main, backend } = await setup("crew")
    const fields = await openPanel(user, main)

    await fillPanel(user, fields, { next: shortValue })
    await user.click(fields.submit)

    await waitFor(() =>
      expect(fields.next).toHaveAttribute("aria-invalid", "true")
    )
    expect(fields.next).toHaveAccessibleDescription()
    expect(backend.bodies.changePassword).toEqual([])
  })
})

describe("CF-04 (panel actual): envío separado del perfil", () => {
  it("CF-04: al abrir el panel el foco va a la contraseña actual y los campos están vacíos", async () => {
    const { user, main } = await setup("crew")

    const fields = await openPanel(user, main)

    await waitFor(() => expect(fields.current).toHaveFocus())
    expect(fields.current).toHaveValue("")
    expect(fields.next).toHaveValue("")
    expect(fields.confirm).toHaveValue("")
  })

  it("CF-04: «Cancelar» cierra el panel sin enviar nada, el foco vuelve a «Cambiar contraseña» y el último cambio no cambia", async () => {
    const { user, main, backend } = await setup("crew")
    const fields = await openPanel(user, main)
    await user.type(fields.current, currentValue)

    await user.click(
      within(fields.group).getByRole("button", { name: "Cancelar" })
    )

    await waitFor(() => expect(fields.group).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        within(securityOf(main)).getByRole("button", {
          name: "Cambiar contraseña",
        })
      ).toHaveFocus()
    )
    expect(backend.bodies.changePassword).toEqual([])
    expect(securityOf(main).textContent).toMatch(
      new RegExp(
        `Último cambio de contraseña:\\s*hace ${LAST_CHANGE_DAYS} días`
      )
    )
  })

  it("CF-04: Enter en un campo del panel envía solo la contraseña (sin PATCH ni «Cambios guardados.»)", async () => {
    const { user, main, backend } = await setup("supervisor")
    const fields = await openPanel(user, main)

    await user.type(fields.current, currentValue)
    await user.type(fields.next, nextValue)
    await user.type(fields.confirm, `${nextValue}{Enter}`)

    await findToast(PASSWORD_TOAST)
    expect(backend.bodies.changePassword).toHaveLength(1)
    expect(backend.bodies.patch).toEqual([])
    expect(queryToast(SAVED_TOAST)).toBeNull()
  })

  it("CF-04: un segundo Enter mientras se envía no repite el cambio", async () => {
    const pending = gated()
    const { user, main, backend } = await setup("crew", {
      respond: { changePassword: pending.respond },
    })
    const fields = await openPanel(user, main)

    await user.type(fields.current, currentValue)
    await user.type(fields.next, nextValue)
    await user.type(fields.confirm, `${nextValue}{Enter}`)
    await waitFor(() => expect(backend.bodies.changePassword).toHaveLength(1))
    await user.keyboard("{Enter}")
    // Margen para que un segundo envío llegara al servidor falso.
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(backend.bodies.changePassword).toHaveLength(1)
    // Se libera dentro del test: el toast no pasa al test siguiente.
    pending.release()
    await findToast(PASSWORD_TOAST)
  })

  it('CF-04: mientras se envía, «Actualizar contraseña» tiene aria-disabled="true" (sin disabled), conserva el foco y un segundo clic no repite el cambio', async () => {
    const pending = gated()
    const { user, main, backend } = await setup("supervisor", {
      respond: { changePassword: pending.respond },
    })
    const fields = await openPanel(user, main)
    await fillPanel(user, fields)

    await user.click(fields.submit)
    await waitFor(() => expect(backend.bodies.changePassword).toHaveLength(1))

    await waitFor(() =>
      expect(fields.submit).toHaveAttribute("aria-disabled", "true")
    )
    expect(fields.submit).not.toHaveAttribute("disabled")
    expect(fields.submit).toHaveFocus()
    await user.click(fields.submit)
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(backend.bodies.changePassword).toHaveLength(1)

    pending.release()
    await findToast(PASSWORD_TOAST)
  })

  it("CF-04: el toast «Contraseña actualizada.» sale aunque el usuario haya salido de Configuración", async () => {
    const pending = gated()
    const { user, main, backend, router } = await setup("crew", {
      respond: { changePassword: pending.respond },
    })
    const fields = await openPanel(user, main)
    await fillPanel(user, fields)

    await user.click(fields.submit)
    await waitFor(() => expect(backend.bodies.changePassword).toHaveLength(1))
    await act(() => router.navigate("/ruta-que-no-existe"))

    pending.release()
    await findToast(PASSWORD_TOAST)
  })

  it("CF-04: «Guardar cambios» con el panel abierto y lleno guarda el perfil y no envía la contraseña", async () => {
    const { user, main, backend } = await setup("admin")
    // A2: la residencia guardada se valida contra el catálogo; se espera a que cargue.
    await waitForCities(within(main).getByLabelText(FIELD.residence))
    const fields = await openPanel(user, main)
    await fillPanel(user, fields)

    await user.click(within(main).getByRole("button", { name: SAVE }))

    await findToast(SAVED_TOAST)
    expect(backend.bodies.patch).toHaveLength(1)
    expect(backend.bodies.changePassword).toEqual([])
    expect(queryToast(PASSWORD_TOAST)).toBeNull()
    expect(screen.queryByText(PASSWORD_TOAST)).toBeNull()
  })
})

// Ampliación A3: el navegador no debe rellenar «Contraseña actual» con la contraseña
// guardada, y el panel no conserva lo escrito entre una apertura y otra.
describe("CF-11: los campos de contraseña empiezan vacíos", () => {
  it('CF-11: los tres campos del panel tienen autocomplete="new-password"', async () => {
    const { user, main } = await setup("supervisor")

    const fields = await openPanel(user, main)

    expect(fields.current).toHaveAttribute("autocomplete", "new-password")
    expect(fields.next).toHaveAttribute("autocomplete", "new-password")
    expect(fields.confirm).toHaveAttribute("autocomplete", "new-password")
  })

  it("CF-11: al abrir el panel, cerrarlo con «Cancelar» con texto escrito en los tres campos y volver a abrirlo, los tres empiezan vacíos", async () => {
    const { user, main, backend } = await setup("crew")
    const first = await openPanel(user, main)
    await fillPanel(user, first)
    await user.click(
      within(first.group).getByRole("button", { name: "Cancelar" })
    )
    await waitFor(() => expect(first.group).not.toBeInTheDocument())

    const again = await openPanel(user, main)

    expect(again.current).toHaveValue("")
    expect(again.next).toHaveValue("")
    expect(again.confirm).toHaveValue("")
    expect(backend.bodies.changePassword).toEqual([])
  })

  it("CF-11: tras un 400 en la contraseña actual, al cerrar y volver a abrir el panel los campos están vacíos y sin el error", async () => {
    const { user, main } = await setup("admin", {
      respond: { changePassword: apiError(400, WRONG_CURRENT) },
    })
    const first = await openPanel(user, main)
    await fillPanel(user, first)
    await user.click(first.submit)
    await waitFor(() =>
      expect(first.current).toHaveAttribute("aria-invalid", "true")
    )
    await user.click(
      within(first.group).getByRole("button", { name: "Cancelar" })
    )
    await waitFor(() => expect(first.group).not.toBeInTheDocument())

    const again = await openPanel(user, main)

    expect(again.current).toHaveValue("")
    expect(again.next).toHaveValue("")
    expect(again.confirm).toHaveValue("")
    expect(again.current).not.toHaveAttribute("aria-invalid", "true")
    expect(again.group).not.toHaveTextContent(WRONG_CURRENT)
  })

  it("CF-11: tras cambiar la contraseña con éxito, al volver a abrir el panel los tres campos están vacíos", async () => {
    const { user, main } = await setup("crew")
    const first = await openPanel(user, main)
    await fillPanel(user, first)
    await user.click(first.submit)
    await findToast(PASSWORD_TOAST)
    await waitFor(() => expect(first.group).not.toBeInTheDocument())

    const again = await openPanel(user, main)

    expect(again.current).toHaveValue("")
    expect(again.next).toHaveValue("")
    expect(again.confirm).toHaveValue("")
  })
})
