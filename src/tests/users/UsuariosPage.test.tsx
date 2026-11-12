import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Usuarios del super admin: contenido, paginación en la URL (?page=), búsqueda (?q=),
// filtro por rol (?role=), acciones pendientes y estados de carga y error.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de users.data.ts se envuelve para registrar sus llamadas y poder forzar
// errores. Sin override, delega en la función real (datos simulados de la referencia).
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

// Último pedido de la lista: los parámetros que se enviarán al backend.
const lastListParams = () =>
  usersData.calls.filter((call) => call.name === "getUsers").at(-1)?.args[0]

const renderUsers = async (search = "") => {
  const router = renderRoute(`${PATHS.superAdmin.usuarios}${search}`)
  await screen.findByRole("heading", { level: 1, name: "Usuarios" })
  await screen.findByRole("table")
  return router
}

const pagination = () =>
  screen.getByRole("navigation", { name: "Paginación de usuarios" })

// «Anterior» o «Siguiente»: el texto va en un span interno (en celular se ve la flecha);
// el enlace o el elemento deshabilitado es su contenedor.
const edgeItem = (label: string) =>
  within(pagination()).getByText(label).parentElement

const currentPage = () =>
  within(pagination())
    .getAllByRole("link")
    .find((link) => link.getAttribute("aria-current") === "page")

describe("Usuarios: contenido", () => {
  it("muestra la ruta de navegación, el título y los indicadores", async () => {
    await renderUsers()

    const breadcrumb = screen.getByRole("navigation", {
      name: "Ruta de navegación",
    })
    expect(
      within(breadcrumb).getByText("Directorio de personal")
    ).toHaveAttribute("aria-current", "page")
    // Solo las etiquetas (dt) de los indicadores: «En vuelo» también es un estado de la tabla.
    const terms = await screen.findAllByRole("term")
    for (const [label, value] of [
      ["Total dotación", "184"],
      ["En vuelo", "38"],
      ["En guardia", "24"],
      ["Aptitud médica", "96%"],
    ]) {
      const term = terms.find((element) => element.textContent === label)
      expect(term?.parentElement).toHaveTextContent(value)
    }
  })

  it("la tabla muestra los 5 usuarios con su ID, rol, base y estado", async () => {
    await renderUsers()

    const rows = within(screen.getByRole("table")).getAllByRole("row")
    // 1 fila de encabezado + 5 usuarios.
    expect(rows).toHaveLength(6)
    expect(rows[1]).toHaveTextContent("Diego Salcedo")
    expect(rows[1]).toHaveTextContent("AC-1108")
    expect(rows[1]).toHaveTextContent("Comandante")
    expect(rows[1]).toHaveTextContent("ATL")
    expect(rows[1]).toHaveTextContent("Disponible")
    expect(rows[4]).toHaveTextContent("Permiso médico")
    expect(
      screen.getByText("Mostrando 5 de 184 miembros registrados")
    ).toBeInTheDocument()
  })
})

describe("Usuarios: paginación en la URL", () => {
  it("sin ?page= está en la página 1, «Anterior» deshabilitado y muestra 1 2 3 … 37", async () => {
    await renderUsers()

    expect(currentPage()).toHaveTextContent("1")
    expect(edgeItem("Anterior")).toHaveAttribute("aria-disabled", "true")
    const numbers = within(pagination())
      .getAllByRole("link", { name: /^Página/ })
      .map((link) => link.textContent)
    expect(numbers).toEqual(["1", "2", "3", "37"])
    expect(lastListParams()).toMatchObject({ page: 1, pageSize: 5 })
  })

  it("«Siguiente», un número y «Anterior» cambian ?page= y la consulta", async () => {
    const user = userEvent.setup()
    const router = await renderUsers()

    await user.click(
      within(pagination()).getByRole("link", { name: "Siguiente" })
    )
    await waitFor(() => expect(router.state.location.search).toBe("?page=2"))
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 2 }))

    await user.click(
      within(pagination()).getByRole("link", { name: "Página 3" })
    )
    await waitFor(() => expect(router.state.location.search).toBe("?page=3"))
    expect(currentPage()).toHaveTextContent("3")

    await user.click(
      within(pagination()).getByRole("link", { name: "Anterior" })
    )
    await waitFor(() => expect(router.state.location.search).toBe("?page=2"))
  })

  it("en celular la paginación cabe en una línea: flechas y solo primera, actual y última", async () => {
    await renderUsers("?page=10")

    // Escritorio: 1 … 9 10 11 … 37. En celular se ocultan 9 y 11 (max-sm:hidden).
    const links = within(pagination()).getAllByRole("link", { name: /^Página/ })
    expect(links.map((link) => link.textContent)).toEqual([
      "1",
      "9",
      "10",
      "11",
      "37",
    ])
    const hiddenOnMobile = links
      .filter((link) => link.closest("li")?.classList.contains("max-sm:hidden"))
      .map((link) => link.textContent)
    expect(hiddenOnMobile).toEqual(["9", "11"])

    // «Anterior» y «Siguiente» conservan su nombre; en celular se ve la flecha.
    expect(edgeItem("Anterior")).toHaveTextContent("‹")
    expect(edgeItem("Siguiente")).toHaveTextContent("›")
    expect(
      within(pagination()).getByRole("link", { name: "Siguiente" })
    ).toBeInTheDocument()
    // Todo en una sola fila.
    expect(within(pagination()).getByRole("list")).toHaveClass("flex-nowrap")
  })

  it("en la última página «Siguiente» queda deshabilitado", async () => {
    await renderUsers("?page=37")

    expect(currentPage()).toHaveTextContent("37")
    expect(edgeItem("Siguiente")).toHaveAttribute("aria-disabled", "true")
  })

  it("?page=abc se lee como la página 1", async () => {
    await renderUsers("?page=abc")

    expect(currentPage()).toHaveTextContent("1")
    expect(lastListParams()).toMatchObject({ page: 1 })
  })

  it("?page=99 se corrige a la última página (37)", async () => {
    const router = await renderUsers("?page=99")

    await waitFor(() => expect(router.state.location.search).toBe("?page=37"))
    expect(currentPage()).toHaveTextContent("37")
  })
})

describe("Usuarios: búsqueda y filtros en la URL", () => {
  it("un filtro de rol pone ?role= y vuelve a la página 1", async () => {
    const user = userEvent.setup()
    const router = await renderUsers("?page=3")

    const crew = await screen.findByRole("button", {
      name: "Tripulación (158)",
    })
    await user.click(crew)

    await waitFor(() =>
      expect(router.state.location.search).toBe("?role=tripulacion")
    )
    expect(crew).toHaveAttribute("aria-pressed", "true")
    await waitFor(() =>
      expect(lastListParams()).toMatchObject({ page: 1, role: "tripulacion" })
    )

    await user.click(screen.getByRole("button", { name: "Todos (184)" }))
    await waitFor(() => expect(router.state.location.search).toBe(""))
  })

  it.each([
    {
      filter: "Tripulación (158)",
      search: "?role=tripulacion",
      names: ["Diego Salcedo", "Valeria Ortiz", "Juan Pablo Navarro"],
      total: 158,
    },
    {
      filter: "Supervisores (20)",
      search: "?role=supervisor",
      names: ["Camila Restrepo"],
      total: 20,
    },
    {
      filter: "Administradores (6)",
      search: "?role=administrador",
      names: ["Mateo Morales"],
      total: 6,
    },
  ])(
    "«$filter» pone $search y la tabla muestra solo esos usuarios",
    async ({ filter, search, names, total }) => {
      const user = userEvent.setup()
      const router = await renderUsers()

      await user.click(await screen.findByRole("button", { name: filter }))

      await waitFor(() => expect(router.state.location.search).toBe(search))
      await waitFor(() =>
        expect(
          within(screen.getByRole("table")).getAllByRole("row")
        ).toHaveLength(names.length + 1)
      )
      for (const name of names) {
        expect(screen.getByText(name)).toBeInTheDocument()
      }
      expect(
        screen.getByText(
          `Mostrando ${names.length} de ${total} miembros registrados`
        )
      ).toBeInTheDocument()
    }
  )

  it("al abrir ?role=supervisor la tabla ya viene filtrada", async () => {
    await renderUsers("?role=supervisor")

    expect(
      screen.getByRole("button", { name: "Supervisores (20)" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2
    )
  })

  it("la búsqueda pone ?q= y llega a la consulta tras dejar de escribir", async () => {
    const user = userEvent.setup()
    const router = await renderUsers("?page=2")

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar usuario" }),
      "diego"
    )

    await waitFor(() => expect(router.state.location.search).toBe("?q=diego"))
    await waitFor(() =>
      expect(lastListParams()).toMatchObject({ page: 1, search: "diego" })
    )
  })

  it.each([
    { text: "valeria", names: ["Valeria Ortiz"] },
    { text: "VALÉRIA", names: ["Valeria Ortiz"] },
    { text: "AC-1108", names: ["Diego Salcedo"] },
    {
      text: "atl",
      names: ["Diego Salcedo", "Mateo Morales"],
    },
    { text: "auxiliar", names: ["Valeria Ortiz"] },
  ])(
    "buscar «$text» muestra solo los usuarios que coinciden",
    async ({ text, names }) => {
      const user = userEvent.setup()
      const router = await renderUsers()

      await user.type(
        screen.getByRole("searchbox", { name: "Buscar usuario" }),
        text
      )

      await waitFor(() =>
        expect(router.state.location.search).toBe(
          `?q=${encodeURIComponent(text)}`
        )
      )
      await waitFor(() =>
        expect(
          within(screen.getByRole("table")).getAllByRole("row")
        ).toHaveLength(names.length + 1)
      )
      for (const name of names) {
        expect(screen.getByText(name)).toBeInTheDocument()
      }
      expect(
        screen.getByText(
          `Mostrando ${names.length} de ${names.length} miembros registrados`
        )
      ).toBeInTheDocument()
    }
  )

  it("al abrir ?q=camila la tabla ya viene filtrada y el buscador tiene el texto", async () => {
    await renderUsers("?q=camila")

    expect(
      screen.getByRole("searchbox", { name: "Buscar usuario" })
    ).toHaveValue("camila")
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getAllByRole("row")
      ).toHaveLength(2)
    )
  })

  it("búsqueda y rol se combinan en la URL y en la tabla", async () => {
    await renderUsers("?role=tripulacion&q=juan")

    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getAllByRole("row")
      ).toHaveLength(2)
    )
    expect(screen.getByText("Juan Pablo Navarro")).toBeInTheDocument()
  })

  it("si nada coincide, avisa sin romper la pantalla", async () => {
    const user = userEvent.setup()
    await renderUsers()

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar usuario" }),
      "zzz"
    )

    expect(
      await screen.findByText("Ningún usuario coincide con «zzz».")
    ).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("Ctrl+K lleva el foco al buscador", async () => {
    const user = userEvent.setup()
    await renderUsers()

    await user.keyboard("{Control>}k{/Control}")

    expect(
      screen.getByRole("searchbox", { name: "Buscar usuario" })
    ).toHaveFocus()
  })
})

describe("Usuarios: ventana Detalle del Usuario", () => {
  const openDetail = async (name: string) => {
    const user = userEvent.setup()
    await renderUsers()
    const trigger = screen.getByRole("button", {
      name: `Ver más información de ${name}`,
    })
    await user.click(trigger)
    const dialog = await screen.findByRole("dialog", {
      name: "Detalle del Usuario",
    })
    return { user, trigger, dialog }
  }

  it("«Ver más información» abre la ficha de ese usuario y la pide por su ID", async () => {
    const { dialog } = await openDetail("Diego Salcedo")

    expect(
      await within(dialog).findByText("FAA ATP #1108-US")
    ).toBeInTheDocument()
    for (const text of [
      "Diego Salcedo",
      "AC-1108",
      "Comandante · Base ATL / Atlanta",
      "d.salcedo@aircrew-ops.com",
      "Turno Activo: Bloque EST (UTC-5)",
      "8,450 hrs",
      "Límite anual seguro (84.5%)",
      "18h 30m",
      "Excede mínimo exigido (10h)",
      "Inmediata",
      "Licencia FAA",
      "Airline Transport Pilot (ATP)",
      "Instrument Rating (IR)",
      "Multi-Engine (ME)",
      "+1 404 555 0142",
      "Certificación Type Rating Habilitada",
      "CAT IIIb Autoland",
    ]) {
      expect(within(dialog).getByText(text)).toBeInTheDocument()
    }
    expect(
      usersData.calls.filter((call) => call.name === "getUserDetail").at(-1)
        ?.args
    ).toEqual(["AC-1108"])
  })

  it("la ficha ya no muestra certificado médico", async () => {
    const { dialog } = await openDetail("Diego Salcedo")

    await within(dialog).findByText("FAA ATP #1108-US")
    expect(within(dialog).queryByText(/médico/i)).not.toBeInTheDocument()
  })

  it.each(["Camila Restrepo", "Mateo Morales"])(
    "%s (supervisor o administrador) no tiene horas de vuelo, descanso ni licencia",
    async (name) => {
      const { dialog } = await openDetail(name)

      expect(
        await within(dialog).findByRole("heading", {
          name: "Contacto operativo",
        })
      ).toBeInTheDocument()
      for (const text of [
        "Horas de vuelo",
        "Descanso reglamentario",
        "Número de licencia",
        "Certificados",
      ]) {
        expect(within(dialog).queryByText(text)).not.toBeInTheDocument()
      }
      expect(
        within(dialog).getByText("Disponibilidad operacional")
      ).toBeInTheDocument()
    }
  )

  it("cada usuario muestra su propia ficha", async () => {
    const { dialog } = await openDetail("Valeria Ortiz")

    expect(
      await within(dialog).findByText("FAA CDP #5520-US")
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Permiso médico")).toBeInTheDocument()
    expect(within(dialog).getByText("No disponible")).toBeInTheDocument()
  })

  it("el pie solo tiene «Descargar Ficha PDF», aún sin función", async () => {
    const { dialog } = await openDetail("Diego Salcedo")

    expect(
      within(dialog).getByRole("button", { name: "Descargar Ficha PDF" })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      within(dialog).queryByRole("button", { name: /Cerrar Vista/ })
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: /Editar Información/ })
    ).not.toBeInTheDocument()
  })

  it("la X cierra la ventana y el foco vuelve a «Ver más información»", async () => {
    const { user, trigger, dialog } = await openDetail("Diego Salcedo")

    await user.click(
      within(dialog).getByRole("button", { name: "Cerrar detalle del usuario" })
    )

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("Esc cierra la ventana", async () => {
    const { user } = await openDetail("Mateo Morales")

    await user.keyboard("{Escape}")

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })

  it("si falla la ficha, la ventana muestra el error", async () => {
    usersData.overrides.getUserDetail = fail
    const { dialog } = await openDetail("Camila Restrepo")

    expect(
      await within(dialog).findByText(
        "No se pudo cargar el detalle del usuario."
      )
    ).toHaveAttribute("role", "alert")
  })
})

describe("Usuarios: estados de datos", () => {
  it("si falla la lista, la tabla muestra el error y los indicadores siguen", async () => {
    usersData.overrides.getUsers = fail
    renderRoute(PATHS.superAdmin.usuarios)

    expect(
      await screen.findByText("No se pudieron cargar los usuarios.")
    ).toHaveAttribute("role", "alert")
    expect(await screen.findByText("Total dotación")).toBeInTheDocument()
  })

  it("si fallan los indicadores, la tabla sigue y los filtros salen sin conteo", async () => {
    usersData.overrides.getUsersStats = fail
    await renderUsers()

    expect(
      await screen.findByText("No se pudieron cargar los indicadores.")
    ).toHaveAttribute("role", "alert")
    expect(
      screen.getByRole("button", { name: "Tripulación" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(6)
  })
})
