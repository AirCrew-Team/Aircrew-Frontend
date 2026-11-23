import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { recordRequests } from "../mocks/absencesApi"
import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// EU-09 con la cuenta demo: «Eliminar» se simula sobre los datos de ejemplo (sin
// backend) y la lista y los conteos se recargan. Archivo propio porque eliminar cambia
// los datos simulados en memoria: el test que elimina va al final.
// Revisión final: Usuarios con la cuenta demo no hace ninguna petición, tampoco al
// eliminar (se escuchan las peticiones: server.ts responde en cero los indicadores).

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

const NAME = "Juan Pablo Navarro"

const openDelete = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superAdmin.usuarios)
  await screen.findByRole("table")
  await user.click(screen.getByRole("button", { name: `Eliminar a ${NAME}` }))
  const dialog = await screen.findByRole("dialog", {
    name: `¿Eliminar a ${NAME}?`,
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

describe("Usuarios (cuenta demo): eliminar", () => {
  it("cada fila tiene ojo, lápiz, «Desactivar» y «Eliminar»", async () => {
    renderRoute(PATHS.superAdmin.usuarios)
    await screen.findByRole("table")
    const row = screen.getByText(NAME).closest("tr") as HTMLElement

    expect(
      within(row)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"))
    ).toEqual([
      `Ver más información de ${NAME}`,
      `Editar a ${NAME}`,
      `Desactivar a ${NAME}`,
      `Eliminar a ${NAME}`,
    ])
  })

  it("si la simulación falla, avisa dentro del diálogo y el usuario sigue en la lista", async () => {
    usersData.overrides.deleteUserPermanently = () =>
      Promise.reject(new Error("servicio caído"))
    const { user, dialog } = await openDelete()

    await confirm(user, dialog)

    expect(
      await within(dialog).findByText(
        "No se pudo eliminar el usuario. Intenta de nuevo."
      )
    ).toHaveAttribute("role", "alert")
    expect(screen.getByText(NAME)).toBeInTheDocument()
  })

  // Último del archivo: Juan Pablo queda eliminado en memoria.
  it("EU-09 elimina de los datos de ejemplo, avisa, recarga la lista y los conteos, sin peticiones", async () => {
    const requests = recordRequests()
    const { user, dialog } = await openDelete()
    expect(dialog).toHaveTextContent(
      "Sus vuelos futuros quedarán con el puesto vacante para que el supervisor lo cubra."
    )
    expect(
      await screen.findByRole("button", { name: "Tripulación (158)" })
    ).toBeInTheDocument()

    await confirm(user, dialog)

    await findToast("Usuario eliminado.")
    expect(
      usersData.calls.find((call) => call.name === "deleteUserPermanently")
        ?.args
    ).toEqual(["AC-2287"])
    await waitFor(() =>
      expect(screen.queryByText(NAME)).not.toBeInTheDocument()
    )
    expect(
      await screen.findByRole("button", { name: "Tripulación (157)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Todos (183)" })
    ).toBeInTheDocument()
    expect(requests).toEqual([])
  })
})
