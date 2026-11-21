import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  AIRCRAFT_IDS,
  AIRCRAFT_URL,
  API_MAINTENANCE,
  API_MAINTENANCE_RECORD,
  API_OPERATING,
  PHOTO_UPDATED_AT,
  aircraftHandlers,
  aircraftUrl,
  apiError,
} from "../mocks/aircraftApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// Pantalla Aeronaves con sesión real de super_admin: cada llamada va al servicio flights
// (MSW simula el backend). Revisa la traducción de nombres (snake_case, operating /
// maintenance, page_size), los catálogos del backend, la foto aparte y los 409.

// Escriben en el formulario con userEvent: más margen, solo aquí.
vi.setConfig({ testTimeout: 20_000 })

let listRequests: URL[]

beforeEach(() => {
  useAuthStore.getState().setUser(REAL_USERS.admin)
  const mocked = aircraftHandlers()
  listRequests = mocked.listRequests
  server.use(...mocked.handlers)
})

const renderPage = async (search = "") => {
  const user = userEvent.setup()
  renderRoute(`${PATHS.superAdmin.aeronaves}${search}`)
  await screen.findByRole("table")
  return user
}

const rowOf = (registration: string) =>
  screen.getByText(registration).closest("tr") as HTMLElement

const openReport = async (
  user: ReturnType<typeof userEvent.setup>,
  registration: string
) => {
  await user.click(
    screen.getByRole("button", { name: `Ver informe de ${registration}` })
  )
  return within(
    await screen.findByRole("dialog", {
      name: `Informe de aeronave · ${registration}`,
    })
  )
}

// Abre «Editar» desde el informe.
const openEdit = async (
  user: ReturnType<typeof userEvent.setup>,
  registration: string
) => {
  const report = await openReport(user, registration)
  await report.findByRole("region", { name: "Datos de la aeronave" })
  await user.click(report.getByRole("button", { name: "Editar" }))
  return within(
    await screen.findByRole("dialog", {
      name: `Editar aeronave ${registration}`,
    })
  )
}

// Guarda el cuerpo y la ruta de cada petición de escritura, en orden.
const recordWrites = () => {
  const writes: { method: string; path: string; body: unknown }[] = []
  const record =
    (reply: () => Response) =>
    async ({ request }: { request: Request }) => {
      const text = await request.text()
      writes.push({
        method: request.method,
        path: new URL(request.url).pathname,
        body: text ? JSON.parse(text) : null,
      })
      return reply()
    }
  return { writes, record }
}

describe("Aeronaves (sesión real): lista, indicadores y foto", () => {
  it("pide la página con page_size y muestra los datos traducidos del backend", async () => {
    await renderPage()

    const params = listRequests.at(-1)?.searchParams
    expect(params?.get("page")).toBe("1")
    expect(params?.get("page_size")).toBe("5")
    expect(params?.has("search")).toBe(false)
    expect(params?.has("status")).toBe(false)

    const operating = rowOf("N391DN")
    expect(operating).toHaveTextContent("Airbus A321neo")
    expect(operating).toHaveTextContent("Atlanta (ATL)")
    expect(operating).toHaveTextContent("Operativa")
    // Con foto: la del backend, con ?v= para no reutilizar la anterior.
    expect(operating.querySelector("img")).toHaveAttribute(
      "src",
      `${aircraftUrl(AIRCRAFT_IDS.operating)}/photo?v=${PHOTO_UPDATED_AT}`
    )
    const maintenance = rowOf("N271SY")
    expect(maintenance).toHaveTextContent("En mantenimiento")
    // El motivo con el texto del catálogo del backend.
    await waitFor(() =>
      expect(maintenance).toHaveTextContent("Motor (catálogo)")
    )
    // Sin foto (photo_updated_at null): la imagen genérica, no el backend.
    expect(maintenance.querySelector("img")?.getAttribute("src")).not.toContain(
      AIRCRAFT_URL
    )
  })

  it.each([
    { filter: "?status=operativa", api: "operating" },
    { filter: "?status=mantenimiento", api: "maintenance" },
  ])("$filter pide status=$api", async ({ filter, api }) => {
    await renderPage(filter)

    expect(listRequests.at(-1)?.searchParams.get("status")).toBe(api)
  })

  it("la búsqueda se envía como search", async () => {
    const user = await renderPage()

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar aeronave" }),
      "n391"
    )

    await waitFor(() =>
      expect(listRequests.at(-1)?.searchParams.get("search")).toBe("n391")
    )
  })

  it("los conteos de los filtros salen de /aircraft/stats", async () => {
    await renderPage()

    const filters = within(
      screen.getByRole("group", { name: "Filtrar por estado" })
    )
    expect(
      await filters.findByRole("button", { name: /^Todas \(2\)/ })
    ).toBeInTheDocument()
    expect(
      filters.getByRole("button", { name: /^Operativas \(1\)/ })
    ).toBeInTheDocument()
  })
})

describe("Aeronaves (sesión real): registrar y editar", () => {
  it("registra con los nombres del backend y después sube la foto en base64 sin prefijo", async () => {
    const { writes, record } = recordWrites()
    const created = {
      ...API_OPERATING,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      registration: "N402DX",
      photo_updated_at: null,
    }
    server.use(
      http.post(
        AIRCRAFT_URL,
        record(() => HttpResponse.json(created, { status: 201 }))
      ),
      http.put(
        `${aircraftUrl(created.id)}/photo`,
        record(() => HttpResponse.json({ photo_updated_at: PHOTO_UPDATED_AT }))
      )
    )
    const user = userEvent.setup({ applyAccept: false })
    renderRoute(PATHS.superAdmin.aeronaves)
    await screen.findByRole("table")
    await user.click(screen.getByRole("button", { name: "Registrar Aeronave" }))
    const form = within(
      await screen.findByRole("dialog", { name: "Registrar aeronave" })
    )

    await user.upload(
      await form.findByLabelText("Subir foto"),
      new File(["png"], "n402dx.png", { type: "image/png" })
    )
    // Modelos, bases y motivos salen de /aircraft/options.
    expect(
      within(form.getByLabelText(/^Modelo/))
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["Selecciona…", "Airbus A321neo", "Embraer E175"])
    await user.type(form.getByLabelText(/^Matrícula/), "n402dx")
    await user.type(form.getByLabelText(/^Número de serie/), "2041")
    await user.selectOptions(form.getByLabelText(/^Modelo/), "e175")
    await user.selectOptions(form.getByLabelText(/^Base principal/), "MSP")
    await user.type(form.getByLabelText(/^Año de fabricación/), "2020")
    await user.type(form.getByLabelText(/^En la flota desde/), "2021-03-15")
    await user.click(form.getByRole("button", { name: "Registrar aeronave" }))

    await findToast("Aeronave registrada")
    // Primero la aeronave, después la foto.
    expect(writes).toEqual([
      {
        method: "POST",
        path: "/api/flights/aircraft",
        body: {
          registration: "N402DX",
          msn: "2041",
          model_id: "e175",
          base: "MSP",
          // Número, no texto.
          manufacture_year: 2020,
          in_fleet_since: "2021-03-15",
          status: "operating",
          maintenance_type: null,
          maintenance_note: null,
        },
      },
      {
        method: "PUT",
        path: `/api/flights/aircraft/${created.id}/photo`,
        // «png» en base64, sin «data:image/png;base64,».
        body: { mime_type: "image/png", data_base64: "cG5n" },
      },
    ])
  })

  it("una matrícula repetida (409) se muestra debajo del campo", async () => {
    const message = "Ya existe una aeronave con esa matrícula."
    server.use(
      http.put(aircraftUrl(AIRCRAFT_IDS.operating), () =>
        apiError(message, 409)
      )
    )
    const user = await renderPage()
    const form = await openEdit(user, "N391DN")

    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    const registration = form.getByLabelText(/^Matrícula/)
    await waitFor(() =>
      expect(registration).toHaveAccessibleDescription(
        expect.stringContaining(message)
      )
    )
    expect(registration).toHaveFocus()
  })

  it("en mantenimiento, «Operativa» está deshabilitada y se explica cómo volver a servicio", async () => {
    const user = await renderPage()
    const form = await openEdit(user, "N271SY")

    expect(form.getByRole("radio", { name: "Operativa" })).toBeDisabled()
    expect(form.getByRole("radio", { name: "En mantenimiento" })).toBeChecked()
    expect(
      form.getByRole("radiogroup", { name: "Estado de la aeronave" })
    ).toHaveAccessibleDescription(
      "Para volver a servicio, completa las tareas y usa «Liberar a servicio» en el informe de la aeronave."
    )
    // Los motivos son los del catálogo.
    expect(
      within(form.getByLabelText(/^Motivo del mantenimiento/))
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["Selecciona…", "Motor (catálogo)", "Ala (catálogo)"])
  })

  it("editar envía PUT con todos los datos y muestra el texto de un 409 del backend", async () => {
    const message =
      "La aeronave está en mantenimiento: completa las tareas y usa «Liberar a servicio»."
    const { writes, record } = recordWrites()
    server.use(
      http.put(
        aircraftUrl(AIRCRAFT_IDS.maintenance),
        record(() => apiError(message, 409))
      )
    )
    const user = await renderPage()
    const form = await openEdit(user, "N271SY")

    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    expect(await form.findByText(message)).toHaveAttribute("role", "alert")
    expect(writes[0].body).toEqual({
      registration: "N271SY",
      msn: "17000812",
      model_id: "e175",
      base: "MSP",
      manufacture_year: 2021,
      in_fleet_since: "2021-06-14",
      status: "maintenance",
      maintenance_type: "motor",
      maintenance_note: "Vibración en el motor derecho.",
    })
  })
})

describe("Aeronaves (sesión real): informe, mantenimiento y eliminar", () => {
  it("el historial usa el texto del catálogo", async () => {
    const user = await renderPage()
    const report = await openReport(user, "N391DN")

    const history = await report.findByRole("region", {
      name: "Historial de mantenimientos",
    })
    expect(history).toHaveTextContent("Ala (catálogo)")
    expect(history).toHaveTextContent("Golpe en la punta del ala.")
  })

  it("marcar una tarea envía PATCH con su índice y { done }", async () => {
    const { writes, record } = recordWrites()
    server.use(
      http.patch(
        `${aircraftUrl(AIRCRAFT_IDS.maintenance)}/maintenance/tasks/1`,
        record(() =>
          HttpResponse.json({
            ...API_MAINTENANCE_RECORD,
            tasks: API_MAINTENANCE_RECORD.tasks.map((task) => ({
              ...task,
              done: true,
            })),
          })
        )
      )
    )
    const user = await renderPage()
    const report = await openReport(user, "N271SY")
    const maintenance = within(
      await report.findByRole("region", { name: "Mantenimiento" })
    )
    expect(maintenance.getByText("Motor (catálogo)")).toBeInTheDocument()

    await user.click(
      maintenance.getByRole("checkbox", { name: "Prueba en tierra" })
    )

    await waitFor(() =>
      expect(writes).toEqual([
        {
          method: "PATCH",
          path: `/api/flights/aircraft/${AIRCRAFT_IDS.maintenance}/maintenance/tasks/1`,
          body: { done: true },
        },
      ])
    )
  })

  it("«Liberar a servicio» envía POST .../release", async () => {
    const { writes, record } = recordWrites()
    server.use(
      http.get(`${aircraftUrl(AIRCRAFT_IDS.maintenance)}/report`, () =>
        HttpResponse.json({
          aircraft: API_MAINTENANCE,
          maintenance: {
            ...API_MAINTENANCE_RECORD,
            tasks: API_MAINTENANCE_RECORD.tasks.map((task) => ({
              ...task,
              done: true,
            })),
          },
          history: [],
        })
      ),
      http.post(
        `${aircraftUrl(AIRCRAFT_IDS.maintenance)}/release`,
        record(() =>
          HttpResponse.json({
            ...API_MAINTENANCE,
            status: "operating",
            maintenance_type: null,
            maintenance_note: null,
          })
        )
      )
    )
    const user = await renderPage()
    const report = await openReport(user, "N271SY")
    const maintenance = within(
      await report.findByRole("region", { name: "Mantenimiento" })
    )

    await user.click(
      maintenance.getByRole("button", { name: "Liberar a servicio" })
    )

    await findToast("Aeronave liberada a servicio")
    expect(writes.map(({ method, path }) => `${method} ${path}`)).toEqual([
      `POST /api/flights/aircraft/${AIRCRAFT_IDS.maintenance}/release`,
    ])
  })

  it("si tiene vuelos (409), eliminar muestra el mensaje del backend", async () => {
    const message =
      "La aeronave tiene vuelos registrados: no se puede eliminar."
    server.use(
      http.delete(aircraftUrl(AIRCRAFT_IDS.operating), () =>
        apiError(message, 409)
      )
    )
    const user = await renderPage()

    await user.click(
      screen.getByRole("button", { name: "Eliminar aeronave N391DN" })
    )
    const dialog = within(await screen.findByRole("alertdialog"))
    await user.click(dialog.getByRole("button", { name: "Eliminar" }))

    expect(await dialog.findByText(message)).toHaveAttribute("role", "alert")
    expect(rowOf("N391DN")).toBeInTheDocument()
  })
})

describe("Inicio del admin (sesión real): tarjeta Flota de Aeronaves", () => {
  it("sale de /aircraft/stats: activas, modelos en línea y operativas", async () => {
    renderRoute(PATHS.superAdmin.inicio)

    expect(await screen.findByText("1 activas")).toBeInTheDocument()
    expect(
      screen.getByText("Airbus A321neo / Boeing 737-900ER en línea")
    ).toBeInTheDocument()
    expect(screen.getByText("1 / 2 Operativas")).toBeInTheDocument()
  })
})

describe("Aeronaves (cuenta demo)", () => {
  it("no llama al backend", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
    let called = false
    server.use(
      http.all(`${AIRCRAFT_URL}*`, () => {
        called = true
        return HttpResponse.json({})
      })
    )

    await renderPage()

    expect(screen.getByText("N391DN")).toBeInTheDocument()
    expect(called).toBe(false)
  })
})
