import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Acciones de cada fila con la cuenta demo: ojo, lápiz (editar) y papelera (desactivar
// con confirmación).
// Va en su propio archivo porque editar y desactivar cambian los datos simulados en
// memoria. Los tests que cambian datos van al final y cada uno usa un usuario distinto.

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

const fail = () => Promise.reject(new Error("servicio caído"))

const renderUsers = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superAdmin.usuarios)
  await screen.findByRole("table")
  return user
}

const rowOf = (name: string) =>
  screen.getByText(name).closest("tr") as HTMLElement

const openEdit = async (name: string) => {
  const user = await renderUsers()
  await user.click(screen.getByRole("button", { name: `Editar a ${name}` }))
  const dialog = await screen.findByRole("dialog", { name: "Editar usuario" })
  await within(dialog).findByRole("button", { name: "Guardar cambios" })
  return { user, dialog }
}

const openDeactivate = async (name: string) => {
  const user = await renderUsers()
  const trigger = screen.getByRole("button", { name: `Desactivar a ${name}` })
  await user.click(trigger)
  const dialog = await screen.findByRole("alertdialog", {
    name: `¿Desea desactivar a ${name}?`,
  })
  return { user, trigger, dialog }
}

const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent)

describe("Usuarios: acciones de cada fila", () => {
  it("cada fila tiene ojo, lápiz y papelera, solo con ícono y con nombre accesible", async () => {
    await renderUsers()
    const row = rowOf("Diego Salcedo")

    const buttons = within(row).getAllByRole("button")
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Ver más información de Diego Salcedo",
      "Editar a Diego Salcedo",
      "Desactivar a Diego Salcedo",
    ])
    // Sin texto visible: solo el ícono, con ayuda al pasar el mouse.
    for (const button of buttons) expect(button.textContent).toBe("")
    expect(buttons.map((button) => button.title)).toEqual([
      "Ver más información",
      "Editar",
      "Desactivar",
    ])
  })
})

describe("Usuarios: editar", () => {
  it("el lápiz abre el formulario con los datos del usuario", async () => {
    const { dialog } = await openEdit("Diego Salcedo")
    const form = within(dialog)

    expect(form.getByLabelText(/^Nombres/)).toHaveValue("Diego")
    expect(form.getByLabelText(/^Apellidos/)).toHaveValue("Salcedo")
    expect(form.getByLabelText(/^Correo/)).toHaveValue(
      "d.salcedo@aircrew-ops.com"
    )
    expect(
      form.getByRole("combobox", { name: "País del celular" })
    ).toHaveValue("US")
    expect(form.getByLabelText(/^Celular/)).toHaveValue("(404) 555-0142")
    expect(form.getByLabelText(/^Rol/)).toHaveValue("tripulacion")
    expect(form.getByLabelText(/^Cargo/)).toHaveValue("Comandante")
    expect(form.getByLabelText(/^Base/)).toHaveValue("ATL")
    // La licencia y los certificados ya no se editan aquí.
    expect(
      form.queryByRole("group", { name: "Licencia" })
    ).not.toBeInTheDocument()
  })

  it("el rol de un tripulante no se puede cambiar", async () => {
    const { dialog } = await openEdit("Diego Salcedo")
    const role = within(dialog).getByLabelText(/^Rol/)

    expect(optionTexts(role)).toEqual(["Tripulación"])
    expect(role).toHaveAccessibleDescription(
      "El rol de un tripulante no se puede cambiar."
    )
  })

  it("un supervisor se abre con su base y su turno, y solo puede pasar a Administrador", async () => {
    const { dialog } = await openEdit("Camila Restrepo")
    const form = within(dialog)

    expect(form.getByLabelText(/^Rol/)).toHaveValue("supervisor")
    expect(optionTexts(form.getByLabelText(/^Rol/))).toEqual([
      "Selecciona…",
      "Supervisor",
      "Administrador",
    ])
    expect(form.queryByLabelText(/^Cargo/)).not.toBeInTheDocument()
    expect(form.getByLabelText(/^Base/)).toHaveValue("JFK")
    expect(form.getByLabelText(/^Turno/)).toHaveValue("turno_1")
  })

  it("valida igual que el alta: un correo de otro usuario se marca en el campo", async () => {
    const { user, dialog } = await openEdit("Juan Pablo Navarro")
    const email = within(dialog).getByLabelText(/^Correo/)

    await user.clear(email)
    await user.type(email, "c.restrepo@aircrew-ops.com")
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" })
    )

    await waitFor(() =>
      expect(email).toHaveAccessibleDescription(
        "Ya existe un usuario con ese email."
      )
    )
    expect(screen.getByRole("dialog", { name: "Editar usuario" })).toBeVisible()
  })

  it("si guardar falla, avisa sin cerrar la ventana", async () => {
    usersData.overrides.updateUser = fail
    const { user, dialog } = await openEdit("Juan Pablo Navarro")

    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" })
    )

    expect(
      await within(dialog).findByText(
        "No se pudo guardar el usuario. Intenta de nuevo."
      )
    ).toHaveAttribute("role", "alert")
  })

  it("guardar envía los cambios y los datos originales, avisa, cierra y la tabla se actualiza", async () => {
    const { user, dialog } = await openEdit("Diego Salcedo")

    await user.selectOptions(within(dialog).getByLabelText(/^Base/), "BOS")
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" })
    )

    expect(
      within(dialog).getByRole("button", { name: "Guardando cambios…" })
    ).toBeDisabled()
    const toast = await findToast("Usuario actualizado")
    expect(toast).toHaveTextContent(
      "Los cambios de Diego Salcedo quedaron guardados."
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )

    const original = {
      firstName: "Diego",
      lastName: "Salcedo",
      email: "d.salcedo@aircrew-ops.com",
      phone: "+14045550142",
      roleGroup: "tripulacion",
      roleTitle: "Comandante",
      base: "ATL",
      shift: "",
    }
    // id, lo nuevo y lo que había: con eso la acción envía solo lo que cambió.
    const call = usersData.calls.find((entry) => entry.name === "updateUser")
    expect(call?.args).toEqual([
      "AC-1108",
      { ...original, base: "BOS" },
      original,
    ])
    await waitFor(() => expect(rowOf("Diego Salcedo")).toHaveTextContent("BOS"))
  })

  it("cambiar el rol mueve al usuario de conteo", async () => {
    const { user, dialog } = await openEdit("Camila Restrepo")

    await user.selectOptions(
      within(dialog).getByLabelText(/^Rol/),
      "administrador"
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" })
    )

    await findToast("Usuario actualizado")
    expect(
      await screen.findByRole("button", { name: "Supervisores (19)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Administradores (7)" })
    ).toBeInTheDocument()
  })
})

describe("Usuarios: desactivar", () => {
  it("la papelera pide confirmación; «Cancelar» cierra sin desactivar", async () => {
    const { user, trigger, dialog } = await openDeactivate("Valeria Ortiz")

    expect(dialog).toHaveAccessibleDescription(
      "No se borra: seguirá en la lista como inactivo y no podrá iniciar sesión."
    )
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(rowOf("Valeria Ortiz")).not.toHaveTextContent("Inactivo")
    expect(usersData.calls.some((call) => call.name === "deleteUser")).toBe(
      false
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("si desactivar falla, avisa y el usuario sigue activo", async () => {
    usersData.overrides.deleteUser = fail
    const { user, dialog } = await openDeactivate("Valeria Ortiz")

    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }))

    expect(
      await within(dialog).findByText(
        "No se pudo desactivar el usuario. Intenta de nuevo."
      )
    ).toHaveAttribute("role", "alert")
    expect(rowOf("Valeria Ortiz")).not.toHaveTextContent("Inactivo")
  })

  // Último del archivo: Valeria queda desactivada en memoria.
  it("«Desactivar» lo deja en la lista como inactivo, avisa y no se puede repetir", async () => {
    const { user, dialog } = await openDeactivate("Valeria Ortiz")

    await user.click(within(dialog).getByRole("button", { name: "Desactivar" }))

    const toast = await findToast("Usuario desactivado")
    expect(toast).toHaveTextContent("Valeria Ortiz ya no podrá iniciar sesión.")
    expect(
      usersData.calls.find((call) => call.name === "deleteUser")?.args
    ).toEqual(["AC-5520"])
    // Sigue en la lista, con «Inactivo» y la papelera deshabilitada.
    await waitFor(() =>
      expect(rowOf("Valeria Ortiz")).toHaveTextContent("Inactivo")
    )
    expect(
      screen.getByRole("button", { name: "Desactivar a Valeria Ortiz" })
    ).toBeDisabled()
  })
})
