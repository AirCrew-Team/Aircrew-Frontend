import { screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { REAL_USERS } from "../mocks/profileApi"
import {
  API_ITEMS,
  apiError,
  USERS_URL,
  userUrl,
  usersHandlers,
  UUIDS,
} from "../mocks/usersApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// Pantalla Usuarios con sesión real de super_admin: cada llamada va al servicio admin
// (MSW simula el backend). Revisa la traducción de valores (roles, estados, turnos,
// page_size, nombre), los catálogos del backend, el PATCH con solo lo que cambió y los
// errores 400 / 409 / 502 / 503.

// Estos tests llenan el formulario campo por campo con userEvent: más margen, solo aquí.
vi.setConfig({ testTimeout: 20_000 })

let listRequests: URL[]

beforeEach(() => {
  useAuthStore.getState().setUser(REAL_USERS.admin)
  const mocked = usersHandlers()
  listRequests = mocked.listRequests
  server.use(...mocked.handlers)
})

const renderUsers = async (search = "") => {
  const user = userEvent.setup()
  renderRoute(`${PATHS.superAdmin.usuarios}${search}`)
  await screen.findByRole("table")
  return user
}

const rowOf = (name: string) =>
  screen.getByText(name).closest("tr") as HTMLElement

// Guarda el cuerpo de cada POST o PATCH y responde con `reply`.
const captureBody = (
  method: "post" | "patch",
  url: string,
  reply: () => Response
) => {
  const bodies: unknown[] = []
  server.use(
    http[method](url, async ({ request }) => {
      bodies.push(await request.json())
      return reply()
    })
  )
  return bodies
}

const openCreate = async () => {
  const user = await renderUsers()
  await user.click(screen.getByRole("button", { name: "Añadir usuario" }))
  const dialog = await screen.findByRole("dialog", { name: "Añadir usuario" })
  await within(dialog).findByRole("button", { name: "Crear usuario" })
  return { user, form: within(dialog) }
}

const openEdit = async (name: string) => {
  const user = await renderUsers()
  await user.click(screen.getByRole("button", { name: `Editar a ${name}` }))
  const dialog = await screen.findByRole("dialog", { name: "Editar usuario" })
  const form = within(dialog)
  await form.findByRole("button", { name: "Guardar cambios" })
  return { user, form }
}

const fillPersonal = async (
  user: UserEvent,
  form: ReturnType<typeof within>,
  name: [string, string],
  email: string
) => {
  await user.type(form.getByLabelText(/^Nombres/), name[0])
  await user.type(form.getByLabelText(/^Apellidos/), name[1])
  await user.type(form.getByLabelText(/^Correo/), email)
  await user.type(form.getByLabelText(/^Celular/), "404 555 0142")
}

const fillCrew = async (user: UserEvent, form: ReturnType<typeof within>) => {
  await fillPersonal(user, form, ["Diego", "Salcedo"], "d.salcedo@delta.com")
  await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")
  await user.selectOptions(form.getByLabelText(/^Cargo/), "Comandante")
  await user.selectOptions(form.getByLabelText(/^Base/), "ATL")
}

const submitCreate = (user: UserEvent, form: ReturnType<typeof within>) =>
  user.click(form.getByRole("button", { name: "Crear usuario" }))

describe("Usuarios (sesión real): lista e indicadores", () => {
  it("pide la página con page_size y muestra los datos traducidos del backend", async () => {
    await renderUsers()

    const params = listRequests.at(-1)?.searchParams
    expect(params?.get("page")).toBe("1")
    expect(params?.get("page_size")).toBe("5")
    // Sin búsqueda ni rol no se envían.
    expect(params?.has("search")).toBe(false)
    expect(params?.has("role")).toBe(false)

    // Nombre completo, código (no el UUID), cargo, base y estado traducido.
    const crew = rowOf("Diego Salcedo Pérez")
    expect(crew).toHaveTextContent("AC-0001")
    expect(crew).toHaveTextContent("Comandante")
    expect(crew).toHaveTextContent("ATL")
    expect(crew).toHaveTextContent("En vuelo")
    expect(crew).not.toHaveTextContent(UUIDS.crew)
    // Supervisor: sin código («—»), cargo «Supervisor» y off_duty → «Fuera de turno».
    const supervisor = rowOf("Camila Restrepo")
    expect(supervisor).toHaveTextContent("Supervisor")
    expect(supervisor).toHaveTextContent("Fuera de turno")
    // Administrador desactivado: sin código, base ni estado, y con «Inactivo».
    const admin = rowOf("Mateo Morales")
    expect(admin).toHaveTextContent("Administrador")
    expect(admin).toHaveTextContent("Inactivo")
    expect(admin).toHaveTextContent("Sin estado")
    expect(
      within(admin).getByRole("button", { name: "Desactivar a Mateo Morales" })
    ).toBeDisabled()
    // Recién creada: «Pendiente de activación».
    expect(rowOf("Laura Gómez")).toHaveTextContent("Pendiente de activación")
  })

  it("la columna Turno muestra el turno del supervisor y «—» en los demás roles", async () => {
    await renderUsers()

    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent)
    const turno = headers.indexOf("Turno")
    expect(turno).toBeGreaterThan(-1)
    const shiftCell = (name: string) =>
      within(rowOf(name)).getAllByRole("cell")[turno]

    // afternoon → «Turno 2».
    expect(shiftCell("Camila Restrepo")).toHaveTextContent("Turno 2")
    expect(shiftCell("Diego Salcedo Pérez")).toHaveTextContent("—")
    expect(shiftCell("Mateo Morales")).toHaveTextContent("—")
  })

  it.each([
    { filter: "?role=tripulacion", api: "crew" },
    { filter: "?role=supervisor", api: "supervisor" },
    { filter: "?role=administrador", api: "super_admin" },
  ])("$filter pide role=$api", async ({ filter, api }) => {
    await renderUsers(filter)

    expect(listRequests.at(-1)?.searchParams.get("role")).toBe(api)
  })

  it("la búsqueda se envía como search", async () => {
    const user = await renderUsers()

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar usuario" }),
      "salcedo"
    )

    await waitFor(() =>
      expect(listRequests.at(-1)?.searchParams.get("search")).toBe("salcedo")
    )
  })

  it("los indicadores vienen de /users/stats y la aptitud médica sin datos es «—»", async () => {
    await renderUsers()

    expect(
      await screen.findByRole("button", { name: "Todos (4)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Tripulación (2)" })
    ).toBeInTheDocument()
    const fitness = screen.getByText("Aptitud médica").closest("div")
    expect(fitness).toHaveTextContent("—")
  })
})

describe("Usuarios (sesión real): detalle", () => {
  it("pide la ficha por el UUID, muestra la base del catálogo y oculta lo que el backend aún no tiene", async () => {
    const user = await renderUsers()

    await user.click(
      screen.getByRole("button", {
        name: "Ver más información de Diego Salcedo Pérez",
      })
    )
    const dialog = within(
      await screen.findByRole("dialog", { name: "Detalle del Usuario" })
    )

    expect(
      await dialog.findByText("Comandante · Base ATL / Atlanta (catálogo)")
    ).toBeInTheDocument()
    for (const text of ["AC-0001", "+14045550142", "d.salcedo@delta.com"]) {
      expect(dialog.getByText(text)).toBeInTheDocument()
    }
    for (const text of [
      "Horas de vuelo",
      "Descanso reglamentario",
      "Número de licencia",
      "Certificados",
    ]) {
      expect(dialog.queryByText(text)).not.toBeInTheDocument()
    }
  })

  it("un supervisor muestra su turno", async () => {
    const user = await renderUsers()

    await user.click(
      screen.getByRole("button", {
        name: "Ver más información de Camila Restrepo",
      })
    )
    const dialog = within(
      await screen.findByRole("dialog", { name: "Detalle del Usuario" })
    )

    expect(await dialog.findByText("Turno: Turno 2")).toBeInTheDocument()
  })
})

describe("Usuarios (sesión real): crear", () => {
  it("los desplegables salen del catálogo del backend", async () => {
    const { user, form } = await openCreate()

    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")

    expect(
      within(form.getByLabelText(/^Cargo/))
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["Selecciona…", "Comandante", "Copiloto", "Auxiliar de Vuelo"])
    expect(
      within(form.getByLabelText(/^Base/)).getByRole("option", {
        name: "Base ATL / Atlanta (catálogo)",
      })
    ).toBeInTheDocument()
  })

  it("un tripulante se envía con name, position y base, sin código ni contraseña", async () => {
    const bodies = captureBody("post", USERS_URL, () =>
      HttpResponse.json(
        { ...API_ITEMS.crew, pending_activation: true },
        { status: 201 }
      )
    )
    const { user, form } = await openCreate()

    await fillCrew(user, form)
    await submitCreate(user, form)

    const toast = await findToast("Usuario creado")
    expect(toast).toHaveTextContent(
      "Se envió un correo a d.salcedo@delta.com para que Diego Salcedo Pérez active la cuenta."
    )
    expect(bodies).toEqual([
      {
        name: "Diego Salcedo",
        email: "d.salcedo@delta.com",
        role: "crew",
        phone: "+14045550142",
        position: "Comandante",
        base: "ATL",
      },
    ])
  })

  // D14 (FE-5): el estado operativo empieza en «Disponible» y se envía al crear.
  it("un supervisor se envía con base, turno traducido y estado operativo", async () => {
    const bodies = captureBody("post", USERS_URL, () =>
      HttpResponse.json(API_ITEMS.supervisor, { status: 201 })
    )
    const { user, form } = await openCreate()

    await fillPersonal(
      user,
      form,
      ["Camila", "Restrepo"],
      "c.restrepo@delta.com"
    )
    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
    await user.selectOptions(form.getByLabelText(/^Base/), "JFK")
    await user.selectOptions(form.getByLabelText(/^Turno/), "turno_1")
    await submitCreate(user, form)

    await findToast("Usuario creado")
    expect(bodies).toEqual([
      {
        name: "Camila Restrepo",
        email: "c.restrepo@delta.com",
        role: "supervisor",
        phone: "+14045550142",
        base: "JFK",
        shift: "morning",
        operational_status: "available",
      },
    ])
  })

  it("un administrador se envía solo con nombre, correo, rol y celular", async () => {
    const bodies = captureBody("post", USERS_URL, () =>
      HttpResponse.json(API_ITEMS.admin, { status: 201 })
    )
    const { user, form } = await openCreate()

    await fillPersonal(user, form, ["Mateo", "Morales"], "m.morales@delta.com")
    await user.selectOptions(form.getByLabelText(/^Rol/), "administrador")
    await submitCreate(user, form)

    await findToast("Usuario creado")
    expect(bodies).toEqual([
      {
        name: "Mateo Morales",
        email: "m.morales@delta.com",
        role: "super_admin",
        phone: "+14045550142",
      },
    ])
  })

  it("un 409 por correo repetido se muestra debajo del campo correo", async () => {
    const message = "Ya existe un usuario con ese email."
    server.use(http.post(USERS_URL, () => apiError(message, 409)))
    const { user, form } = await openCreate()

    await fillCrew(user, form)
    await submitCreate(user, form)

    const email = form.getByLabelText(/^Correo/)
    await waitFor(() => expect(email).toHaveAccessibleDescription(message))
    expect(email).toHaveFocus()
    expect(form.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("un 400 muestra el mensaje del backend", async () => {
    const message = "position debe ser uno de: Comandante, Copiloto."
    server.use(http.post(USERS_URL, () => apiError(message, 400)))
    const { user, form } = await openCreate()

    await fillCrew(user, form)
    await submitCreate(user, form)

    expect(await form.findByText(message)).toHaveAttribute("role", "alert")
  })

  it.each([502, 503])(
    "un %i avisa que no salió el correo y no se creó el usuario",
    async (status) => {
      server.use(
        http.post(USERS_URL, () =>
          apiError("No se pudo enviar el correo.", status)
        )
      )
      const { user, form } = await openCreate()

      await fillCrew(user, form)
      await submitCreate(user, form)

      expect(
        await form.findByText(
          "No se pudo enviar el correo; no se creó el usuario. Intenta de nuevo."
        )
      ).toHaveAttribute("role", "alert")
    }
  )
})

describe("Usuarios (sesión real): editar y desactivar", () => {
  it("separa el nombre en la primera palabra y el resto, y envía solo lo que cambió, sin el rol del tripulante", async () => {
    const bodies = captureBody("patch", userUrl(UUIDS.crew), () =>
      HttpResponse.json({ ...API_ITEMS.crew, base: "MSP" })
    )
    const { user, form } = await openEdit("Diego Salcedo Pérez")

    expect(form.getByLabelText(/^Nombres/)).toHaveValue("Diego")
    expect(form.getByLabelText(/^Apellidos/)).toHaveValue("Salcedo Pérez")
    await user.selectOptions(form.getByLabelText(/^Base/), "MSP")
    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    await findToast("Usuario actualizado")
    expect(bodies).toEqual([{ base: "MSP" }])
  })

  it("pasar un supervisor a administrador envía solo el rol", async () => {
    const bodies = captureBody("patch", userUrl(UUIDS.supervisor), () =>
      HttpResponse.json({ ...API_ITEMS.supervisor, role: "super_admin" })
    )
    const { user, form } = await openEdit("Camila Restrepo")

    await user.selectOptions(form.getByLabelText(/^Rol/), "administrador")
    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    await findToast("Usuario actualizado")
    expect(bodies).toEqual([{ role: "super_admin" }])
  })

  it.each([
    { shift: "turno_1", api: "morning" },
    { shift: "turno_3", api: "night" },
  ])(
    "cambiar el turno de un supervisor a $shift envía solo shift: $api",
    async ({ shift, api }) => {
      const bodies = captureBody("patch", userUrl(UUIDS.supervisor), () =>
        HttpResponse.json({ ...API_ITEMS.supervisor, shift: api })
      )
      const { user, form } = await openEdit("Camila Restrepo")

      await user.selectOptions(form.getByLabelText(/^Turno/), shift)
      await user.click(form.getByRole("button", { name: "Guardar cambios" }))

      await findToast("Usuario actualizado")
      expect(bodies).toEqual([{ shift: api }])
    }
  )

  it("desactivar envía DELETE por el UUID y el usuario sigue en la lista como inactivo", async () => {
    let deleted = false
    server.use(
      http.delete(userUrl(UUIDS.crew), () => {
        deleted = true
        return HttpResponse.json({ ...API_ITEMS.crew, is_active: false })
      }),
      // Después de desactivar, la lista lo trae inactivo.
      http.get(USERS_URL, () =>
        HttpResponse.json({
          items: [{ ...API_ITEMS.crew, is_active: !deleted }],
          page: 1,
          page_size: 5,
          total: 1,
        })
      )
    )
    const user = await renderUsers()

    await user.click(
      screen.getByRole("button", { name: "Desactivar a Diego Salcedo Pérez" })
    )
    const dialog = within(await screen.findByRole("alertdialog"))
    await user.click(dialog.getByRole("button", { name: "Desactivar" }))

    await findToast("Usuario desactivado")
    expect(deleted).toBe(true)
    await waitFor(() =>
      expect(rowOf("Diego Salcedo Pérez")).toHaveTextContent("Inactivo")
    )
  })

  it("un 409 al desactivar muestra el texto del backend", async () => {
    const message =
      "No puedes quitarte el rol de super_admin ni desactivar tu propia cuenta."
    server.use(http.delete(userUrl(UUIDS.crew), () => apiError(message, 409)))
    const user = await renderUsers()

    await user.click(
      screen.getByRole("button", { name: "Desactivar a Diego Salcedo Pérez" })
    )
    const dialog = within(await screen.findByRole("alertdialog"))
    await user.click(dialog.getByRole("button", { name: "Desactivar" }))

    expect(await dialog.findByText(message)).toHaveAttribute("role", "alert")
  })
})

describe("Inicio del admin (sesión real): tarjeta Gestión de Usuarios", () => {
  it("tripulantes registrados = by_role.crew, disponibles = crew_available y aptos «—»", async () => {
    renderRoute(PATHS.superAdmin.inicio)

    expect(
      await screen.findByText("2 tripulantes registrados")
    ).toBeInTheDocument()
    expect(screen.getByText("1 tripulantes disponibles")).toBeInTheDocument()
    expect(screen.getByText("— Apto")).toBeInTheDocument()
  })
})

describe("Usuarios (cuenta demo)", () => {
  it("no llama al backend", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
    let called = false
    server.use(
      http.all(`${USERS_URL}*`, () => {
        called = true
        return HttpResponse.json({})
      })
    )

    await renderUsers()

    expect(screen.getByText("Diego Salcedo")).toBeInTheDocument()
    expect(called).toBe(false)
  })
})
