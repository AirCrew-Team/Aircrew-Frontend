import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Acciones de cada fila: ojo, lápiz (editar) y papelera (eliminar con confirmación).
// Va en su propio archivo porque editar y eliminar cambian los datos simulados en
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

const openDelete = async (name: string) => {
  const user = await renderUsers()
  const trigger = screen.getByRole("button", { name: `Eliminar a ${name}` })
  await user.click(trigger)
  const dialog = await screen.findByRole("alertdialog", {
    name: `¿Desea eliminar a ${name}?`,
  })
  return { user, trigger, dialog }
}

describe("Usuarios: acciones de cada fila", () => {
  it("cada fila tiene ojo, lápiz y papelera, solo con ícono y con nombre accesible", async () => {
    await renderUsers()
    const row = rowOf("Diego Salcedo")

    const buttons = within(row).getAllByRole("button")
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Ver más información de Diego Salcedo",
      "Editar a Diego Salcedo",
      "Eliminar a Diego Salcedo",
    ])
    // Sin texto visible: solo el ícono, con ayuda al pasar el mouse.
    for (const button of buttons) expect(button.textContent).toBe("")
    expect(buttons.map((button) => button.title)).toEqual([
      "Ver más información",
      "Editar",
      "Eliminar",
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
    expect(form.getByLabelText(/^Número de licencia/)).toHaveValue(
      "FAA ATP #1108-US"
    )
    for (const certificate of [
      "Airline Transport Pilot (ATP)",
      "Instrument Rating (IR)",
      "Multi-Engine (ME)",
    ]) {
      expect(form.getByRole("checkbox", { name: certificate })).toBeChecked()
    }
    expect(
      form.getByRole("checkbox", { name: "Private Pilot (PPL)" })
    ).not.toBeChecked()
  })

  it("un supervisor se abre sin cargo ni licencia", async () => {
    const { dialog } = await openEdit("Camila Restrepo")

    expect(within(dialog).getByLabelText(/^Rol/)).toHaveValue("supervisor")
    expect(within(dialog).queryByLabelText(/^Cargo/)).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("group", { name: "Licencia" })
    ).not.toBeInTheDocument()
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
        "Ya existe un usuario con ese correo."
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

  it("guardar envía los cambios, avisa, cierra y la tabla se actualiza", async () => {
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

    const call = usersData.calls.find((entry) => entry.name === "updateUser")
    expect(call?.args[0]).toBe("AC-1108")
    expect(call?.args[1]).toEqual({
      firstName: "Diego",
      lastName: "Salcedo",
      email: "d.salcedo@aircrew-ops.com",
      phone: "+14045550142",
      roleGroup: "tripulacion",
      roleTitle: "Comandante",
      base: "BOS",
      license: {
        number: "FAA ATP #1108-US",
        certificates: [
          "Airline Transport Pilot (ATP)",
          "Instrument Rating (IR)",
          "Multi-Engine (ME)",
        ],
      },
    })
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

describe("Usuarios: eliminar", () => {
  it("la papelera pide confirmación; «Cancelar» cierra sin eliminar", async () => {
    const { user, trigger, dialog } = await openDelete("Valeria Ortiz")

    expect(dialog).toHaveAccessibleDescription(
      "Esta acción no se podrá deshacer."
    )
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(rowOf("Valeria Ortiz")).toBeInTheDocument()
    expect(usersData.calls.some((call) => call.name === "deleteUser")).toBe(
      false
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("si eliminar falla, avisa y el usuario sigue en la lista", async () => {
    usersData.overrides.deleteUser = fail
    const { user, dialog } = await openDelete("Valeria Ortiz")

    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }))

    expect(
      await within(dialog).findByText(
        "No se pudo eliminar el usuario. Intenta de nuevo."
      )
    ).toHaveAttribute("role", "alert")
    expect(rowOf("Valeria Ortiz")).toBeInTheDocument()
  })

  // Último del archivo: Valeria queda eliminada en memoria.
  it("«Eliminar» lo quita de la lista, avisa y actualiza los conteos", async () => {
    const { user, dialog } = await openDelete("Valeria Ortiz")

    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }))

    const toast = await findToast("Usuario eliminado")
    expect(toast).toHaveTextContent(
      "Valeria Ortiz ya no forma parte del directorio."
    )
    expect(
      usersData.calls.find((call) => call.name === "deleteUser")?.args
    ).toEqual(["AC-5520"])
    await waitFor(() =>
      expect(screen.queryByText("Valeria Ortiz")).not.toBeInTheDocument()
    )
    expect(
      await screen.findByRole("button", { name: "Todos (183)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Tripulación (157)" })
    ).toBeInTheDocument()
  })
})
