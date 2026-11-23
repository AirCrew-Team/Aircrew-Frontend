import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  API_FLIGHT,
  API_FLIGHT_OPTIONS,
  apiError,
  FLIGHTS_URL,
  flightsAdminHandlers,
} from "../mocks/flightsAdminApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// Pantalla Vuelos con sesión real de super_admin: cada llamada va al servicio flights
// (MSW simula el backend). Revisa la traducción de valores, las horas en la zona de cada
// aeropuerto, el catálogo del backend, el POST en UTC y los errores 409 / 403.

vi.setConfig({ testTimeout: 20_000 })

let listRequests: URL[]

beforeEach(() => {
  useAuthStore.getState().setUser(REAL_USERS.admin)
  const mocked = flightsAdminHandlers()
  listRequests = mocked.listRequests
  server.use(...mocked.handlers)
})

const renderPage = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superAdmin.vuelos)
  await screen.findByRole("table")
  return user
}

const openForm = async () => {
  const user = await renderPage()
  await user.click(screen.getByRole("button", { name: "Crear vuelo" }))
  const dialog = await screen.findByRole("dialog", { name: "Crear vuelo" })
  const form = within(dialog)
  await form.findByLabelText(/^Número de vuelo/)
  return { user, form }
}

const setValue = (input: HTMLElement, value: string) =>
  fireEvent.change(input, { target: { value } })

// DL1234 ATL → BOS el 20 ene 2030, 08:00–10:30 hora del este (UTC-5 en enero).
const fillFlight = async (user: UserEvent, form: ReturnType<typeof within>) => {
  await user.type(form.getByLabelText(/^Número de vuelo/), "dl1234")
  await user.type(form.getByLabelText(/^Puerta/), "a12")
  await user.selectOptions(form.getByLabelText(/^Origen/), "ATL")
  await user.selectOptions(form.getByLabelText(/^Destino/), "BOS")
  setValue(form.getByLabelText(/^Fecha de salida/), "2030-01-20")
  setValue(form.getByLabelText(/^Hora de salida/), "08:00")
  setValue(form.getByLabelText(/^Fecha de llegada/), "2030-01-20")
  setValue(form.getByLabelText(/^Hora de llegada/), "10:30")
  await user.selectOptions(
    form.getByLabelText(/^Aeronave/),
    API_FLIGHT.aircraft_id
  )
}

// Guarda el cuerpo de cada POST y responde con `reply`.
const capturePost = (reply: () => Response) => {
  const bodies: unknown[] = []
  server.use(
    http.post(FLIGHTS_URL, async ({ request }) => {
      bodies.push(await request.json())
      return reply()
    })
  )
  return bodies
}

describe("Vuelos (sesión real): lista e indicadores", () => {
  it("pide /manage con page_size=5 y muestra las horas en la zona de cada aeropuerto", async () => {
    await renderPage()

    const params = listRequests.at(-1)?.searchParams
    expect(params?.get("page")).toBe("1")
    expect(params?.get("page_size")).toBe("5")
    expect(params?.has("search")).toBe(false)
    expect(params?.has("status")).toBe(false)

    const row = screen.getByText("DL0030").closest("tr") as HTMLElement
    // Salida 19:30 en Atlanta; llegada 08:15 en Londres, al día siguiente.
    expect(row).toHaveTextContent("14 ene · 19:30 → 08:15 (15 ene)")
    expect(row).toHaveTextContent("7 h 45 min · Internacional")
    expect(row).toHaveTextContent("Incompleta")
    expect(row).toHaveTextContent("Retrasado")
  })

  it("el filtro se traduce al enviarlo y la búsqueda va como search", async () => {
    const user = await renderPage()

    await user.click(
      await screen.findByRole("button", { name: "Retrasados (1)" })
    )
    await waitFor(() =>
      expect(listRequests.at(-1)?.searchParams.get("status")).toBe("delayed")
    )

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar vuelo" }),
      "N411DX"
    )
    await waitFor(() =>
      expect(listRequests.at(-1)?.searchParams.get("search")).toBe("N411DX")
    )
  })

  it("los indicadores vienen de /stats", async () => {
    await renderPage()
    const list = (await screen.findByText("Sin tripulación")).closest(
      "dl"
    ) as HTMLElement
    const value = (label: string) =>
      within(list).getByText(label).parentElement?.querySelector("dd")
        ?.textContent

    expect(value("Total vuelos")).toBe("1")
    expect(value("Hoy")).toBe("0")
    expect(value("Sin tripulación")).toBe("1")
    expect(value("Retrasados")).toBe("1")
  })
})

describe("Vuelos (sesión real): crear", () => {
  it("los desplegables salen del catálogo del backend", async () => {
    const { form } = await openForm()

    expect(
      within(form.getByLabelText(/^Aeronave/)).getByRole("option", {
        name: "N391DN · Airbus A321neo · catálogo · 194 sillas",
      })
    ).toBeInTheDocument()
    expect(
      within(form.getByLabelText(/^Destino/)).getByRole("option", {
        name: "LHR · Londres (London Heathrow)",
      })
    ).toBeInTheDocument()
  })

  it("estima la llegada con las coordenadas que manda el backend", async () => {
    const { user, form } = await openForm()

    await user.selectOptions(form.getByLabelText(/^Origen/), "ATL")
    await user.selectOptions(form.getByLabelText(/^Destino/), "BOS")
    setValue(form.getByLabelText(/^Fecha de salida/), "2030-01-20")
    setValue(form.getByLabelText(/^Hora de salida/), "08:00")

    // ATL → BOS ≈ 1521 km → 2 h 20 min.
    expect(form.getByLabelText(/^Fecha de llegada/)).toHaveValue("2030-01-20")
    expect(form.getByLabelText(/^Hora de llegada/)).toHaveValue("10:20")
  })

  it("si un aeropuerto no trae coordenadas, no estima: solo propone el mismo día", async () => {
    server.use(
      http.get(`${FLIGHTS_URL}/options`, () =>
        HttpResponse.json({
          ...API_FLIGHT_OPTIONS,
          airports: API_FLIGHT_OPTIONS.airports.map((airport) =>
            airport.code === "BOS"
              ? { ...airport, latitude: null, longitude: null }
              : airport
          ),
        })
      )
    )
    const { user, form } = await openForm()

    await user.selectOptions(form.getByLabelText(/^Origen/), "ATL")
    await user.selectOptions(form.getByLabelText(/^Destino/), "BOS")
    setValue(form.getByLabelText(/^Fecha de salida/), "2030-01-20")
    setValue(form.getByLabelText(/^Hora de salida/), "08:00")

    expect(form.getByLabelText(/^Fecha de llegada/)).toHaveValue("2030-01-20")
    expect(form.getByLabelText(/^Hora de llegada/)).toHaveValue("")
    expect(
      form.getByText(
        "No hay datos para estimar esta ruta: escribe la fecha y la hora de llegada."
      )
    ).toBeInTheDocument()
  })

  it("envía el número y la puerta en mayúsculas y las horas convertidas a UTC", async () => {
    const bodies = capturePost(() =>
      HttpResponse.json(
        {
          ...API_FLIGHT,
          flight_number: "DL1234",
          status: "scheduled",
          crew_status: "unassigned",
        },
        { status: 201 }
      )
    )
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    await findToast("Vuelo DL1234 creado")
    // En enero Atlanta y Boston van en UTC-5: 08:00 → 13:00Z.
    expect(bodies).toEqual([
      {
        flight_number: "DL1234",
        aircraft_id: API_FLIGHT.aircraft_id,
        origin: "ATL",
        destination: "BOS",
        departure_at: "2030-01-20T13:00:00.000Z",
        arrival_at: "2030-01-20T15:30:00.000Z",
        gate: "A12",
      },
    ])
  })

  it("sin puerta se envía null", async () => {
    const bodies = capturePost(() =>
      HttpResponse.json(API_FLIGHT, { status: 201 })
    )
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.clear(form.getByLabelText(/^Puerta/))
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({ gate: null })
  })

  it("un 409 con field marca ese campo del formulario", async () => {
    capturePost(() =>
      apiError("N391DN ya vuela de 08:00 a 10:30 (DL2201).", 409, "aircraft_id")
    )
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    const aircraft = form.getByLabelText(/^Aeronave/)
    await waitFor(() =>
      expect(aircraft).toHaveAccessibleDescription(
        /N391DN ya vuela de 08:00 a 10:30 \(DL2201\)\./
      )
    )
    expect(aircraft).toHaveAttribute("aria-invalid", "true")
    expect(form.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("un 400 con field de la llegada se marca en la hora de llegada", async () => {
    capturePost(() =>
      apiError(
        "La llegada debe ser después de la salida y el vuelo durar máximo 20 h.",
        400,
        "arrival_at"
      )
    )
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    await waitFor(() =>
      expect(form.getByLabelText(/^Hora de llegada/)).toHaveAttribute(
        "aria-invalid",
        "true"
      )
    )
  })

  it("un 400 con field de la salida (salida en el pasado) se marca en la hora de salida", async () => {
    capturePost(() =>
      apiError("La salida debe ser en el futuro.", 400, "departure_at")
    )
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    const departure = form.getByLabelText(/^Hora de salida/)
    await waitFor(() =>
      expect(departure).toHaveAccessibleDescription(
        /La salida debe ser en el futuro\./
      )
    )
    expect(departure).toHaveAttribute("aria-invalid", "true")
  })

  it("un 409 sin field muestra el texto del backend en el pie", async () => {
    capturePost(() =>
      apiError("N391DN ya vuela de 08:00 a 10:30 (DL2201).", 409)
    )
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    expect(
      await form.findByText("N391DN ya vuela de 08:00 a 10:30 (DL2201).")
    ).toHaveAttribute("role", "alert")
  })

  it("un 403 dice que no tiene permisos", async () => {
    capturePost(() => apiError("No tienes permisos para esta acción.", 403))
    const { user, form } = await openForm()

    await fillFlight(user, form)
    await user.click(form.getByRole("button", { name: "Crear vuelo" }))

    expect(
      await form.findByText("No tienes permisos para programar vuelos.")
    ).toBeInTheDocument()
  })
})
