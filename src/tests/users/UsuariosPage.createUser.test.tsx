import { screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Formulario «Añadir usuario» (Delta Air Lines, datos de EE. UU.): apertura, campos según
// el rol, validaciones, celular por país, alta con Idempotency-Key, refresco de la tabla
// y errores. Va en su propio archivo porque el alta simulada guarda el usuario en memoria
// y cambiaría los conteos de los otros tests.

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
      id: "AC-0000",
      status: "disponible",
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
  await user.type(
    form.getByLabelText(/^Número de licencia/),
    "FAA ATP #7001-US"
  )
  for (const certificate of [
    "Airline Transport Pilot (ATP)",
    "Instrument Rating (IR)",
    "Multi-Engine (ME)",
  ]) {
    await user.click(form.getByRole("checkbox", { name: certificate }))
  }
}

// Nombres de las casillas de certificados visibles.
const certificateNames = (dialog: HTMLElement) =>
  within(dialog)
    .queryAllByRole("checkbox")
    .map((checkbox) => checkbox.closest("label")?.textContent?.trim())

const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent)

const PILOT = [
  "Private Pilot (PPL)",
  "Commercial Pilot (CPL)",
  "Airline Transport Pilot (ATP)",
  "Instrument Rating (IR)",
  "Multi-Engine (ME)",
]

describe("Añadir usuario: formulario", () => {
  it("abre con datos personales y operativos, EE. UU. por defecto y «Alta de usuarios»", async () => {
    const { dialog } = await openForm()

    expect(
      within(dialog).getByText("Alta de usuarios · Flight Ops Central")
    ).toBeInTheDocument()
    for (const legend of ["Datos personales", "Datos operativos"]) {
      expect(
        within(dialog).getByRole("group", { name: legend })
      ).toBeInTheDocument()
    }
    // Cargo y Licencia dependen del rol: sin rol todavía no aparecen.
    expect(within(dialog).queryByLabelText(/^Cargo/)).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("group", { name: "Licencia" })
    ).not.toBeInTheDocument()

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
    // Bases: los hubs de Delta.
    const bases = within(within(dialog).getByLabelText(/^Base/))
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
    // Pie sin la nota de obligatorios; el botón de crear es solo texto.
    expect(
      within(dialog).queryByText(/Campos obligatorios/)
    ).not.toBeInTheDocument()
    expect(
      within(dialog)
        .getByRole("button", { name: "Crear usuario" })
        .querySelector("svg")
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

  it("Tripulación muestra el cargo con sus 5 opciones (sin Ingeniero de Vuelo); la licencia aparece al elegir el cargo", async () => {
    const { user, dialog } = await openForm()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "tripulacion"
    )

    expect(optionTexts(within(dialog).getByLabelText(/^Cargo/))).toEqual([
      "Selecciona…",
      "Comandante",
      "Copiloto",
      "Auxiliar de Vuelo",
      "Sobrecargo Principal",
      "Sobrecargo",
    ])
    // Sin cargo todavía no se muestra la licencia (no hay certificados que ofrecer).
    expect(
      within(dialog).queryByRole("group", { name: "Licencia" })
    ).not.toBeInTheDocument()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Cargo/),
      "Comandante"
    )

    expect(
      within(dialog).getByRole("group", { name: "Licencia" })
    ).toBeInTheDocument()
    // Sin certificado médico ni tipo de licencia.
    expect(within(dialog).queryByText(/médico/i)).not.toBeInTheDocument()
    expect(
      within(dialog).queryByLabelText(/^Tipo de licencia/)
    ).not.toBeInTheDocument()
  })

  it.each(["supervisor", "administrador"])(
    "%s no pide cargo ni licencia",
    async (role) => {
      const { user, dialog } = await openForm()

      await user.selectOptions(within(dialog).getByLabelText(/^Rol/), role)

      expect(within(dialog).queryByLabelText(/^Cargo/)).not.toBeInTheDocument()
      expect(
        within(dialog).queryByRole("group", { name: "Licencia" })
      ).not.toBeInTheDocument()
    }
  )

  it.each([
    { title: "Comandante", certificates: PILOT },
    { title: "Copiloto", certificates: PILOT },
    {
      title: "Auxiliar de Vuelo",
      certificates: ["Certificate of Demonstrated Proficiency (CDP)"],
    },
    {
      title: "Sobrecargo Principal",
      certificates: [
        "Certificate of Demonstrated Proficiency (CDP)",
        "Liderazgo",
        "Manejo de conflictos",
        "Aduanas / Inmigración",
      ],
    },
    {
      title: "Sobrecargo",
      certificates: [
        "Certificate of Demonstrated Proficiency (CDP)",
        "Liderazgo",
        "Manejo de conflictos",
        "Aduanas / Inmigración",
      ],
    },
  ])("«$title» ofrece sus certificados", async ({ title, certificates }) => {
    const { user, dialog } = await openForm()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "tripulacion"
    )
    // Sin cargo todavía no hay certificados.
    expect(within(dialog).queryAllByRole("checkbox")).toHaveLength(0)

    await user.selectOptions(within(dialog).getByLabelText(/^Cargo/), title)

    expect(certificateNames(dialog)).toEqual(certificates)
  })

  it("los certificados son chips seleccionables (casillas accesibles)", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")
    await user.selectOptions(form.getByLabelText(/^Cargo/), "Copiloto")
    const atp = form.getByRole("checkbox", {
      name: "Airline Transport Pilot (ATP)",
    })

    await user.click(atp)
    expect(atp).toBeChecked()
    // Con teclado: espacio desmarca.
    atp.focus()
    await user.keyboard(" ")
    expect(atp).not.toBeChecked()
  })

  it("al cambiar de cargo se desmarcan los certificados", async () => {
    const { user, dialog } = await openForm()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")
    await user.selectOptions(form.getByLabelText(/^Cargo/), "Sobrecargo")
    await user.click(
      form.getByRole("checkbox", {
        name: "Certificate of Demonstrated Proficiency (CDP)",
      })
    )
    await user.selectOptions(form.getByLabelText(/^Cargo/), "Auxiliar de Vuelo")

    expect(
      form.getByRole("checkbox", {
        name: "Certificate of Demonstrated Proficiency (CDP)",
      })
    ).not.toBeChecked()
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
      "Selecciona la base.",
    ]) {
      expect(within(dialog).getByText(message)).toBeInTheDocument()
    }
    expect(usersData.calls.some((call) => call.name === "createUser")).toBe(
      false
    )
  })

  it("con Tripulación, el cargo es obligatorio", async () => {
    const { user, dialog } = await openForm()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "tripulacion"
    )
    await submit(user, dialog)

    expect(
      await within(dialog).findByText("Selecciona el cargo.")
    ).toBeInTheDocument()
  })

  it("con cargo elegido, el número de licencia y al menos un certificado son obligatorios", async () => {
    const { user, dialog } = await openForm()

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "tripulacion"
    )
    await user.selectOptions(
      within(dialog).getByLabelText(/^Cargo/),
      "Comandante"
    )
    await submit(user, dialog)

    const group = within(dialog).getByRole("group", { name: /^Certificados/ })
    expect(
      await within(dialog).findByText("Ingresa el número de licencia.")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText("Selecciona al menos un certificado.")
    ).toBeInTheDocument()
    expect(group).toHaveAttribute("aria-invalid", "true")
    expect(group).toHaveAccessibleDescription(
      "Selecciona al menos un certificado."
    )
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

  it.each([
    { role: "supervisor", title: "Supervisor" },
    { role: "administrador", title: "Administrador" },
  ])(
    "un $title se envía sin cargo propio ni licencia",
    async ({ role, title }) => {
      createWithoutSaving()
      const { user, dialog } = await openForm()

      await fillPersonalData(user, dialog)
      await user.selectOptions(within(dialog).getByLabelText(/^Rol/), role)
      await user.selectOptions(within(dialog).getByLabelText(/^Base/), "JFK")
      await submit(user, dialog)

      await waitFor(() =>
        expect(lastCreateInput()).toMatchObject({
          roleGroup: role,
          roleTitle: title,
          base: "JFK",
          license: undefined,
        })
      )
    }
  )

  it("un Administrador se envía con todos sus datos", async () => {
    createWithoutSaving()
    const { user, dialog } = await openForm()

    await fillPersonalData(user, dialog)
    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "administrador"
    )
    await user.selectOptions(within(dialog).getByLabelText(/^Base/), "ATL")
    await submit(user, dialog)

    await waitFor(() =>
      expect(lastCreateInput()).toEqual({
        firstName: "Laura",
        lastName: "Gómez",
        email: "laura.gomez@aircrew-ops.com",
        phone: "+14045550123",
        roleGroup: "administrador",
        roleTitle: "Administrador",
        base: "ATL",
        license: undefined,
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
        "Ya existe un usuario con ese correo."
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
  it("con datos válidos crea el usuario, avisa, cierra y la tabla y los conteos se actualizan", async () => {
    const { user, dialog } = await openForm()

    await fillValidCrewForm(user, dialog)
    await submit(user, dialog)

    // Mientras se envía, el botón lo indica y no permite reenviar.
    expect(
      within(dialog).getByRole("button", { name: "Creando usuario…" })
    ).toBeDisabled()

    const toast = await findToast("Usuario creado")
    expect(toast).toHaveTextContent(
      "Laura Gómez quedó registrado con el ID AC-6001."
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )

    // Se envió lo del formulario, con una clave de idempotencia.
    const call = usersData.calls.find((entry) => entry.name === "createUser")
    expect(call?.args[0]).toEqual({
      firstName: "Laura",
      lastName: "Gómez",
      email: "laura.gomez@aircrew-ops.com",
      // Formato internacional E.164: indicativo + número, sin espacios.
      phone: "+14045550123",
      roleGroup: "tripulacion",
      roleTitle: "Comandante",
      base: "ATL",
      license: {
        number: "FAA ATP #7001-US",
        certificates: [
          "Airline Transport Pilot (ATP)",
          "Instrument Rating (IR)",
          "Multi-Engine (ME)",
        ],
      },
    })
    expect(call?.args[1]).toEqual(expect.any(String))

    // La tabla, los indicadores y los filtros se refrescan con el nuevo usuario.
    expect(await screen.findByText("Laura Gómez")).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Todos (185)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Tripulación (159)" })
    ).toBeInTheDocument()
  })
})
