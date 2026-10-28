import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { ROLES, type Role } from "@/App/types/auth.types"

import {
  CONFIGURACION_PATH,
  FIELD,
  findLoadedMain,
  findSuccessStatus,
  querySuccessStatus,
  renderConfiguracion,
  SUCCESS_DETAIL,
  SUCCESS_TITLE,
  SWITCH,
} from "./profileTestUtils"

// Formulario visual (react-hook-form + zod) con los datos simulados reales de profile.data.ts.

const INITIAL = {
  phone: "+57 310 445 8899",
  email: "jp.navarro@aircrew-ops.com",
  zone: "Zona Fontibón - Salitre, Bogotá",
}

const PHONE_HELP =
  "Línea directa registrada para activación de tripulación de reserva."

const ERROR = {
  phoneRequired: "Ingresa el celular de emergencias.",
  phoneFormat:
    "Formato no válido. Usa solo números, espacios y un + inicial, por ejemplo +57 300 000 0000.",
  zoneRequired: "Ingresa la zona de residencia.",
}

const COMING_SOON_BUTTONS = [
  "Actualizar Foto, próximamente",
  "Cambiar Contraseña, próximamente",
  "Configurar YubiKey, próximamente",
]

const setup = async (role: Role = ROLES.TRIPULANTE) => {
  const user = userEvent.setup()
  const router = renderConfiguracion(role)
  const main = await findLoadedMain(role)
  const form = within(main)
  return {
    user,
    router,
    main,
    phone: form.getByRole("textbox", { name: FIELD.phone }),
    email: form.getByRole("textbox", { name: FIELD.email }),
    zone: form.getByRole("textbox", { name: FIELD.zone }),
    save: form.getByRole("button", { name: "Guardar Cambios" }),
    cancel: form.getByRole("button", { name: "Cancelar" }),
  }
}

const replaceValue = async (
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  value: string
) => {
  await user.clear(field)
  if (value) await user.type(field, value)
}

describe("Configuración: campos de contacto", () => {
  it.each(Object.values(ROLES))(
    "CP-15: con un %s, los tres campos se encuentran por su label; el correo es readOnly y celular y zona tienen aria-required",
    async (role) => {
      const { phone, email, zone } = await setup(role)

      expect(email).toHaveAttribute("readonly")
      expect(phone).toHaveAttribute("aria-required", "true")
      expect(zone).toHaveAttribute("aria-required", "true")
      expect(phone).not.toHaveAttribute("readonly")
      expect(zone).not.toHaveAttribute("readonly")
      expect(phone).not.toHaveValue("")
      expect(email).not.toHaveValue("")
      expect(zone).not.toHaveValue("")
    }
  )

  it("CP-15: los valores iniciales del tripulante son los simulados de la referencia", async () => {
    const { phone, email, zone } = await setup()

    expect(phone).toHaveValue(INITIAL.phone)
    expect(email).toHaveValue(INITIAL.email)
    expect(zone).toHaveValue(INITIAL.zone)
  })
})

describe("Configuración: validación al guardar", () => {
  it.each(Object.values(ROLES))(
    "CP-16: con un %s, el celular vacío muestra «Ingresa el celular de emergencias.», marca aria-invalid, enlaza el mensaje, enfoca el campo y no guarda",
    async (role) => {
      const { user, phone, save } = await setup(role)

      await user.clear(phone)
      await user.click(save)

      expect(await screen.findByText(ERROR.phoneRequired)).toBeInTheDocument()
      expect(phone).toHaveAttribute("aria-invalid", "true")
      expect(phone).toHaveAccessibleDescription(
        expect.stringContaining(ERROR.phoneRequired)
      )
      await waitFor(() => expect(phone).toHaveFocus())
      expect(querySuccessStatus()).toBeNull()
    }
  )

  it("CP-16: en el tripulante, el aria-describedby del celular con error incluye el mensaje y el texto de ayuda", async () => {
    const { user, phone, save } = await setup()

    expect(phone).toHaveAccessibleDescription(
      expect.stringContaining(PHONE_HELP)
    )

    await user.clear(phone)
    await user.click(save)

    await screen.findByText(ERROR.phoneRequired)
    expect(phone).toHaveAccessibleDescription(
      expect.stringContaining(ERROR.phoneRequired)
    )
    expect(phone).toHaveAccessibleDescription(
      expect.stringContaining(PHONE_HELP)
    )
  })

  it("CP-16: un celular con solo espacios cuenta como vacío (se recortan los extremos)", async () => {
    const { user, phone, save } = await setup()

    await replaceValue(user, phone, "   ")
    await user.click(save)

    expect(await screen.findByText(ERROR.phoneRequired)).toBeInTheDocument()
    expect(phone).toHaveAttribute("aria-invalid", "true")
    expect(querySuccessStatus()).toBeNull()
  })

  it("CP-17: el celular «abc» muestra el mensaje de formato no válido", async () => {
    const { user, phone, save } = await setup()

    await replaceValue(user, phone, "abc")
    await user.click(save)

    expect(await screen.findByText(ERROR.phoneFormat)).toBeInTheDocument()
    expect(phone).toHaveAttribute("aria-invalid", "true")
    await waitFor(() => expect(phone).toHaveFocus())
    expect(querySuccessStatus()).toBeNull()
  })

  it("CP-17: el celular «+57 300 000 0000» es válido y se guarda", async () => {
    const { user, phone, save } = await setup()

    await replaceValue(user, phone, "+57 300 000 0000")
    await user.click(save)

    await findSuccessStatus()
    expect(screen.queryByText(ERROR.phoneFormat)).not.toBeInTheDocument()
    expect(screen.queryByText(ERROR.phoneRequired)).not.toBeInTheDocument()
    expect(phone).not.toHaveAttribute("aria-invalid", "true")
    expect(phone).toHaveValue("+57 300 000 0000")
  })

  it("CP-18: con celular y zona vacíos, se muestran los dos mensajes y el foco va al celular", async () => {
    const { user, phone, zone, save } = await setup()

    await user.clear(phone)
    await user.clear(zone)
    await user.click(save)

    expect(await screen.findByText(ERROR.phoneRequired)).toBeInTheDocument()
    expect(screen.getByText(ERROR.zoneRequired)).toBeInTheDocument()
    expect(phone).toHaveAttribute("aria-invalid", "true")
    expect(zone).toHaveAttribute("aria-invalid", "true")
    expect(zone).toHaveAccessibleDescription(
      expect.stringContaining(ERROR.zoneRequired)
    )
    await waitFor(() => expect(phone).toHaveFocus())
    expect(querySuccessStatus()).toBeNull()
  })
})

describe("Configuración: guardar y cancelar", () => {
  it("CP-19: al guardar campos válidos aparece el role=status de confirmación y los valores editados se mantienen", async () => {
    const { user, phone, zone, save } = await setup()

    await replaceValue(user, phone, "+57 300 123 4567")
    await replaceValue(user, zone, "Zona Chapinero, Bogotá")
    expect(querySuccessStatus()).toBeNull()
    await user.click(save)

    const status = await findSuccessStatus()
    expect(status).toHaveTextContent(SUCCESS_TITLE)
    expect(status).toHaveTextContent(SUCCESS_DETAIL)
    expect(phone).toHaveValue("+57 300 123 4567")
    expect(zone).toHaveValue("Zona Chapinero, Bogotá")
  })

  it("CP-19: al volver a editar después de guardar, la confirmación desaparece", async () => {
    const { user, zone, save } = await setup()

    await replaceValue(user, zone, "Zona Chapinero, Bogotá")
    await user.click(save)
    await findSuccessStatus()

    await user.type(zone, " Norte")

    await waitFor(() => expect(querySuccessStatus()).toBeNull())
  })

  it("CP-19: guardar no navega: la ruta sigue siendo /configuracion", async () => {
    const { user, router, save } = await setup()

    await user.click(save)

    await findSuccessStatus()
    expect(router.state.location.pathname).toBe(CONFIGURACION_PATH)
  })

  it("CP-20: «Cancelar» sin haber guardado devuelve los campos a los valores iniciales", async () => {
    const { user, phone, zone, cancel } = await setup()

    await replaceValue(user, phone, "+57 300 123 4567")
    await replaceValue(user, zone, "Zona Chapinero, Bogotá")
    await user.click(cancel)

    await waitFor(() => expect(phone).toHaveValue(INITIAL.phone))
    expect(zone).toHaveValue(INITIAL.zone)
  })

  it("CP-20: «Cancelar» después de guardar devuelve los campos a lo último guardado", async () => {
    const { user, phone, zone, save, cancel } = await setup()

    await replaceValue(user, phone, "+57 300 123 4567")
    await replaceValue(user, zone, "Zona Chapinero, Bogotá")
    await user.click(save)
    await findSuccessStatus()

    await replaceValue(user, phone, "+57 311 999 0000")
    await replaceValue(user, zone, "Zona Suba, Bogotá")
    await user.click(cancel)

    await waitFor(() => expect(phone).toHaveValue("+57 300 123 4567"))
    expect(zone).toHaveValue("Zona Chapinero, Bogotá")
  })

  it("CP-20: «Cancelar» quita los mensajes de error y aria-invalid", async () => {
    const { user, phone, zone, save, cancel } = await setup()

    await user.clear(phone)
    await user.clear(zone)
    await user.click(save)
    await screen.findByText(ERROR.phoneRequired)

    await user.click(cancel)

    await waitFor(() =>
      expect(screen.queryByText(ERROR.phoneRequired)).not.toBeInTheDocument()
    )
    expect(screen.queryByText(ERROR.zoneRequired)).not.toBeInTheDocument()
    expect(phone).not.toHaveAttribute("aria-invalid", "true")
    expect(zone).not.toHaveAttribute("aria-invalid", "true")
    expect(phone).toHaveValue(INITIAL.phone)
    expect(zone).toHaveValue(INITIAL.zone)
  })

  it("CP-20: «Cancelar» oculta la confirmación de guardado y mantiene lo guardado", async () => {
    const { user, zone, save, cancel } = await setup()

    await replaceValue(user, zone, "Zona Chapinero, Bogotá")
    await user.click(save)
    await findSuccessStatus()

    await user.click(cancel)

    await waitFor(() => expect(querySuccessStatus()).toBeNull())
    expect(zone).toHaveValue("Zona Chapinero, Bogotá")
  })
})

describe("Configuración: interruptores de notificaciones (tripulante)", () => {
  it("CP-21: los tres interruptores son role=switch con su título como nombre y empiezan activados", async () => {
    const { main } = await setup()

    for (const name of Object.values(SWITCH)) {
      expect(
        within(main).getByRole("switch", { name }),
        `interruptor «${name}»`
      ).toBeChecked()
    }
  })

  it("CP-21: al pulsar un interruptor cambia su estado", async () => {
    const { user, main } = await setup()

    for (const name of Object.values(SWITCH)) {
      const toggle = within(main).getByRole("switch", { name })
      await user.click(toggle)
      expect(toggle, `interruptor «${name}»`).not.toBeChecked()
      await user.click(toggle)
      expect(toggle, `interruptor «${name}»`).toBeChecked()
    }
  })

  it("CP-21: «Cancelar» sin guardar devuelve los interruptores al estado inicial", async () => {
    const { user, main, cancel } = await setup()
    const urgent = within(main).getByRole("switch", { name: SWITCH.urgent })
    const gates = within(main).getByRole("switch", { name: SWITCH.gates })

    await user.click(urgent)
    await user.click(gates)
    await user.click(cancel)

    await waitFor(() => expect(urgent).toBeChecked())
    expect(gates).toBeChecked()
  })

  it("CP-21: los interruptores se guardan con «Guardar Cambios» y «Cancelar» vuelve a lo guardado", async () => {
    const { user, main, save, cancel } = await setup()
    const urgent = within(main).getByRole("switch", { name: SWITCH.urgent })
    const gates = within(main).getByRole("switch", { name: SWITCH.gates })

    await user.click(urgent)
    await user.click(save)
    await findSuccessStatus()
    expect(urgent).not.toBeChecked()

    await user.click(gates)
    await waitFor(() => expect(querySuccessStatus()).toBeNull())
    await user.click(cancel)

    await waitFor(() => expect(gates).toBeChecked())
    expect(urgent).not.toBeChecked()
  })
})

describe("Configuración: botones «Próximamente»", () => {
  it.each(Object.values(ROLES))(
    "CP-22: con un %s, los tres botones tienen aria-disabled, type=button, el texto «Próximamente» y un nombre que termina en «, próximamente»",
    async (role) => {
      const { main } = await setup(role)

      for (const name of COMING_SOON_BUTTONS) {
        const button = within(main).getByRole("button", { name })
        expect(button, name).toHaveAttribute("aria-disabled", "true")
        expect(button, name).toHaveAttribute("type", "button")
        expect(button, name).toHaveTextContent(/Próximamente/i)
        expect(button, name).not.toBeDisabled()
      }
    }
  )

  it("CP-22: pulsarlos con el ratón o el teclado no navega, no envía el formulario ni muestra la confirmación", async () => {
    const { user, router, main, phone } = await setup()

    // Con un celular vacío, un envío accidental mostraría el error de validación.
    await user.clear(phone)

    for (const name of COMING_SOON_BUTTONS) {
      const button = within(main).getByRole("button", { name })
      await user.click(button)
      button.focus()
      await user.keyboard("{Enter}")
      await user.keyboard(" ")
    }

    expect(router.state.location.pathname).toBe(CONFIGURACION_PATH)
    expect(querySuccessStatus()).toBeNull()
    expect(screen.queryByText(ERROR.phoneRequired)).not.toBeInTheDocument()
    expect(phone).not.toHaveAttribute("aria-invalid", "true")
  })

  it("CP-22: con el formulario válido, pulsarlos no muestra la confirmación de guardado", async () => {
    const { user, main } = await setup()

    for (const name of COMING_SOON_BUTTONS) {
      await user.click(within(main).getByRole("button", { name }))
    }

    expect(querySuccessStatus()).toBeNull()
  })

  it("CP-22: los tres botones siguen siendo alcanzables con el tabulador", async () => {
    const { user, main } = await setup()
    const targets = COMING_SOON_BUTTONS.map((name) =>
      within(main).getByRole("button", { name })
    )
    const reached = new Set<Element>()

    for (let i = 0; i < 80 && reached.size < targets.length; i++) {
      await user.tab()
      const active = document.activeElement
      if (active && targets.includes(active as HTMLElement)) reached.add(active)
    }

    for (const target of targets) {
      expect(reached.has(target), target.getAttribute("aria-label") ?? "").toBe(
        true
      )
    }
  })
})
