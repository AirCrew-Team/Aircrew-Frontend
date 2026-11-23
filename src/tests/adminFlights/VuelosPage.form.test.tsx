import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// «Crear vuelo» con la cuenta demo. Va en su propio archivo porque crear cambia los
// datos simulados en memoria: los tests que guardan van al final, en orden.
// Fechas en abril de 2030: siempre en el futuro y lejos del cambio de horario.

// Llenan el formulario con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type Form = ReturnType<typeof within>

const openForm = async () => {
  const user = userEvent.setup()
  renderRoute(PATHS.superAdmin.vuelos)
  await screen.findByRole("table")
  await user.click(screen.getByRole("button", { name: "Crear vuelo" }))
  const dialog = await screen.findByRole("dialog", { name: "Crear vuelo" })
  const form = within(dialog)
  await form.findByLabelText(/^Número de vuelo/)
  return { user, form }
}

// Fecha y hora: los <input type="date|time"> se llenan con su valor completo.
const setValue = (input: HTMLElement, value: string) =>
  fireEvent.change(input, { target: { value } })

interface FlightFields {
  number: string
  origin: string
  destination: string
  date: string
  departure: string
  arrival: string
  arrivalDate?: string
  aircraft: string
  gate?: string
}

const fill = async (user: UserEvent, form: Form, fields: FlightFields) => {
  await user.type(form.getByLabelText(/^Número de vuelo/), fields.number)
  if (fields.gate) await user.type(form.getByLabelText(/^Puerta/), fields.gate)
  await user.selectOptions(form.getByLabelText(/^Origen/), fields.origin)
  await user.selectOptions(form.getByLabelText(/^Destino/), fields.destination)
  setValue(form.getByLabelText(/^Fecha de salida/), fields.date)
  setValue(form.getByLabelText(/^Hora de salida/), fields.departure)
  setValue(
    form.getByLabelText(/^Fecha de llegada/),
    fields.arrivalDate ?? fields.date
  )
  setValue(form.getByLabelText(/^Hora de llegada/), fields.arrival)
  await user.selectOptions(
    form.getByLabelText(/^Aeronave/),
    form.getByRole("option", { name: new RegExp(`^${fields.aircraft} ·`) })
  )
}

const submit = (user: UserEvent, form: Form) =>
  user.click(form.getByRole("button", { name: "Crear vuelo" }))

describe("Vuelos (admin): formulario «Crear vuelo»", () => {
  it("sin datos, cada campo obligatorio dice qué falta", async () => {
    const { user, form } = await openForm()

    await submit(user, form)

    for (const message of [
      "Ingresa el número de vuelo.",
      "Selecciona el origen.",
      "Selecciona el destino.",
      "Elige la fecha de salida.",
      "Elige la hora de salida.",
      "Elige la hora de llegada.",
      "Selecciona la aeronave.",
    ]) {
      expect(await form.findByText(message)).toBeInTheDocument()
    }
    expect(form.getByLabelText(/^Número de vuelo/)).toHaveFocus()
  })

  it("los aeropuertos salen del catálogo: primero las bases", async () => {
    const { form } = await openForm()
    const origin = form.getByLabelText(/^Origen/)

    const groups = within(origin).getAllByRole("group")
    expect(groups.map((group) => group.getAttribute("label"))).toEqual([
      "Bases",
      "Otros destinos",
    ])
    expect(
      within(groups[0])
        .getAllByRole("option")
        .map((option) => option.getAttribute("value"))
    ).toEqual(["ATL", "BOS", "DTW", "LAX", "MSP", "JFK", "LGA", "SLC", "SEA"])
    expect(
      within(origin).getByRole("option", {
        name: "LHR · Londres (London Heathrow)",
      })
    ).toBeInTheDocument()
  })

  it("valida el número, el destino distinto, la salida futura y la duración", async () => {
    const { user, form } = await openForm()

    await fill(user, form, {
      number: "D-12",
      origin: "ATL",
      destination: "ATL",
      date: "2020-01-10",
      departure: "08:00",
      arrival: "07:00",
      aircraft: "N827DN",
    })
    await submit(user, form)

    expect(
      await form.findByText(
        "Usa el código de la aerolínea y de 1 a 4 números (ej. DL1234)."
      )
    ).toBeInTheDocument()
    expect(
      form.getByText("El destino debe ser distinto del origen.")
    ).toBeInTheDocument()
    expect(
      form.getByText("La salida debe ser en el futuro.")
    ).toBeInTheDocument()
    expect(
      form.getByText(
        "La llegada debe ser después de la salida y el vuelo durar máximo 20 h."
      )
    ).toBeInTheDocument()
  })

  it("muestra la hora local de cada aeropuerto, la duración y la tripulación requerida", async () => {
    const { user, form } = await openForm()

    await fill(user, form, {
      number: "AV100",
      origin: "ATL",
      destination: "LAX",
      date: "2030-04-10",
      departure: "08:00",
      // Los Ángeles va 3 horas atrás de Atlanta: 5 h 50 min de vuelo.
      arrival: "10:50",
      aircraft: "N411DX",
    })

    expect(form.getByText("Hora local de Atlanta.")).toBeInTheDocument()
    expect(form.getByText("Hora local de Los Ángeles.")).toBeInTheDocument()
    expect(form.getByText("5 h 50 min")).toBeInTheDocument()
    // 281 sillas: Jefe de Cabina + 5 auxiliares de vuelo.
    expect(
      form.getByText(
        "Tripulación requerida: Capitán · Primer Oficial · Jefe de Cabina · 5 auxiliares de vuelo"
      )
    ).toBeInTheDocument()
  })

  it("elegir la fecha de salida propone la misma para la llegada", async () => {
    const { form } = await openForm()

    setValue(form.getByLabelText(/^Fecha de salida/), "2030-04-10")

    expect(form.getByLabelText(/^Fecha de llegada/)).toHaveValue("2030-04-10")
  })

  it("el botón ⇄ intercambia origen y destino", async () => {
    const { user, form } = await openForm()
    await user.selectOptions(form.getByLabelText(/^Origen/), "ATL")
    await user.selectOptions(form.getByLabelText(/^Destino/), "CDG")

    await user.click(
      form.getByRole("button", { name: "Intercambiar origen y destino" })
    )

    expect(form.getByLabelText(/^Origen/)).toHaveValue("CDG")
    expect(form.getByLabelText(/^Destino/)).toHaveValue("ATL")
  })
})

// Llegada estimada: distancia de la ruta ÷ 820 km/h + 30 min, redondeada a 5 min.
// ATL → BOS ≈ 1521 km → 2 h 20 min · ATL → LHR ≈ 6761 km → 8 h 45 min.
describe("Vuelos (admin): llegada estimada", () => {
  const route = async (
    user: UserEvent,
    form: Form,
    origin: string,
    destination: string
  ) => {
    await user.selectOptions(form.getByLabelText(/^Origen/), origin)
    await user.selectOptions(form.getByLabelText(/^Destino/), destination)
  }
  const arrival = (form: Form) => [
    (form.getByLabelText(/^Fecha de llegada/) as HTMLInputElement).value,
    (form.getByLabelText(/^Hora de llegada/) as HTMLInputElement).value,
  ]

  it("al elegir la ruta y la salida, llena la llegada y muestra la duración estimada", async () => {
    const { user, form } = await openForm()

    await route(user, form, "ATL", "BOS")
    setValue(form.getByLabelText(/^Fecha de salida/), "2030-04-10")
    setValue(form.getByLabelText(/^Hora de salida/), "08:00")

    expect(arrival(form)).toEqual(["2030-04-10", "10:20"])
    // El texto va repartido entre el párrafo y el número: se compara el párrafo completo.
    expect(
      form.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.replace(/\s+/g, " ").trim() ===
            "Duración: 2 h 20 min (estimada según la distancia de la ruta; puedes cambiar la llegada)"
      )
    ).toBeInTheDocument()
  })

  it("la llegada va en la hora y el día del destino (puede ser al día siguiente)", async () => {
    const { user, form } = await openForm()

    // 19:30 en Atlanta (UTC-4) + 8 h 45 min = 09:15 del día siguiente en Londres (UTC+1).
    setValue(form.getByLabelText(/^Fecha de salida/), "2030-04-10")
    setValue(form.getByLabelText(/^Hora de salida/), "19:30")
    await route(user, form, "ATL", "LHR")

    expect(arrival(form)).toEqual(["2030-04-11", "09:15"])
    expect(form.getByText("Hora local de Londres.")).toBeInTheDocument()
  })

  it("cambiar la ruta o la salida recalcula; el botón ⇄ también", async () => {
    const { user, form } = await openForm()
    await route(user, form, "ATL", "BOS")
    setValue(form.getByLabelText(/^Fecha de salida/), "2030-04-10")
    setValue(form.getByLabelText(/^Hora de salida/), "08:00")

    setValue(form.getByLabelText(/^Hora de salida/), "13:00")
    expect(arrival(form)).toEqual(["2030-04-10", "15:20"])

    await user.selectOptions(form.getByLabelText(/^Destino/), "LHR")
    expect(arrival(form)).toEqual(["2030-04-11", "02:45"])

    await user.click(
      form.getByRole("button", { name: "Intercambiar origen y destino" })
    )
    // LHR 13:00 (UTC+1) = 12:00Z; + 8 h 45 min = 20:45Z = 16:45 en Atlanta (UTC-4).
    expect(arrival(form)).toEqual(["2030-04-10", "16:45"])
  })

  it("una llegada escrita a mano no se reemplaza; «Usar la llegada estimada» la recupera", async () => {
    const { user, form } = await openForm()
    await route(user, form, "ATL", "BOS")
    setValue(form.getByLabelText(/^Fecha de salida/), "2030-04-10")
    setValue(form.getByLabelText(/^Hora de salida/), "08:00")

    setValue(form.getByLabelText(/^Hora de llegada/), "11:00")
    setValue(form.getByLabelText(/^Hora de salida/), "09:00")

    expect(arrival(form)).toEqual(["2030-04-10", "11:00"])
    expect(form.getByText("2 h")).toBeInTheDocument()

    await user.click(
      form.getByRole("button", {
        name: "Usar la llegada estimada (10 abr · 11:20)",
      })
    )

    expect(arrival(form)).toEqual(["2030-04-10", "11:20"])
    expect(
      form.queryByRole("button", { name: /Usar la llegada estimada/ })
    ).not.toBeInTheDocument()
  })
})

describe("Vuelos (admin): aeronaves del formulario", () => {
  it("solo ofrece aeronaves operativas", async () => {
    const { form } = await openForm()

    const options = within(form.getByLabelText(/^Aeronave/))
      .getAllByRole("option")
      .map((option) => option.textContent)
    expect(options).toEqual([
      "Selecciona…",
      "N122DU · Airbus A220-300 · 130 sillas",
      "N391DN · Airbus A321neo · 194 sillas",
      "N394DN · Airbus A321neo · 194 sillas",
      "N411DX · Airbus A330-900neo · 281 sillas",
      "N503DN · Airbus A350-900 · 306 sillas",
      "N827DN · Boeing 737-900ER · 180 sillas",
    ])
    // N271SY está en mantenimiento.
    expect(
      within(form.getByLabelText(/^Aeronave/)).queryByText(/N271SY/)
    ).not.toBeInTheDocument()
  })
})

// Estos cambian los datos en memoria: van al final y en orden.
describe("Vuelos (admin): crear", () => {
  const DL1234 = {
    number: "dl1234",
    gate: "a12",
    origin: "ATL",
    destination: "BOS",
    date: "2030-04-10",
    departure: "08:00",
    arrival: "10:30",
    aircraft: "N122DU",
  }

  it("crear avisa, cierra y el vuelo aparece programado y sin tripulación", async () => {
    const { user, form } = await openForm()

    await fill(user, form, DL1234)
    await submit(user, form)

    expect(form.getByRole("button", { name: "Creando…" })).toBeDisabled()
    expect(await findToast("Vuelo DL1234 creado")).toHaveTextContent(
      "Ya aparece en Programación para que el supervisor asigne la tripulación."
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(
      await screen.findByRole("button", { name: "Todos (9)" })
    ).toBeInTheDocument()

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar vuelo" }),
      "DL1234"
    )
    const row = await waitFor(() => {
      const cell = screen.getByText("DL1234")
      return cell.closest("tr") as HTMLElement
    })
    expect(row).toHaveTextContent("Puerta A12")
    expect(row).toHaveTextContent("10 abr · 08:00 → 10:30")
    expect(row).toHaveTextContent("Sin asignar")
    expect(row).toHaveTextContent("Programado")
  })

  it("el mismo número el mismo día se marca en el número, sin cerrar la ventana", async () => {
    const { user, form } = await openForm()

    await fill(user, form, { ...DL1234, departure: "15:00", arrival: "17:30" })
    await submit(user, form)

    const number = form.getByLabelText(/^Número de vuelo/)
    await waitFor(() =>
      expect(number).toHaveAccessibleDescription(
        /Ya existe el vuelo DL1234 el 2030-04-10\./
      )
    )
    expect(number).toHaveAttribute("aria-invalid", "true")
    expect(number).toHaveFocus()
    expect(screen.getByRole("dialog", { name: "Crear vuelo" })).toBeVisible()
  })

  it("una aeronave que ya vuela a esa hora se marca en la aeronave", async () => {
    const { user, form } = await openForm()

    await fill(user, form, {
      ...DL1234,
      number: "DL5555",
      departure: "08:30",
      arrival: "10:00",
    })
    await submit(user, form)

    const aircraft = form.getByLabelText(/^Aeronave/)
    await waitFor(() =>
      expect(aircraft).toHaveAccessibleDescription(
        /N122DU ya vuela de 08:00 a 10:30 \(DL1234\)\./
      )
    )
    expect(aircraft).toHaveFocus()
  })
})
