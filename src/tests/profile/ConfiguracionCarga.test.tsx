import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { focusManager } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { describe, expect, it, onTestFinished, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { createGate } from "../mocks/passwordResetApi"
import {
  PROFILE_URLS,
  REAL_ACCOUNTS,
  REAL_USERS,
  realProfile,
  SUPERVISOR_EMPLOYMENT,
} from "../mocks/profileApi"
import { AUTH_URLS } from "../mocks/authApi"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"
import {
  BLOCK,
  DEMO_NOTICE,
  FIELD,
  findLoadedMain,
  getSectionByHeading,
  openRealSession,
  querySectionByHeading,
  readableText,
  SAVE,
  SAVED_TOAST,
  waitForCities,
} from "./profileTestUtils"

// Revisión de configuracion-real: estados de carga y error de GET /api/admin/users/me,
// recargas que fallan con los datos ya en pantalla, sesión vencida y cambio de usuario
// con «Rol (dev)» sin salir de la pantalla.

vi.setConfig({ testTimeout: 20_000 })

const LOADING = "Cargando tu perfil…"
const LOAD_ERROR = "No se pudo cargar tu perfil. Intenta de nuevo."
const EXPIRED_TEXT = "Tu sesión venció. Inicia sesión de nuevo."

// GET /users/me que responde con `status` y cuenta las veces que se pidió.
const failingMe = (status: number) => {
  const calls = { count: 0 }
  const handler = http.get(PROFILE_URLS.me, () => {
    calls.count += 1
    return HttpResponse.json({ error: "Error" }, { status })
  })
  return { calls, handler }
}

describe("CF-R: carga de GET /users/me", () => {
  it('CF-R1: mientras llega el perfil se ve «Cargando tu perfil…» con role="status"', async () => {
    const { gate, release } = createGate()
    onTestFinished(() => release())
    openRealSession("supervisor", {
      first: [
        http.get(PROFILE_URLS.me, async () => {
          await gate
          return HttpResponse.json(realProfile("supervisor"))
        }),
      ],
    })

    const main = await screen.findByRole("main")
    const status = await within(main).findByRole("status")
    expect(status).toHaveTextContent(LOADING)
    expect(within(main).queryByLabelText(FIELD.phone)).toBeNull()

    // Se libera dentro del test: la pantalla termina de cargar antes de desmontarse.
    release()
    await findLoadedMain(REAL_ACCOUNTS.supervisor.email)
  })

  it('CF-R2: si GET /users/me responde 500, aparece role="alert" con «No se pudo cargar tu perfil. Intenta de nuevo.» y no hay formulario', async () => {
    const { handler } = failingMe(500)
    openRealSession("admin", { first: [handler] })

    const main = await screen.findByRole("main")
    const alert = await within(main).findByRole("alert")
    expect(alert).toHaveTextContent(LOAD_ERROR)
    expect(within(main).queryByRole("button", { name: SAVE })).toBeNull()
    expect(within(main).queryByLabelText(FIELD.phone)).toBeNull()
    expect(within(main).queryByRole("textbox")).toBeNull()
  })

  it("CF-R3: un 401 de GET /api/admin/users/me cierra la sesión con el aviso de sesión vencida", async () => {
    const { handler } = failingMe(401)
    openRealSession("crew", { first: [handler] })

    const toast = await findToast(EXPIRED_TEXT)
    expect(toast).toHaveAttribute("data-type", "error")
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe("CF-R: una recarga que falla no borra la pantalla", () => {
  it("CF-R4: tras guardar, si el GET siguiente responde 500, el formulario sigue con lo escrito y sin el error de carga", async () => {
    const user = userEvent.setup()
    openRealSession("supervisor")
    const main = await findLoadedMain(REAL_ACCOUNTS.supervisor.email)
    const contact = getSectionByHeading(main, BLOCK.contact)
    const residence = within(contact).getByLabelText(FIELD.residence)
    const failing = failingMe(500)
    server.use(failing.handler)

    await waitForCities(residence)
    await user.clear(residence)
    await user.type(residence, "Seattle, WA")
    await user.click(within(main).getByRole("button", { name: SAVE }))
    await findToast(SAVED_TOAST)
    // La recarga tras invalidar llega al GET que falla.
    await waitFor(() => expect(failing.calls.count).toBeGreaterThan(0))
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))

    expect(within(main).queryByText(LOAD_ERROR)).toBeNull()
    const field = within(main).getByLabelText(FIELD.residence)
    expect(field).toHaveValue("Seattle, WA")
    // Se puede seguir escribiendo.
    await user.type(field, "!")
    expect(field).toHaveValue("Seattle, WA!")
  })

  it("CF-R5: si crew-members/me falla al recargar, «Información laboral» sigue con sus datos", async () => {
    onTestFinished(() => focusManager.setFocused(undefined))
    openRealSession("crew")
    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const employment = getSectionByHeading(main, BLOCK.employment)
    await waitFor(() => expect(readableText(employment)).toMatch(/EMP-100/))
    const calls = { count: 0 }
    server.use(
      http.get(AUTH_URLS.crewProfile, () => {
        calls.count += 1
        return HttpResponse.json({ error: "Error" }, { status: 500 })
      })
    )

    // Volver a la pestaña recarga las consultas activas (refetchOnWindowFocus).
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(calls.count).toBeGreaterThan(0))
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))

    const after = getSectionByHeading(main, BLOCK.employment)
    expect(readableText(after)).toMatch(/EMP-100/)
    expect(within(after).queryByRole("alert")).toBeNull()
  })
})

describe("CF-R: «Rol (dev)» cambia de usuario dentro de Configuración", () => {
  it("CF-R6: al pasar a una cuenta demo con setMockRole, la pantalla muestra la demo y nada del tripulante real", async () => {
    openRealSession("crew")
    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    await waitFor(() =>
      expect(readableText(getSectionByHeading(main, BLOCK.employment))).toMatch(
        /EMP-100/
      )
    )

    act(() => useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR))

    const demoMain = await screen.findByRole("main")
    await waitFor(() => expect(demoMain).toHaveTextContent(DEMO_NOTICE))
    const fullName = useAuthStore.getState().user?.fullName ?? ""
    expect(within(demoMain).getByText(fullName)).toBeInTheDocument()
    expect(within(demoMain).getByLabelText(FIELD.email)).toHaveValue("")
    expect(within(demoMain).getByLabelText(FIELD.phone)).toHaveValue("")
    expect(demoMain.textContent).not.toContain(REAL_ACCOUNTS.crew.name)
    expect(querySectionByHeading(demoMain, BLOCK.employment) ?? null).toBeNull()
  })

  it("CF-R7: al pasar a otro usuario real con setUser, la pantalla carga sus datos y no los del anterior", async () => {
    openRealSession("crew")
    const main = await findLoadedMain(REAL_ACCOUNTS.crew.email)
    const supervisor = realProfile("supervisor")

    act(() => {
      server.use(http.get(PROFILE_URLS.me, () => HttpResponse.json(supervisor)))
      useAuthStore.getState().setUser(REAL_USERS.supervisor)
    })

    const field = await within(main).findByLabelText(FIELD.email)
    await waitFor(() =>
      expect(within(main).getByLabelText(FIELD.email)).toHaveValue(
        REAL_ACCOUNTS.supervisor.email
      )
    )
    expect(field).toBeInTheDocument()
    expect(within(main).getByLabelText(FIELD.residence)).toHaveValue(
      supervisor.residence
    )
    expect(main.textContent).toContain(REAL_ACCOUNTS.supervisor.name)
    expect(main.textContent).not.toContain(REAL_ACCOUNTS.crew.name)
    // Ampliación A (CF-09): el supervisor tiene su propia «Información laboral», con los
    // datos de su cuenta y no los de crew del tripulante anterior.
    const employment = getSectionByHeading(main, BLOCK.employment)
    await waitFor(() =>
      expect(readableText(employment)).toMatch(
        SUPERVISOR_EMPLOYMENT.employee_code ?? ""
      )
    )
    expect(readableText(employment)).not.toMatch(/EMP-100/)
  })
})
