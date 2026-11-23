import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Vuelos del super admin con la cuenta demo: los datos de ejemplo son 8 vuelos alrededor
// de hoy (hora de Nueva York). Aquí no se crea nada: los tests que guardan van en
// VuelosPage.form.test.tsx.

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

const renderPage = async (search = "") => {
  const user = userEvent.setup()
  const router = renderRoute(`${PATHS.superAdmin.vuelos}${search}`)
  await screen.findByRole("table")
  return { user, router }
}

const rowOf = (flightNumber: string) =>
  screen.getByText(flightNumber).closest("tr") as HTMLElement

const flightNumbers = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    // El primer texto visible de la fila (sin la etiqueta móvil) es el número de vuelo.
    .map((row) => row.querySelector("td span:not([aria-hidden])")?.textContent)

describe("Vuelos (admin): contenido", () => {
  it("muestra la ruta, el título y los cuatro indicadores", async () => {
    await renderPage()

    expect(
      screen.getByRole("heading", { level: 1, name: "Vuelos" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("navigation", { name: "Ruta de navegación" })
    ).toHaveTextContent("Programación de vuelos")

    const stats = await screen.findByText("Total vuelos")
    const list = stats.closest("dl") as HTMLElement
    const value = (label: string) =>
      within(list).getByText(label).parentElement?.querySelector("dd")
        ?.textContent
    expect(value("Total vuelos")).toBe("8")
    expect(value("Hoy")).toBe("4")
    expect(value("Sin tripulación")).toBe("4")
    expect(value("Retrasados")).toBe("1")
  })

  it("la tabla muestra 5 vuelos por salida, con ruta, hora local, aeronave, tripulación y estado", async () => {
    await renderPage()

    expect(flightNumbers()).toEqual([
      "DL1180",
      "DL2201",
      "DL2207",
      "DL0418",
      "DL0030",
    ])
    const row = rowOf("DL2201")
    expect(row).toHaveTextContent("Puerta A3")
    expect(row).toHaveTextContent("ATL")
    expect(row).toHaveTextContent("Atlanta → Boston")
    expect(row).toHaveTextContent("06:10 → 08:40")
    expect(row).toHaveTextContent("2 h 30 min · Nacional")
    expect(row).toHaveTextContent("Airbus A321neo")
    expect(row).toHaveTextContent("N391DN")
    expect(row).toHaveTextContent("Confirmada")
    expect(row).toHaveTextContent("Completado")

    expect(rowOf("DL0030")).toHaveTextContent("8 h 45 min · Internacional")
    expect(rowOf("DL1180")).toHaveTextContent("Sin puerta")
    expect(screen.getByText("Mostrando 5 de 8 vuelos")).toBeInTheDocument()
  })

  it("la ruta se lee «de … a …» y la flecha es decorativa", async () => {
    await renderPage()
    // El «De» solo para el lector de pantalla está dentro de la línea de la ruta.
    const route = rowOf("DL2201").querySelector(".sr-only")
      ?.parentElement as HTMLElement

    expect(route).toHaveTextContent("De ATL a BOS")
    expect(route.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("la página 2 muestra los 3 restantes y la URL cambia", async () => {
    const { user, router } = await renderPage()

    await user.click(screen.getByRole("link", { name: /página 2/i }))

    await waitFor(() =>
      expect(flightNumbers()).toEqual(["DL1550", "DL0880", "DL0612"])
    )
    expect(router.state.location.search).toBe("?page=2")
  })
})

describe("Vuelos (admin): búsqueda y filtros en la URL", () => {
  it("los filtros muestran su conteo y filtran por estado", async () => {
    const { user, router } = await renderPage()
    const filters = screen.getByRole("group", { name: "Filtrar por estado" })

    expect(
      await within(filters).findByRole("button", { name: "Todos (8)" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      within(filters).getByRole("button", { name: "Programados (4)" })
    ).toBeInTheDocument()
    expect(
      within(filters).getByRole("button", { name: "Cancelados (1)" })
    ).toBeInTheDocument()

    await user.click(
      within(filters).getByRole("button", { name: "Retrasados (1)" })
    )

    await waitFor(() => expect(flightNumbers()).toEqual(["DL0418"]))
    expect(router.state.location.search).toBe("?status=retrasado")
  })

  it("busca por ciudad sin tildes, por número y por matrícula", async () => {
    const { user } = await renderPage()
    const search = screen.getByRole("searchbox", { name: "Buscar vuelo" })

    await user.type(search, "cancun")
    await waitFor(() => expect(flightNumbers()).toEqual(["DL0880"]))

    await user.clear(search)
    await user.type(search, "N411DX")
    await waitFor(() => expect(flightNumbers()).toEqual(["DL0030"]))
  })

  it("si nada coincide, avisa en vez de mostrar una tabla vacía", async () => {
    // Sin resultados no hay tabla: se espera el mensaje.
    renderRoute(`${PATHS.superAdmin.vuelos}?q=zzz`)

    expect(
      await screen.findByText("Ningún vuelo coincide con «zzz».")
    ).toBeInTheDocument()
  })
})

describe("Vuelos (admin): ficha del vuelo", () => {
  it("el ojo abre la ficha con ruta, horario, aeronave y los puestos requeridos", async () => {
    const { user } = await renderPage()

    await user.click(screen.getByRole("button", { name: "Ver vuelo DL0030" }))

    const dialog = await screen.findByRole("dialog", { name: "Vuelo DL0030" })
    const ficha = within(dialog)
    expect(ficha.getByText("ATL · Atlanta")).toBeInTheDocument()
    expect(ficha.getByText("LHR · Londres")).toBeInTheDocument()
    expect(ficha.getByText("8 h 45 min")).toBeInTheDocument()
    expect(ficha.getByText("C1")).toBeInTheDocument()
    expect(ficha.getByText("Airbus A330-900neo")).toBeInTheDocument()
    // Más de 8 h: piloto de relevo. 281 sillas: Jefe de Cabina + 5 auxiliares de vuelo.
    expect(
      ficha.getByText(
        "9 puestos: Capitán · Primer Oficial · Piloto de relevo · Jefe de Cabina · 5 auxiliares de vuelo."
      )
    ).toBeInTheDocument()
    expect(ficha.getByText("Incompleta")).toBeInTheDocument()

    await user.click(ficha.getByRole("button", { name: "Cerrar" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
  })
})

describe("Vuelos (admin): navegación", () => {
  it("el menú del admin tiene Vuelos después de Aeronaves", async () => {
    await renderPage()
    const nav = screen.getAllByRole("navigation")[0]
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent)

    expect(labels.indexOf("Vuelos")).toBe(labels.indexOf("Aeronaves") + 1)
  })
})
