import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Certificaciones del super admin: contenido, paginación de 5 en la URL (?page=),
// búsqueda (?q=), filtro por estado (?status=), acciones (ojo y papelera) y estados de
// carga y error. La eliminación va al final: cambia los datos simulados en memoria.

// Estos tests escriben y navegan con userEvent: con la máquina cargada (suite completa
// en paralelo) pueden pasar de los 5 s por defecto. Más margen, solo aquí.
vi.setConfig({ testTimeout: 20_000 })

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de adminCertifications.data.ts se envuelve para registrar sus llamadas y
// poder forzar errores. Sin override, delega en la función real (datos simulados).
const certificationsData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/adminCertifications/data/adminCertifications.data",
  async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return Object.fromEntries(
      Object.entries(actual).map(([name, value]) => {
        if (typeof value !== "function") return [name, value]
        const real = value as DataFn
        return [
          name,
          (...args: unknown[]) => {
            certificationsData.calls.push({ name, args })
            return (certificationsData.overrides[name] ?? real)(...args)
          },
        ]
      })
    )
  }
)

afterEach(() => {
  certificationsData.calls.length = 0
  certificationsData.overrides = {}
})

const fail = () => Promise.reject(new Error("servicio caído"))

// Último pedido de la lista: los parámetros que se enviarán al backend.
const lastListParams = () =>
  certificationsData.calls
    .filter((call) => call.name === "getCertifications")
    .at(-1)?.args[0]

const renderPage = async (search = "") => {
  const user = userEvent.setup()
  const router = renderRoute(`${PATHS.superAdmin.certificaciones}${search}`)
  await screen.findByRole("heading", { level: 1, name: "Certificaciones" })
  await screen.findByRole("table")
  return { user, router }
}

const tableRows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1)

const rowOf = (name: string) =>
  screen.getByText(name).closest("tr") as HTMLElement

const pagination = () =>
  screen.getByRole("navigation", { name: "Paginación de certificaciones" })

describe("Certificaciones (admin): contenido", () => {
  it("muestra la ruta, el título y los cuatro indicadores", async () => {
    await renderPage()

    expect(
      within(
        screen.getByRole("navigation", { name: "Ruta de navegación" })
      ).getByText("Certificaciones FAA")
    ).toHaveAttribute("aria-current", "page")
    const terms = await screen.findAllByRole("term")
    for (const [label, value] of [
      ["Tripulantes", "8"],
      ["Verificados", "4"],
      ["Por verificar", "2"],
      ["Sin certificado", "2"],
    ]) {
      const term = terms.find((element) => element.textContent === label)
      expect(term?.parentElement).toHaveTextContent(value)
    }
  })

  it("la tabla muestra 5 tripulantes con cargo, base, licencia, certificados y estado", async () => {
    await renderPage()

    expect(tableRows()).toHaveLength(5)
    const laura = rowOf("Laura Benítez")
    expect(laura).toHaveTextContent("AC-6014")
    expect(laura).toHaveTextContent("Sobrecargo")
    expect(laura).toHaveTextContent("Base SEA")
    expect(laura).toHaveTextContent("Sin registrar")
    expect(laura).toHaveTextContent("Sin certificado")

    const diego = rowOf("Diego Salcedo")
    expect(diego).toHaveTextContent("2775981")
    expect(
      within(within(diego).getByRole("list", { name: "Certificados" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["ATP", "IR", "ME"])
    expect(diego).toHaveTextContent("Verificado")
    expect(rowOf("Juan Pablo Navarro")).toHaveTextContent("Por verificar")
    expect(screen.getByText("Mostrando 5 de 8 tripulantes")).toBeInTheDocument()
  })

  it("cada fila tiene el ojo; la papelera solo si hay certificación que eliminar", async () => {
    await renderPage()

    const laura = within(rowOf("Laura Benítez"))
    expect(
      laura.getByRole("button", { name: "Ver certificación de Laura Benítez" })
    ).toBeInTheDocument()
    expect(
      laura.queryByRole("button", { name: /Eliminar/ })
    ).not.toBeInTheDocument()

    const diego = within(rowOf("Diego Salcedo"))
    expect(diego.getAllByRole("button").map((button) => button.title)).toEqual([
      "Ver certificación",
      "Eliminar certificación",
    ])
    // Sin «Registrar», «Verificar» ni lápiz en las filas.
    expect(
      within(screen.getByRole("table")).queryByRole("button", {
        name: /Registrar|Verificar|Editar/,
      })
    ).not.toBeInTheDocument()
  })
})

describe("Certificaciones (admin): paginación en la URL", () => {
  it("5 por página: la página 2 muestra los 3 restantes y la URL cambia", async () => {
    const { user, router } = await renderPage()

    expect(lastListParams()).toMatchObject({ page: 1, pageSize: 5 })
    expect(
      within(pagination())
        .getAllByRole("link", { name: /^Página/ })
        .map((link) => link.textContent)
    ).toEqual(["1", "2"])

    await user.click(
      within(pagination()).getByRole("link", { name: "Siguiente" })
    )

    await waitFor(() => expect(router.state.location.search).toBe("?page=2"))
    await waitFor(() => expect(tableRows()).toHaveLength(3))
    expect(screen.getByText("Andrés Mejía")).toBeInTheDocument()
    expect(screen.getByText("Mostrando 3 de 8 tripulantes")).toBeInTheDocument()
  })

  it("?page=99 se corrige a la última página", async () => {
    const { router } = await renderPage("?page=99")

    await waitFor(() => expect(router.state.location.search).toBe("?page=2"))
  })
})

describe("Certificaciones (admin): búsqueda y filtros en la URL", () => {
  it.each([
    { filter: "Verificados (4)", search: "?status=verificado", rows: 4 },
    { filter: "Por verificar (2)", search: "?status=por_verificar", rows: 2 },
    {
      filter: "Sin certificado (2)",
      search: "?status=sin_certificado",
      rows: 2,
    },
  ])(
    "«$filter» pone $search y filtra la tabla",
    async ({ filter, search, rows }) => {
      const { user, router } = await renderPage("?page=2")

      const button = await screen.findByRole("button", { name: filter })
      await user.click(button)

      await waitFor(() => expect(router.state.location.search).toBe(search))
      expect(button).toHaveAttribute("aria-pressed", "true")
      await waitFor(() => expect(tableRows()).toHaveLength(rows))
    }
  )

  it.each([
    { text: "benitez", name: "Laura Benítez" },
    { text: "AC-3871", name: "Andrés Mejía" },
    { text: "2775981", name: "Diego Salcedo" },
  ])(
    "buscar «$text» (nombre, ID o licencia) encuentra a $name",
    async ({ text, name }) => {
      const { user, router } = await renderPage()

      await user.type(
        screen.getByRole("searchbox", { name: "Buscar certificación" }),
        text
      )

      await waitFor(() =>
        expect(router.state.location.search).toBe(
          `?q=${encodeURIComponent(text)}`
        )
      )
      await waitFor(() => expect(tableRows()).toHaveLength(1))
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  )

  it("si nada coincide, avisa en vez de mostrar una tabla vacía", async () => {
    const { user } = await renderPage()

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar certificación" }),
      "zzz"
    )

    expect(
      await screen.findByText("Ninguna certificación coincide con «zzz».")
    ).toBeInTheDocument()
  })
})

describe("Certificaciones (admin): estados de datos", () => {
  it("si falla la lista, la tabla muestra el error y los indicadores siguen", async () => {
    certificationsData.overrides.getCertifications = fail
    renderRoute(PATHS.superAdmin.certificaciones)

    expect(
      await screen.findByText("No se pudieron cargar las certificaciones.")
    ).toHaveAttribute("role", "alert")
    expect(await screen.findByText("Tripulantes")).toBeInTheDocument()
  })

  it("si fallan los indicadores, la tabla sigue y los filtros salen sin conteo", async () => {
    certificationsData.overrides.getCertificationsStats = fail
    await renderPage()

    expect(
      await screen.findByText("No se pudieron cargar los indicadores.")
    ).toHaveAttribute("role", "alert")
    expect(
      screen.getByRole("button", { name: "Verificados" })
    ).toBeInTheDocument()
    expect(tableRows()).toHaveLength(5)
  })
})

describe("Certificaciones (admin): eliminar certificación", () => {
  it("la papelera pide confirmación; «Cancelar» cierra sin eliminar", async () => {
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", {
        name: "Eliminar la certificación de Diego Salcedo",
      })
    )
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Desea eliminar la certificación de Diego Salcedo?",
    })
    expect(dialog).toHaveAccessibleDescription(
      "Esta acción no se podrá deshacer."
    )
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(rowOf("Diego Salcedo")).toHaveTextContent("Verificado")
  })

  // Último del archivo: la certificación de Diego queda eliminada en memoria.
  it("«Eliminar» deja al tripulante «Sin certificado» y actualiza los conteos", async () => {
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", {
        name: "Eliminar la certificación de Diego Salcedo",
      })
    )
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }))

    const toast = await findToast("Certificación eliminada")
    expect(toast).toHaveTextContent("Diego Salcedo quedó sin certificado.")
    expect(
      certificationsData.calls.find(
        (call) => call.name === "deleteCertification"
      )?.args
    ).toEqual(["AC-1108"])
    await waitFor(() =>
      expect(rowOf("Diego Salcedo")).toHaveTextContent("Sin certificado")
    )
    expect(rowOf("Diego Salcedo")).toHaveTextContent("Sin registrar")
    expect(
      await screen.findByRole("button", { name: "Verificados (3)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sin certificado (3)" })
    ).toBeInTheDocument()
  })
})
