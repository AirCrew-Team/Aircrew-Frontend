import { act, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse } from "msw"
import { onTestFinished, describe, expect, it, vi } from "vitest"

import { apiError } from "../mocks/passwordResetApi"
import { REAL_ACCOUNTS, realProfile } from "../mocks/profileApi"
import { findToast, queryToast } from "../utils/toasts"
import {
  BLOCK,
  FIELD,
  findLoadedMain,
  getSectionByHeading,
  openRealSession,
  SAVE,
  SAVED_TOAST,
  SAVING,
  SWITCH,
  waitForCities,
} from "./profileTestUtils"

// Spec configuracion-real, CF-03: «Guardar cambios» envía PATCH /api/admin/users/me con
// { phone, residence, notifications } (las del rol; el admin, sin notifications desde la
// Ampliación B) y muestra el toast «Cambios guardados.». Validación en el campo (aria-invalid) y error del servidor en un
// role="alert" dentro del formulario.

vi.setConfig({ testTimeout: 20_000 })

const setup = async (
  key: "crew" | "supervisor" | "admin",
  options?: Parameters<typeof openRealSession>[1]
) => {
  const user = userEvent.setup()
  const session = openRealSession(key, options)
  const main = await findLoadedMain(REAL_ACCOUNTS[key].email)
  const contact = getSectionByHeading(main, BLOCK.contact)
  const saveButton = within(main).getByRole("button", { name: SAVE })
  const residence = within(contact).getByLabelText(FIELD.residence)
  // A2: la ciudad se valida contra el catálogo; se espera a que esté cargado.
  await waitForCities(residence)
  return {
    ...session,
    user,
    main,
    contact,
    saveButton,
    phone: within(contact).getByLabelText(FIELD.phone),
    residence,
  }
}

// Compuerta: el PATCH espera a que el test lo libere y responde un perfil completo.
const gatedPatch = () => {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  onTestFinished(() => release())
  const calls = { count: 0 }
  return {
    calls,
    release: () => release(),
    respond: async () => {
      calls.count += 1
      await gate
      return HttpResponse.json(realProfile("supervisor"))
    },
  }
}

describe("CF-03: guardar contacto y notificaciones", () => {
  it("CF-03: el tripulante envía PATCH con el celular sin espacios, la residencia y { replacement_assigned }, y aparece «Cambios guardados.»", async () => {
    const { user, backend, main, phone, residence, saveButton } =
      await setup("crew")
    const notifications = getSectionByHeading(main, BLOCK.notifications)

    await user.clear(phone)
    await user.type(phone, "+57 311 555 0000")
    await user.clear(residence)
    await user.type(residence, "Detroit, MI")
    await user.click(
      within(notifications).getByRole("switch", { name: SWITCH.replacement })
    )
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    expect(backend.bodies.patch).toEqual([
      {
        phone: "+573115550000",
        residence: "Detroit, MI",
        notifications: { replacement_assigned: true },
      },
    ])
  })

  it("CF-03: el supervisor envía PATCH con { absence_reported, absence_covered } y aparece «Cambios guardados.»", async () => {
    const { user, backend, main, phone, residence, saveButton } =
      await setup("supervisor")
    const notifications = getSectionByHeading(main, BLOCK.notifications)

    await user.clear(phone)
    await user.type(phone, "3001112233")
    await user.clear(residence)
    await user.type(residence, "Seattle, WA")
    // Parte de absence_reported: true y absence_covered: false.
    await user.click(
      within(notifications).getByRole("switch", { name: SWITCH.reported })
    )
    await user.click(
      within(notifications).getByRole("switch", { name: SWITCH.covered })
    )
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    expect(backend.bodies.patch).toEqual([
      {
        phone: "3001112233",
        residence: "Seattle, WA",
        notifications: { absence_reported: false, absence_covered: true },
      },
    ])
  })

  // Ampliación B (CF-13): el backend responde 400 si un super_admin envía notifications.
  it("CF-13: el admin envía PATCH solo con { phone, residence }, sin notifications, y aparece «Cambios guardados.»", async () => {
    const { user, backend, phone, residence, saveButton } = await setup("admin")

    await user.clear(phone)
    await user.type(phone, "3001112233")
    await user.clear(residence)
    await user.type(residence, "Seattle, WA")
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    expect(backend.bodies.patch).toEqual([
      { phone: "3001112233", residence: "Seattle, WA" },
    ])
  })

  it("CF-03: mientras guarda, el botón dice «Guardando…»", async () => {
    const pending = gatedPatch()
    const { user, main, saveButton } = await setup("supervisor", {
      options: { respond: { patch: pending.respond } },
    })

    await user.click(saveButton)

    expect(
      await within(main).findByRole("button", { name: SAVING })
    ).toBeInTheDocument()
    expect(queryToast(SAVED_TOAST)).toBeNull()
    // Se libera dentro del test: el toast no pasa al test siguiente.
    pending.release()
    await findToast(SAVED_TOAST)
  })

  it('CF-03: con doble clic, el botón dice «Guardando…» con aria-disabled="true" (sin disabled, conserva el foco) y solo hay un PATCH', async () => {
    const pending = gatedPatch()
    const { user, main, backend, residence, saveButton } = await setup(
      "supervisor",
      { options: { respond: { patch: pending.respond } } }
    )

    await user.dblClick(saveButton)

    const saving = await within(main).findByRole("button", { name: SAVING })
    expect(saving).toHaveAttribute("aria-disabled", "true")
    expect(saving).not.toHaveAttribute("disabled")
    expect(saving).toHaveFocus()
    // Enter en un campo tampoco repite el envío.
    await user.type(residence, "{Enter}")
    await user.click(saving)
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
    expect(backend.bodies.patch).toHaveLength(1)

    pending.release()
    await findToast(SAVED_TOAST)
    await waitFor(() =>
      expect(
        within(main).getByRole("button", { name: SAVE })
      ).not.toHaveAttribute("aria-disabled")
    )
  })

  it("CF-03: el toast «Cambios guardados.» sale aunque el usuario haya salido de Configuración", async () => {
    const pending = gatedPatch()
    const { user, router, saveButton } = await setup("crew", {
      options: { respond: { patch: pending.respond } },
    })

    await user.click(saveButton)
    await waitFor(() => expect(pending.calls.count).toBe(1))
    await act(() => router.navigate("/ruta-que-no-existe"))

    pending.release()
    await findToast(SAVED_TOAST)
  })

  it("CF-03: tras guardar, el formulario queda con los valores normalizados que devolvió el backend", async () => {
    const { user, phone, saveButton } = await setup("crew")

    await user.clear(phone)
    await user.type(phone, "+57 311 555 0000")
    await user.click(saveButton)

    await findToast(SAVED_TOAST)
    await waitFor(() => expect(phone).toHaveValue("+573115550000"))
  })

  it("CF-03: un celular con letras marca el campo con aria-invalid y su mensaje, y no envía nada", async () => {
    const { user, backend, phone, saveButton } = await setup("crew")

    await user.clear(phone)
    await user.type(phone, "31a-55")
    await user.click(saveButton)

    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"))
    // Supuesto: el mensaje de error (texto libre) describe al campo.
    expect(phone).toHaveAccessibleDescription()
    expect(backend.bodies.patch).toEqual([])
    expect(queryToast(SAVED_TOAST)).toBeNull()
  })

  it("CF-03: un celular de menos de 7 dígitos también es inválido", async () => {
    const { user, backend, phone, saveButton } = await setup("admin")

    await user.clear(phone)
    await user.type(phone, "+57 12")
    await user.click(saveButton)

    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"))
    expect(backend.bodies.patch).toEqual([])
  })

  it('CF-03: si el servidor responde 500, aparece un role="alert" dentro del formulario y no el toast', async () => {
    const { user, backend, main, residence, saveButton } = await setup(
      "supervisor",
      { options: { respond: { patch: apiError(500, "Error interno") } } }
    )

    await user.clear(residence)
    await user.type(residence, "Seattle, WA")
    await user.click(saveButton)

    // Supuesto: «Guardar cambios» va dentro del <form> del perfil.
    const form = saveButton.closest("form") ?? main
    expect(await within(form).findByRole("alert")).toBeInTheDocument()
    expect(backend.bodies.patch).toHaveLength(1)
    expect(queryToast(SAVED_TOAST)).toBeNull()
  })
})
