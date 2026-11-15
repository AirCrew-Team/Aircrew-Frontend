import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { findToast, queryToast, toastDescription } from "../utils/toasts"
import {
  findLoadedMain,
  findSuccessToast,
  getSectionByHeading,
  querySuccessToast,
  renderConfiguracion,
  SECURITY_HEADING,
} from "./profileTestUtils"

// Panel real de cambio de contraseña en la Configuración del tripulante y del supervisor
// (spec configuracion-tripulante-supervisor, CS-16 y CS-17). El panel vive en
// modules/shared/password y se prueba a través de la página, no importándolo.
// changePassword de profile.data tiene la latencia real (400 ms): temporizadores reales y
// la espera ampliada de findBy/waitFor de setup.ts.

// Escriben en tres campos con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

type DataFn = (...args: unknown[]) => unknown

// Cada función de profile.data.ts se envuelve para registrar sus llamadas (nombre y argumentos),
// como en ConfiguracionPage.dataStates.test.tsx. Sin override, delega en la función real.
const profileData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/profile/data/profile.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          profileData.calls.push({ name, args })
          return (profileData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

afterEach(() => {
  profileData.calls.length = 0
  profileData.overrides = {}
})

const passwordCalls = () =>
  profileData.calls.filter((call) => call.name === "changePassword")

const CORRECT_PASSWORD = "AirCrew2026!"
const WRONG_PASSWORD = "Otra123!x"
const NEW_PASSWORD = "Nueva2026!x"
const PASSWORD_TOAST = "Contraseña actualizada"
const PASSWORD_TOAST_DETAIL =
  "Usa la nueva contraseña en tu próximo inicio de sesión."
const WRONG_PASSWORD_ERROR = "La contraseña actual no es correcta."

const PASSWORD_ROLES = [ROLES.TRIPULANTE, ROLES.SUPER_VISOR] as const

// Días desde el último cambio en los datos simulados (los mismos de CS-02).
const LAST_CHANGE_DAYS: Record<(typeof PASSWORD_ROLES)[number], number> = {
  [ROLES.TRIPULANTE]: 42,
  [ROLES.SUPER_VISOR]: 18,
}

const setup = async (role: Role) => {
  const user = userEvent.setup()
  renderConfiguracion(role)
  const main = await findLoadedMain()
  return { user, main, security: getSectionByHeading(main, SECURITY_HEADING) }
}

// Abre el panel con «Cambiar contraseña» y devuelve sus campos.
const openPasswordPanel = async (
  user: ReturnType<typeof userEvent.setup>,
  security: HTMLElement
) => {
  await user.click(
    within(security).getByRole("button", { name: "Cambiar contraseña" })
  )
  const panel = within(
    await within(security).findByRole("group", { name: "Cambiar contraseña" })
  )
  return {
    panel,
    current: panel.getByLabelText("Contraseña Actual"),
    next: panel.getByLabelText("Nueva Contraseña"),
    confirm: panel.getByLabelText("Confirmar Contraseña"),
    update: panel.getByRole("button", { name: "Actualizar contraseña" }),
  }
}

describe("Configuración: panel de cambio de contraseña (CS-16)", () => {
  it.each(PASSWORD_ROLES)(
    "CS-16: con un %s, al abrir el panel el foco va a «Contraseña Actual» y aparecen sus campos, la fortaleza y sus botones",
    async (role) => {
      const { user, security } = await setup(role)

      const { panel, current, next, confirm } = await openPasswordPanel(
        user,
        security
      )

      await waitFor(() => expect(current).toHaveFocus())
      expect(current).toHaveValue("")
      expect(next).toHaveValue("")
      expect(confirm).toHaveValue("")
      expect(panel.getByText(/Nivel de fortaleza/i)).toBeInTheDocument()
      expect(panel.getByRole("button", { name: "Cancelar" })).toHaveAttribute(
        "type",
        "button"
      )
      expect(
        panel.getByRole("button", { name: "Actualizar contraseña" })
      ).toHaveAttribute("type", "button")
    }
  )

  it.each(PASSWORD_ROLES)(
    "CS-16: con un %s y una contraseña actual incorrecta, aparece «La contraseña actual no es correcta.» en su campo, que recibe el foco",
    async (role) => {
      const { user, security } = await setup(role)
      const { current, next, confirm, update } = await openPasswordPanel(
        user,
        security
      )

      await user.type(current, WRONG_PASSWORD)
      await user.type(next, NEW_PASSWORD)
      await user.type(confirm, NEW_PASSWORD)
      await user.click(update)

      await waitFor(() =>
        expect(current).toHaveAccessibleDescription(WRONG_PASSWORD_ERROR)
      )
      expect(current).toHaveAttribute("aria-invalid", "true")
      await waitFor(() => expect(current).toHaveFocus())
      expect(queryToast(PASSWORD_TOAST)).toBeNull()
      expect(
        within(security).getByRole("group", { name: "Cambiar contraseña" })
      ).toBeInTheDocument()
    }
  )
})

describe("Configuración: la contraseña va aparte del perfil (CS-17)", () => {
  it.each(PASSWORD_ROLES)(
    "CS-17: con un %s, «Guardar Cambios» guarda el perfil y no llama a changePassword, aunque el panel esté abierto y lleno",
    async (role) => {
      // Ancla: sin la función, «no se llamó» pasaría en verde de forma vacía.
      const actual = await vi.importActual<Record<string, unknown>>(
        "@/modules/profile/data/profile.data"
      )
      expect(
        typeof actual.changePassword,
        "changePassword en profile.data"
      ).toBe("function")
      const { user, main, security } = await setup(role)
      const { current, next, confirm } = await openPasswordPanel(user, security)
      await user.type(current, CORRECT_PASSWORD)
      await user.type(next, NEW_PASSWORD)
      await user.type(confirm, NEW_PASSWORD)

      await user.click(
        within(main).getByRole("button", { name: "Guardar Cambios" })
      )

      await findSuccessToast()
      expect(passwordCalls()).toHaveLength(0)
      expect(queryToast(PASSWORD_TOAST)).toBeNull()
    }
  )

  it.each(PASSWORD_ROLES)(
    "CS-17: con un %s, Enter en un campo del panel envía solo la contraseña: aparece su toast y no el del perfil",
    async (role) => {
      // Sin tocar los datos simulados: el éxito real (que deja el último cambio en 0) va en
      // el último describe, para no alterar el estado del módulo entre tests.
      profileData.overrides.changePassword = () => Promise.resolve()
      const { user, security } = await setup(role)
      const { current, next, confirm } = await openPasswordPanel(user, security)

      await user.type(current, CORRECT_PASSWORD)
      await user.type(next, NEW_PASSWORD)
      await user.type(confirm, `${NEW_PASSWORD}{Enter}`)

      await findToast(PASSWORD_TOAST)
      expect(passwordCalls()).toHaveLength(1)
      expect(querySuccessToast()).toBeNull()
    }
  )

  it("con un tripulante, un segundo Enter mientras se envía no repite el cambio de contraseña", async () => {
    // Queda pendiente: el envío sigue en curso cuando llega el segundo Enter.
    profileData.overrides.changePassword = () => new Promise(() => {})
    const { user, security } = await setup(ROLES.TRIPULANTE)
    const { current, next, confirm } = await openPasswordPanel(user, security)

    await user.type(current, CORRECT_PASSWORD)
    await user.type(next, NEW_PASSWORD)
    await user.type(confirm, `${NEW_PASSWORD}{Enter}`)
    await within(security).findByRole("button", { name: "Actualizando…" })
    await user.keyboard("{Enter}")

    expect(passwordCalls()).toHaveLength(1)
  })
})

// Va al final: changePassword real pone lastPasswordChangeDays = 0 en los datos del módulo,
// que se comparten entre los tests de este archivo.
describe("Configuración: cambio de contraseña correcto (CS-16)", () => {
  it.each(PASSWORD_ROLES)(
    "CS-16: con un %s y «AirCrew2026!», aparece el toast, el panel se cierra, el foco vuelve a «Cambiar contraseña», la etiqueta dice «Último cambio: hoy» y changePassword recibe el id del store",
    async (role) => {
      const { user, main, security } = await setup(role)
      // Punto de partida: la etiqueta todavía no dice «hoy».
      expect(security).toHaveTextContent(
        new RegExp(`Último cambio: hace ${LAST_CHANGE_DAYS[role]} días`)
      )
      const { current, next, confirm, update } = await openPasswordPanel(
        user,
        security
      )

      await user.type(current, CORRECT_PASSWORD)
      await user.type(next, NEW_PASSWORD)
      await user.type(confirm, NEW_PASSWORD)
      await user.click(update)

      const toast = await findToast(PASSWORD_TOAST)
      expect(toastDescription(toast)).toBe(PASSWORD_TOAST_DETAIL)
      await waitFor(() =>
        expect(
          screen.queryByRole("group", { name: "Cambiar contraseña" })
        ).not.toBeInTheDocument()
      )
      // Se vuelve a buscar la sección: la invalidación del perfil puede remontarla.
      await waitFor(() =>
        expect(
          within(getSectionByHeading(main, SECURITY_HEADING)).getByRole(
            "button",
            { name: "Cambiar contraseña" }
          )
        ).toHaveFocus()
      )
      await waitFor(() =>
        expect(getSectionByHeading(main, SECURITY_HEADING)).toHaveTextContent(
          /Último cambio: hoy/
        )
      )
      expect(passwordCalls().map(({ args }) => args)).toEqual([
        [
          useAuthStore.getState().user?.id,
          { currentPassword: CORRECT_PASSWORD, newPassword: NEW_PASSWORD },
        ],
      ])
      expect(querySuccessToast()).toBeNull()
    }
  )
})
