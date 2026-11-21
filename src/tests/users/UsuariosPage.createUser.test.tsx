import { screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Formulario «Añadir usuario» (Delta Air Lines, datos de EE. UU.) con la cuenta demo:
// apertura, campos según el rol, validaciones, celular por país, alta, refresco de la
// tabla y errores. Va en su propio archivo porque el alta simulada guarda el usuario en
// memoria y cambiaría los conteos de los otros tests. La sesión real (backend) se prueba
// en UsuariosPage.real.test.tsx.

// Estos tests llenan el formulario campo por campo con userEvent: con la máquina cargada
// (suite completa en paralelo) pueden pasar de los 5 s por defecto. Más margen, solo aquí.
vi.setConfig({ testTimeout: 20_000 })

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type DataFn = (...args: unknown[]) => unknown

const usersData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/users/data/users.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      // Las clases (UserFieldError) se dejan tal cual: el formulario usa instanceof.
      if (typeof value !== "function" || name === "UserFieldError") {
        return [name, value]
      }
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          usersData.calls.push({ name, args })
          return (usersData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

afterEach(() => {
  usersData.calls.length = 0
  usersData.overrides = {}
})

const lastCreateInput = () =>
  usersData.calls.filter((call) => call.name === "createUser").at(-1)?.args[0]

// Alta simulada que no guarda nada: para los tests que solo revisan lo que se envía.
const createWithoutSaving = () => {
  usersData.overrides.createUser = (input) =>
    Promise.resolve({
      ...(input as object),
      id: "demo-0000",
      code: null,
      status: "disponible",
      shift: null,
      base: null,
      pendingActivation: true,
      isActive: true,
    })
}

const openForm = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superAdmin.usuarios)
  await screen.findByRole("table")
  const trigger = screen.getByRole("button", { name: "Añadir usuario" })
  await user.click(trigger)
  const dialog = await screen.findByRole("dialog", { name: "Añadir usuario" })
  await within(dialog).findByRole("button", { name: "Crear usuario" })
  return { user, trigger, dialog }
}

// Selector de país del celular (react-phone-number-input).
const countrySelect = (dialog: HTMLElement) =>
  within(dialog).getByRole("combobox", { name: "País del celular" })

const submit = (user: UserEvent, dialog: HTMLElement) =>
  user.click(within(dialog).getByRole("button", { name: "Crear usuario" }))

// Datos personales válidos (celular de EE. UU., el indicativo por defecto).
const fillPersonalData = async (
  user: UserEvent,
  dialog: HTMLElement,
  email = "laura.gomez@aircrew-ops.com"
) => {
  const form = within(dialog)
  await user.type(form.getByLabelText(/^Nombres/), "Laura")
  await user.type(form.getByLabelText(/^Apellidos/), "Gómez")
  await user.type(form.getByLabelText(/^Correo/), email)
  await user.type(form.getByLabelText(/^Celular/), "404 555 0123")
}

// Formulario completo y válido para una Comandante con base en Atlanta.
const fillValidCrewForm = async (
  user: UserEvent,
  dialog: HTMLElement,
  email?: string
) => {
  const form = within(dialog)
  await fillPersonalData(user, dialog, email)
  await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")
  await user.selectOptions(form.getByLabelText(/^Cargo/), "Comandante")
  await user.selectOptions(form.getByLabelText(/^Base/), "ATL")
}

const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent)

describe("Añadir usuario: formulario", () => {
  it("abre con datos personales y operativos, EE. UU. por defecto y «Alta de usuarios»", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    expect(
      form.getByText("Alta de usuarios · Flight Ops Central")
    ).toBeInTheDocument()
    for (const legend of ["Datos personales", "Datos operativos"]) {
      expect(form.getByRole("group", { name: legend })).toBeInTheDocument()
    }
    // Cargo, base y turno dependen del rol: sin rol todavía no aparecen.
    for (const label of [/^Cargo/, /^Base/, /^Turno/]) {
      expect(form.queryByLabelText(label)).not.toBeInTheDocument()
    }
    // Ni licencia ni certificados (van en la pantalla de certificados), ni contraseña,
    // ni código de empleado (lo asigna el backend).
    expect(
      form.queryByRole("group", { name: "Licencia" })
    ).not.toBeInTheDocument()
    expect(form.queryByLabelText(/contraseña/i)).not.toBeInTheDocument()
    expect(form.queryByLabelText(/código/i)).not.toBeInTheDocument()

    // Celular: selector de país de react-phone-number-input, EE. UU. por defecto y
    // primero de la lista, con los nombres en español.
    const country = countrySelect(dialog)
    expect(country).toHaveValue("US")
    expect(within(country).getAllByRole("option")[0]).toHaveTextContent(
      "Estados Unidos"
    )
    expect(
      within(country).getByRole("option", { name: "España" })
    ).toBeInTheDocument()

    // Bases: las del catálogo (hubs de Delta).
    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")
    const bases = within(form.getByLabelText(/^Base/))
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"))
    expect(bases).toEqual([
      "",
      "ATL",
      "BOS",
      "DTW",
      "LAX",
      "MSP",
      "JFK",
      "LGA",
      "SLC",
      "SEA",
    ])
    // El botón de crear es solo texto.
    expect(
      form.getByRole("button", { name: "Crear usuario" }).querySelector("svg")
    ).toBeNull()
  })

  it("el rol tiene Tripulación, Supervisor y Administrador", async () => {
    const { dialog } = await openForm()

    expect(optionTexts(within(dialog).getByLabelText(/^Rol/))).toEqual([
      "Selecciona…",
      "Tripulación",
      "Supervisor",
      "Administrador",
    ])
  })

  it("Tripulación muestra el cargo (5 opciones del catálogo) y la base, sin turno", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")

    expect(optionTexts(form.getByLabelText(/^Cargo/))).toEqual([
      "Selecciona…",
      "Comandante",
      "Copiloto",
      "Auxiliar de Vuelo",
      "Sobrecargo Principal",
      "Sobrecargo",
    ])
    expect(form.getByLabelText(/^Base/)).toBeInTheDocument()
    expect(form.queryByLabelText(/^Turno/)).not.toBeInTheDocument()
  })

  it("Supervisor muestra la base y el turno (Turno 1 a 3), sin cargo", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")

    expect(form.queryByLabelText(/^Cargo/)).not.toBeInTheDocument()
    expect(form.getByLabelText(/^Base/)).toBeInTheDocument()
    const shift = form.getByLabelText(/^Turno/)
    expect(shift).toHaveAttribute("aria-required", "true")
    expect(optionTexts(shift)).toEqual([
      "Selecciona…",
      "Turno 1",
      "Turno 2",
      "Turno 3",
    ])
  })

  it("Administrador solo pide nombre, correo y celular", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Rol/), "administrador")

    for (const label of [/^Cargo/, /^Base/, /^Turno/]) {
      expect(form.queryByLabelText(label)).not.toBeInTheDocument()
    }
  })

  it("al dejar de ser Supervisor, el turno se oculta y se borra lo elegido", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
    await user.selectOptions(form.getByLabelText(/^Turno/), "turno_3")
    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")

    expect(form.queryByLabelText(/^Turno/)).not.toBeInTheDocument()
    // Al volver a Supervisor, el turno empieza vacío.
    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
    expect(form.getByLabelText(/^Turno/)).toHaveValue("")
  })

  it("enviar vacío marca los obligatorios, enfoca el primero y no crea nada", async () => {
    const { user, dialog } = await openForm()

    await submit(user, dialog)

    const firstName = within(dialog).getByLabelText(/^Nombres/)
    await waitFor(() => expect(firstName).toHaveFocus())
    expect(firstName).toHaveAttribute("aria-invalid", "true")
    expect(firstName).toHaveAccessibleDescription("Ingresa los nombres.")
    for (const message of [
      "Ingresa los apellidos.",
      "Ingresa el correo.",
      "Ingresa el celular de contacto.",
      "Selecciona el rol.",
    ]) {
      expect(within(dialog).getByText(message)).toBeInTheDocument()
    }
    expect(usersData.calls.some((call) => call.name === "createUser")).toBe(
      false
    )
  })

  it("con Tripulación, el cargo y la base son obligatorios", async () => {
    const { user, dialog } = await openForm()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "tripulacion"
    )
    await submit(user, dialog)

    for (const message of ["Selecciona el cargo.", "Selecciona la base."]) {
      expect(await within(dialog).findByText(message)).toBeInTheDocument()
    }
  })

  it("con Supervisor, la base y el turno son obligatorios", async () => {
    const { user, dialog } = await openForm()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "supervisor"
    )
    await submit(user, dialog)

    for (const message of ["Selecciona la base.", "Selecciona el turno."]) {
      expect(await within(dialog).findByText(message)).toBeInTheDocument()
    }
  })

  it("valida el formato del correo y del celular", async () => {
    const { user, dialog } = await openForm()

    await user.type(within(dialog).getByLabelText(/^Correo/), "laura@")
    await user.type(within(dialog).getByLabelText(/^Celular/), "abc")
    await submit(user, dialog)

    expect(
      await within(dialog).findByText(
        "Formato no válido. Usa un correo como nombre@aircrew-ops.com."
      )
    ).toBeInTheDocument()
    // El campo del celular no acepta letras: queda vacío y pide el número.
    expect(within(dialog).getByLabelText(/^Celular/)).toHaveValue("")
    expect(
      within(dialog).getByText("Ingresa el celular de contacto.")
    ).toBeInTheDocument()
  })

  it("el número se formatea mientras se escribe", async () => {
    const { user, dialog } = await openForm()
    const phone = within(dialog).getByLabelText(/^Celular/)

    await user.type(phone, "4045550123")

    expect(phone).toHaveValue("(404) 555-0123")
  })

  it.each([
    { number: "104 555 0123", reason: "el código de área empieza por 1" },
    { number: "404 555 012", reason: "tiene 9 dígitos" },
  ])("EE. UU.: «$number» no es válido porque $reason", async ({ number }) => {
    const { user, dialog } = await openForm()

    await user.type(within(dialog).getByLabelText(/^Celular/), number)
    await submit(user, dialog)

    const phone = within(dialog).getByLabelText(/^Celular/)
    await waitFor(() =>
      expect(phone).toHaveAccessibleDescription(
        "Número de celular no válido para el país elegido."
      )
    )
  })

  it("valida según el país: un número de EE. UU. no es un celular válido de España", async () => {
    const { user, dialog } = await openForm()

    await user.selectOptions(countrySelect(dialog), "ES")
    const phone = within(dialog).getByLabelText(/^Celular/)
    await user.type(phone, "404 555 0123")
    await submit(user, dialog)

    await waitFor(() =>
      expect(phone).toHaveAccessibleDescription(
        "Número de celular no válido para el país elegido."
      )
    )
  })

  it("el indicativo elegido se envía junto con el número (E.164)", async () => {
    createWithoutSaving()
    const { user, dialog } = await openForm()

    await fillValidCrewForm(user, dialog)
    await user.selectOptions(countrySelect(dialog), "ES")
    const phone = within(dialog).getByLabelText(/^Celular/)
    await user.clear(phone)
    await user.type(phone, "612 345 678")
    await submit(user, dialog)

    await waitFor(() =>
      expect(lastCreateInput()).toMatchObject({ phone: "+34612345678" })
    )
  })

  it("un Supervisor se envía con su base y su turno, sin cargo", async () => {
    createWithoutSaving()
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await fillPersonalData(user, dialog)
    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
    await user.selectOptions(form.getByLabelText(/^Base/), "JFK")
    await user.selectOptions(form.getByLabelText(/^Turno/), "turno_1")
    await submit(user, dialog)

    await waitFor(() =>
      expect(lastCreateInput()).toEqual({
        firstName: "Laura",
        lastName: "Gómez",
        email: "laura.gomez@aircrew-ops.com",
        phone: "+14045550123",
        roleGroup: "supervisor",
        roleTitle: "",
        base: "JFK",
        shift: "turno_1",
      })
    )
  })

  it("un Administrador se envía solo con sus datos personales", async () => {
    createWithoutSaving()
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await fillPersonalData(user, dialog)
    // Lo elegido con otro rol no se envía al cambiar a Administrador.
    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
    await user.selectOptions(form.getByLabelText(/^Base/), "JFK")
    await user.selectOptions(form.getByLabelText(/^Rol/), "administrador")
    await submit(user, dialog)

    await waitFor(() =>
      expect(lastCreateInput()).toEqual({
        firstName: "Laura",
        lastName: "Gómez",
        email: "laura.gomez@aircrew-ops.com",
        phone: "+14045550123",
        roleGroup: "administrador",
        roleTitle: "",
        base: "",
        shift: "",
      })
    )
  })

  it("un correo ya registrado se marca en el campo y no cierra la ventana", async () => {
    const { user, dialog } = await openForm()

    await fillValidCrewForm(user, dialog, "d.salcedo@aircrew-ops.com")
    await submit(user, dialog)

    const email = within(dialog).getByLabelText(/^Correo/)
    await waitFor(() =>
      expect(email).toHaveAccessibleDescription(
        "Ya existe un usuario con ese email."
      )
    )
    expect(email).toHaveFocus()
    expect(screen.getByRole("dialog", { name: "Añadir usuario" })).toBeVisible()
  })

  it("si el alta falla, avisa sin cerrar la ventana ni perder los datos", async () => {
    usersData.overrides.createUser = () =>
      Promise.reject(new Error("servicio caído"))
    const { user, dialog } = await openForm()

    await fillValidCrewForm(user, dialog)
    await submit(user, dialog)

    expect(
      await within(dialog).findByText(
        "No se pudo guardar el usuario. Intenta de nuevo."
      )
    ).toHaveAttribute("role", "alert")
    expect(within(dialog).getByLabelText(/^Nombres/)).toHaveValue("Laura")
  })

  it("la X cierra la ventana y el foco vuelve a «Añadir usuario»", async () => {
    const { user, trigger, dialog } = await openForm()

    await user.click(
      within(dialog).getByRole("button", {
        name: "Cerrar formulario de usuario",
      })
    )

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  // Último del archivo: el alta queda guardada en memoria para el resto del archivo.
  it("con datos válidos crea el usuario pendiente de activación, avisa del correo y la tabla y los conteos se actualizan", async () => {
    const { user, dialog } = await openForm()

    await fillValidCrewForm(user, dialog)
    await submit(user, dialog)

    // Mientras se envía, el botón lo indica y no permite reenviar (doble clic).
    expect(
      within(dialog).getByRole("button", { name: "Creando usuario…" })
    ).toBeDisabled()

    const toast = await findToast("Usuario creado")
    expect(toast).toHaveTextContent(
      "Se envió un correo a laura.gomez@aircrew-ops.com para que Laura Gómez active la cuenta."
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )

    // Se envió lo del formulario, una sola vez.
    const calls = usersData.calls.filter((entry) => entry.name === "createUser")
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toEqual([
      {
        firstName: "Laura",
        lastName: "Gómez",
        email: "laura.gomez@aircrew-ops.com",
        // Formato internacional E.164: indicativo + número, sin espacios.
        phone: "+14045550123",
        roleGroup: "tripulacion",
        roleTitle: "Comandante",
        base: "ATL",
        shift: "",
      },
    ])

    // La tabla, los indicadores y los filtros se refrescan con el nuevo usuario, que
    // aparece pendiente de activación y con el código que le asignó el backend.
    const row = (await screen.findByText("Laura Gómez")).closest("tr")
    expect(row).toHaveTextContent("Pendiente de activación")
    expect(row).toHaveTextContent("AC-6001")
    expect(
      await screen.findByRole("button", { name: "Todos (185)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Tripulación (159)" })
    ).toBeInTheDocument()
  })
})
