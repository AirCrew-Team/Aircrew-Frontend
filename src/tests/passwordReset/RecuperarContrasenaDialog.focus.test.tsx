import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"

import { RESET_USER, mockForgotPassword } from "../mocks/passwordResetApi"
import { renderRoute } from "../utils/renderRoute"

// Spec cierre-pendientes, FE-1 (F3): foco inicial del Dialog propio
// (components/custom/Dialog.tsx). En el navegador, showModal() enfoca el primer
// elemento enfocable del <dialog> (la X «Cerrar ventana») y pisa el autoFocus de React,
// que se aplicó antes, con el <dialog> aún cerrado. Tras showModal(), el Dialog debe
// enfocar el elemento marcado con data-autofocus.
//
// La simulación global de setup.ts solo pone `open = true` y no mueve el foco: con ella
// el autoFocus de React gana y el test pasaría hoy en falso. Aquí se sustituye por una
// que sigue los pasos de foco del HTML: el descendiente con el atributo autofocus o, si
// no hay, el primero enfocable. React no escribe el atributo autofocus en el DOM.

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function nativeLikeShowModal(this: HTMLDialogElement) {
  this.open = true
  const target =
    this.querySelector<HTMLElement>("[autofocus]") ??
    this.querySelector<HTMLElement>(FOCUSABLE)
  target?.focus()
}

let showModalSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  showModalSpy = vi
    .spyOn(HTMLDialogElement.prototype, "showModal")
    .mockImplementation(nativeLikeShowModal)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  renderRoute(PATHS.login)
  await user.click(
    await screen.findByRole("button", { name: "¿Olvidaste tu contraseña?" })
  )
  return screen.findByRole("dialog", { name: "Recuperar contraseña" })
}

describe("FE1-F3: foco inicial del diálogo «Recuperar contraseña»", () => {
  it("FE1-F3: al abrir «Recuperar contraseña» desde el Login, el foco queda en «Correo electrónico» y no en «Cerrar ventana»", async () => {
    const user = userEvent.setup()

    const dialog = await openDialog(user)

    // Ancla: el diálogo se abrió con showModal (la simulación de arriba sí corrió).
    expect(showModalSpy).toHaveBeenCalled()
    const email = within(dialog).getByRole("textbox", {
      name: "Correo electrónico",
    })
    await waitFor(() => expect(email).toHaveFocus())
    expect(
      within(dialog).getByRole("button", { name: "Cerrar ventana" })
    ).not.toHaveFocus()
  })

  // Ancla en verde: el paso 2 aparece con el diálogo ya abierto (sin showModal), así que
  // el autoFocus de «Entendido» funciona hoy. Protege el cambio del paso 1.
  it("FE1-F3: tras enviar el enlace, el foco pasa a «Entendido» en «Revisa tu correo»", async () => {
    mockForgotPassword()
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    await user.type(
      within(dialog).getByRole("textbox", { name: "Correo electrónico" }),
      RESET_USER.email
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Enviar enlace" })
    )

    const done = await screen.findByRole(
      "button",
      { name: "Entendido" },
      { timeout: 2000 }
    )
    await waitFor(() => expect(done).toHaveFocus())
  })
})
