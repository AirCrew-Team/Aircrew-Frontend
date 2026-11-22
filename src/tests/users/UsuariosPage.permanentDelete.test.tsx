import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { createGate } from "../mocks/passwordResetApi"
import { REAL_ACCOUNTS, REAL_USERS } from "../mocks/profileApi"
import {
  API_ITEMS,
  API_STATS,
  USERS_STATS_URL,
  USERS_URL,
  userUrl,
  usersHandlers,
  UUIDS,
} from "../mocks/usersApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// EU-09 (docs/specs/eliminar-usuarios.md), sesión real de super_admin. Cada fila tiene
// «Desactivar» (DELETE /users/:id, como hoy) y «Eliminar» (DELETE /users/:id/permanent),
// que pide confirmación en un diálogo propio:
// - texto de que es permanente y de qué se borra; si es tripulante, que sus vuelos futuros
//   quedan vacantes para el supervisor;
// - éxito: toast «Usuario eliminado.», se cierra y se recargan la lista y los indicadores;
// - 409 (él mismo, último super_admin): el texto del backend dentro del diálogo;
// - 502, otro 5xx o error de red: «No se pudo eliminar el usuario. Intenta de nuevo.» y
//   el diálogo sigue abierto;
// - nadie puede eliminarse a sí mismo: en su fila «Eliminar» está deshabilitado con la
//   explicación.

vi.setConfig({ testTimeout: 20_000 })

const permanentUrl = (id: string) => `${userUrl(id)}/permanent`
const GENERIC_ERROR = "No se pudo eliminar el usuario. Intenta de nuevo."
const CREW = "Diego Salcedo Pérez"

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

const rowOf = (name: string) =>
  screen.getByText(name).closest("tr") as HTMLElement

const openDelete = async (name: string) => {
  const user = await renderUsers()
  await user.click(screen.getByRole("button", { name: `Eliminar a ${name}` }))
  const dialog = await screen.findByRole("dialog", {
    name: `¿Eliminar a ${name}?`,
  })
  return { user, dialog }
}

const confirm = (
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement
) =>
  user.click(
    within(dialog).getByRole("button", { name: "Eliminar definitivamente" })
  )

// DELETE /permanent: responde con `reply` y cuenta las llamadas.
const mockPermanentDelete = (id: string, reply: () => Response) => {
  const calls = { count: 0 }
  server.use(
    http.delete(permanentUrl(id), () => {
      calls.count += 1
      return reply()
    })
  )
  return calls
}

describe("Usuarios (sesión real): acciones «Desactivar» y «Eliminar»", () => {
  it("EU-09 cada fila tiene «Desactivar» y «Eliminar»; inactivos y pendientes también se pueden eliminar", async () => {
    await renderUsers()

    for (const name of [CREW, "Camila Restrepo", "Laura Gómez"]) {
      expect(
        within(rowOf(name)).getByRole("button", {
          name: `Desactivar a ${name}`,
        })
      ).toBeEnabled()
    }
    for (const name of [
      CREW,
      "Camila Restrepo",
      "Mateo Morales",
      "Laura Gómez",
    ]) {
      const erase = within(rowOf(name)).getByRole("button", {
        name: `Eliminar a ${name}`,
      })
      expect(erase).toBeEnabled()
      expect(erase).not.toHaveAttribute("aria-disabled")
    }
    // Mateo está inactivo: no se vuelve a desactivar, pero sí se puede eliminar.
    expect(
      screen.getByRole("button", { name: "Desactivar a Mateo Morales" })
    ).toBeDisabled()
  })

  it("EU-05 en la fila propia «Eliminar» está deshabilitado con la explicación y no abre nada", async () => {
    const self = {
      ...API_ITEMS.admin,
      id: REAL_USERS.admin.id,
      name: REAL_ACCOUNTS.admin.name,
      email: REAL_ACCOUNTS.admin.email,
      is_active: true,
    }
    server.use(
      http.get(USERS_URL, () =>
        HttpResponse.json({
          items: [self, API_ITEMS.crew],
          page: 1,
          page_size: 5,
          total: 2,
        })
      )
    )
    const user = await renderUsers()

    const own = screen.getByRole("button", {
      name: `Eliminar a ${REAL_ACCOUNTS.admin.name}`,
    })
    expect(own).toHaveAttribute("aria-disabled", "true")
    expect(own).toHaveAccessibleDescription(
      "No puedes eliminar tu propia cuenta."
    )
    await user.click(own)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    // Los demás sí.
    expect(
      screen.getByRole("button", { name: `Eliminar a ${CREW}` })
    ).not.toHaveAttribute("aria-disabled")
  })
})

describe("Usuarios (sesión real): confirmación de «Eliminar»", () => {
  it("EU-09 un tripulante: dice que es permanente, qué se borra y que sus vuelos futuros quedan vacantes", async () => {
    const { dialog } = await openDelete(CREW)

    expect(dialog).toHaveAccessibleDescription(
      "Esta acción es permanente y no se puede deshacer."
    )
    expect(dialog).toHaveTextContent(
      "Se borrarán la cuenta, el correo, la foto y las notificaciones"
    )
    expect(dialog).toHaveTextContent(
      "el perfil de tripulante, las certificaciones, las ausencias"
    )
    expect(dialog).toHaveTextContent(
      "Sus vuelos futuros quedarán con el puesto vacante para que el supervisor lo cubra."
    )
    const erase = within(dialog).getByRole("button", {
      name: "Eliminar definitivamente",
    })
    expect(erase).toBeEnabled()
    // Foco inicial en la opción que no borra nada.
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" })
    ).toHaveFocus()
  })

  it("EU-09 un supervisor: sin el aviso de los vuelos", async () => {
    const { dialog } = await openDelete("Camila Restrepo")

    expect(dialog).toHaveTextContent(
      "Se borrarán la cuenta, el correo, la foto y las notificaciones"
    )
    expect(dialog).not.toHaveTextContent("vuelos futuros")
    expect(dialog).not.toHaveTextContent("certificaciones")
  })

  it("«Cancelar» cierra sin llamar al backend", async () => {
    const calls = mockPermanentDelete(UUIDS.crew, () =>
      HttpResponse.json({ id: UUIDS.crew, vacated_flights: [] })
    )
    const { user, dialog } = await openDelete(CREW)

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(calls.count).toBe(0)
    expect(rowOf(CREW)).toBeInTheDocument()
  })

  it("EU-09 al eliminar: DELETE /permanent por el UUID, toast, se cierra, la lista y los indicadores se recargan y el foco pasa al contenido", async () => {
    let deleted = false
    let statsRequests = 0
    const calls = mockPermanentDelete(UUIDS.crew, () => {
      deleted = true
      // En un reintento la lista llega vacía: la pantalla no depende de ella.
      return HttpResponse.json({ id: UUIDS.crew, vacated_flights: [] })
    })
    server.use(
      http.get(USERS_URL, () => {
        const items = Object.values(API_ITEMS).filter(
          (item) => !deleted || item.id !== UUIDS.crew
        )
        return HttpResponse.json({
          items,
          page: 1,
          page_size: 5,
          total: items.length,
        })
      }),
      http.get(USERS_STATS_URL, () => {
        statsRequests += 1
        return HttpResponse.json(
          deleted
            ? {
                ...API_STATS,
                total: 3,
                by_role: { ...API_STATS.by_role, crew: 1 },
              }
            : API_STATS
        )
      })
    )
    const { user, dialog } = await openDelete(CREW)
    await screen.findByRole("button", { name: "Todos (4)" })
    const statsBefore = statsRequests

    await confirm(user, dialog)

    await findToast("Usuario eliminado.")
    expect(calls.count).toBe(1)
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(screen.queryByText(CREW)).not.toBeInTheDocument()
    )
    expect(statsRequests).toBeGreaterThan(statsBefore)
    expect(
      await screen.findByRole("button", { name: "Todos (3)" })
    ).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveFocus()
  })

  it("mientras elimina, los botones quedan con aria-disabled y ni la X ni «Cancelar» cierran", async () => {
    const { gate, release } = createGate()
    server.use(
      http.delete(permanentUrl(UUIDS.crew), async () => {
        await gate
        return HttpResponse.json({ id: UUIDS.crew, vacated_flights: [] })
      })
    )
    const { user, dialog } = await openDelete(CREW)

    await confirm(user, dialog)

    const busy = await within(dialog).findByRole("button", {
      name: "Eliminando…",
    })
    expect(busy).toHaveAttribute("aria-disabled", "true")
    expect(busy).toHaveFocus()
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" })
    expect(cancel).toHaveAttribute("aria-disabled", "true")
    // La X (y Esc, que jsdom no simula en <dialog>) pasan por el mismo cierre.
    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar ventana" })
    )
    await user.click(cancel)
    expect(
      screen.getByRole("dialog", { name: `¿Eliminar a ${CREW}?` })
    ).toBeVisible()

    release()
    await findToast("Usuario eliminado.")
  })

  // Las ventanas de edición y de detalle siguen observando la ficha ya cerradas: recargar
  // la del eliminado daría 404. Los catálogos no cambian al eliminar.
  it("al eliminar no vuelve a pedir la ficha del eliminado ni los catálogos", async () => {
    mockPermanentDelete(UUIDS.crew, () =>
      HttpResponse.json({ id: UUIDS.crew, vacated_flights: [] })
    )
    const user = await renderUsers()
    await user.click(screen.getByRole("button", { name: `Editar a ${CREW}` }))
    const edit = await screen.findByRole("dialog", { name: "Editar usuario" })
    await within(edit).findByRole("button", { name: "Guardar cambios" })
    await user.click(
      within(edit).getByRole("button", { name: "Cerrar edición de usuario" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    const requests = recordRequests()

    await user.click(screen.getByRole("button", { name: `Eliminar a ${CREW}` }))
    const dialog = await screen.findByRole("dialog", {
      name: `¿Eliminar a ${CREW}?`,
    })
    await confirm(user, dialog)
    await findToast("Usuario eliminado.")
    await waitFor(() => expect(requests).toContain(`GET ${USERS_STATS_URL}`))
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(requests).not.toContain(`GET ${userUrl(UUIDS.crew)}`)
    expect(requests.filter((r) => r.includes("/catalogs/"))).toEqual([])
  })

  it("EU-07 «Desactivar» sigue usando DELETE /users/:id, no /permanent", async () => {
    const permanent = mockPermanentDelete(UUIDS.crew, () =>
      HttpResponse.json({ id: UUIDS.crew, vacated_flights: [] })
    )
    let deactivated = 0
    server.use(
      http.delete(userUrl(UUIDS.crew), () => {
        deactivated += 1
        return HttpResponse.json({ ...API_ITEMS.crew, is_active: false })
      })
    )
    const user = await renderUsers()

    await user.click(
      screen.getByRole("button", { name: `Desactivar a ${CREW}` })
    )
    const dialog = within(await screen.findByRole("alertdialog"))
    await user.click(dialog.getByRole("button", { name: "Desactivar" }))

    await findToast("Usuario desactivado")
    expect(deactivated).toBe(1)
    expect(permanent.count).toBe(0)
  })

  it.each([
    {
      code: "cannot_delete_self",
      message: "No puedes eliminar tu propia cuenta.",
    },
    {
      code: "last_super_admin",
      message: "No se puede eliminar al último super_admin.",
    },
  ])(
    "EU-05 un 409 $code muestra el texto del backend dentro del diálogo",
    async ({ code, message }) => {
      mockPermanentDelete(UUIDS.crew, () =>
        HttpResponse.json({ error: message, code }, { status: 409 })
      )
      const { user, dialog } = await openDelete(CREW)

      await confirm(user, dialog)

      expect(await within(dialog).findByText(message)).toHaveAttribute(
        "role",
        "alert"
      )
      expect(dialog).toBeVisible()
      expect(rowOf(CREW)).toBeInTheDocument()
    }
  )

  it.each([
    {
      label: "502 user_delete_incomplete",
      reply: () =>
        HttpResponse.json(
          {
            error:
              "No se pudo completar el borrado. La cuenta sigue existiendo; vuelve a intentarlo.",
            code: "user_delete_incomplete",
          },
          { status: 502 }
        ),
    },
    {
      label: "500",
      reply: () => HttpResponse.json({ error: "caído" }, { status: 500 }),
    },
    { label: "error de red", reply: () => HttpResponse.error() },
  ])(
    "EU-06 un $label muestra el aviso genérico y el diálogo sigue abierto",
    async ({ reply }) => {
      mockPermanentDelete(UUIDS.crew, reply)
      const { user, dialog } = await openDelete(CREW)

      await confirm(user, dialog)

      expect(await within(dialog).findByText(GENERIC_ERROR)).toHaveAttribute(
        "role",
        "alert"
      )
      expect(
        screen.getByRole("dialog", { name: `¿Eliminar a ${CREW}?` })
      ).toBeVisible()
      // Se puede reintentar.
      expect(
        within(dialog).getByRole("button", { name: "Eliminar definitivamente" })
      ).toBeEnabled()
    }
  )

  it("tras un error, cerrar y abrir otro usuario no arrastra el aviso", async () => {
    mockPermanentDelete(UUIDS.crew, () => HttpResponse.error())
    const { user, dialog } = await openDelete(CREW)
    await confirm(user, dialog)
    await within(dialog).findByText(GENERIC_ERROR)

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await user.click(
      screen.getByRole("button", { name: "Eliminar a Camila Restrepo" })
    )
    const next = await screen.findByRole("dialog", {
      name: "¿Eliminar a Camila Restrepo?",
    })

    expect(within(next).queryByRole("alert")).not.toBeInTheDocument()
  })
})
