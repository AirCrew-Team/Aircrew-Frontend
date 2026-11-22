import { screen, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { REAL_USERS } from "../mocks/profileApi"
import {
  API_ITEMS,
  API_USER_OPTIONS,
  USER_OPTIONS_URL,
  USERS_URL,
  userUrl,
  usersHandlers,
  UUIDS,
} from "../mocks/usersApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// FE-5 (docs/specs/cierre-pendientes.md):
// - D14: el formulario de Usuarios tiene «Estado operativo» para el supervisor, con el
//   catálogo supervisor_statuses de GET /catalogs/user-options; se envía como
//   operational_status al crear (empieza «Disponible», como en el backend) y al editar
//   (solo si cambió). Los demás roles no lo tienen ni lo envían.
// - El estado «vacation» del tripulante (crew_statuses del backend) se muestra como
//   «Vacaciones» en la tabla y en la ficha.

vi.setConfig({ testTimeout: 20_000 })

const STATUS = /^Estado operativo/

beforeEach(() => {
  useAuthStore.getState().setUser(REAL_USERS.admin)
  server.use(...usersHandlers().handlers)
})

const renderUsers = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superAdmin.usuarios)
  await screen.findByRole("table")
  return user
}

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

const fillSupervisor = async (
  user: UserEvent,
  form: ReturnType<typeof within>
) => {
  await user.type(form.getByLabelText(/^Nombres/), "Camila")
  await user.type(form.getByLabelText(/^Apellidos/), "Restrepo")
  await user.type(form.getByLabelText(/^Correo/), "c.restrepo@delta.com")
  await user.type(form.getByLabelText(/^Celular/), "404 555 0142")
  await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
  await user.selectOptions(form.getByLabelText(/^Base/), "JFK")
  await user.selectOptions(form.getByLabelText(/^Turno/), "turno_1")
}

const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent)

describe("D14: «Estado operativo» del supervisor en el formulario", () => {
  it("D14 solo aparece con el rol Supervisor, con el catálogo del backend y «Disponible» elegido", async () => {
    const { user, form } = await openCreate()

    expect(form.queryByLabelText(STATUS)).not.toBeInTheDocument()
    await user.selectOptions(form.getByLabelText(/^Rol/), "tripulacion")
    expect(form.queryByLabelText(STATUS)).not.toBeInTheDocument()
    await user.selectOptions(form.getByLabelText(/^Rol/), "administrador")
    expect(form.queryByLabelText(STATUS)).not.toBeInTheDocument()

    await user.selectOptions(form.getByLabelText(/^Rol/), "supervisor")
    const status = form.getByLabelText(STATUS)
    expect(optionTexts(status)).toEqual([
      "Disponible",
      "En turno",
      "Fuera de turno",
      "De licencia",
    ])
    expect(status).toHaveValue("disponible")
  })

  it("D14 al crear un supervisor se envía operational_status con el estado elegido", async () => {
    const bodies = captureBody("post", USERS_URL, () =>
      HttpResponse.json(
        { ...API_ITEMS.supervisor, status: "leave" },
        { status: 201 }
      )
    )
    const { user, form } = await openCreate()

    await fillSupervisor(user, form)
    await user.selectOptions(form.getByLabelText(STATUS), "licencia")
    await user.click(form.getByRole("button", { name: "Crear usuario" }))

    await findToast("Usuario creado")
    expect(bodies).toEqual([
      {
        name: "Camila Restrepo",
        email: "c.restrepo@delta.com",
        role: "supervisor",
        phone: "+14045550142",
        base: "JFK",
        shift: "morning",
        operational_status: "leave",
      },
    ])
  })

  it("D14 al editar, el select muestra el estado actual (off_duty → «Fuera de turno»)", async () => {
    const { form } = await openEdit("Camila Restrepo")

    expect(form.getByLabelText(STATUS)).toHaveValue("fuera_turno")
  })

  it("D14 cambiar el estado de un supervisor envía solo operational_status", async () => {
    const bodies = captureBody("patch", userUrl(UUIDS.supervisor), () =>
      HttpResponse.json({ ...API_ITEMS.supervisor, status: "on_duty" })
    )
    const { user, form } = await openEdit("Camila Restrepo")

    await user.selectOptions(form.getByLabelText(STATUS), "guardia")
    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    await findToast("Usuario actualizado")
    expect(bodies).toEqual([{ operational_status: "on_duty" }])
  })

  it("D14 editar a un tripulante no muestra el campo ni envía operational_status", async () => {
    const bodies = captureBody("patch", userUrl(UUIDS.crew), () =>
      HttpResponse.json({ ...API_ITEMS.crew, base: "MSP" })
    )
    const { user, form } = await openEdit("Diego Salcedo Pérez")

    expect(form.queryByLabelText(STATUS)).not.toBeInTheDocument()
    await user.selectOptions(form.getByLabelText(/^Base/), "MSP")
    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    await findToast("Usuario actualizado")
    expect(bodies).toEqual([{ base: "MSP" }])
  })
})

describe("Estado «vacation» del tripulante", () => {
  const VACATION_ITEM = { ...API_ITEMS.crew, status: "vacation" }

  beforeEach(() => {
    server.use(
      http.get(USER_OPTIONS_URL, () =>
        HttpResponse.json({
          ...API_USER_OPTIONS,
          crew_statuses: [
            ...API_USER_OPTIONS.crew_statuses,
            { code: "vacation", label: "Vacaciones" },
          ],
        })
      ),
      http.get(USERS_URL, () =>
        HttpResponse.json({
          items: [VACATION_ITEM],
          page: 1,
          page_size: 10,
          total: 1,
        })
      ),
      http.get(userUrl(UUIDS.crew), () => HttpResponse.json(VACATION_ITEM))
    )
  })

  it("la tabla muestra «Vacaciones» en la fila del tripulante", async () => {
    await renderUsers()

    const row = screen.getByText("Diego Salcedo Pérez").closest("tr")
    expect(row).toHaveTextContent("Vacaciones")
  })

  it("la ficha muestra «Vacaciones» como disponibilidad", async () => {
    const user = await renderUsers()

    await user.click(
      screen.getByRole("button", {
        name: "Ver más información de Diego Salcedo Pérez",
      })
    )
    const dialog = within(
      await screen.findByRole("dialog", { name: "Detalle del Usuario" })
    )

    expect(await dialog.findAllByText("Vacaciones")).not.toHaveLength(0)
  })
})
