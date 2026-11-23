import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Aeronaves del super admin: solo la información de los aviones (la tripulación y los
// vuelos son del supervisor). Indicadores, tabla de 5 por página (?page=), filtros
// (?status=), búsqueda (?q=), informe de cada avión, exportar manifiesto, registro y edición
// con foto, y estados de carga y error.
// Los tests que cambian datos van al final: modifican los datos simulados en memoria.

// Escriben y navegan con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type DataFn = (...args: unknown[]) => unknown

// Cada función de aircraft.data.ts se envuelve para registrar sus llamadas y poder
// forzar errores. Sin override, delega en la función real (datos simulados).
const aircraftData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  // Lo que devolvió cada llamada, en el mismo orden que calls.
  results: [] as unknown[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/aircraft/data/aircraft.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      // Las clases (AircraftFieldError) se dejan tal cual: el formulario usa instanceof.
      if (
        typeof value !== "function" ||
        name === "AircraftFieldError" ||
        name === "AircraftRequestError"
      ) {
        return [name, value]
      }
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          aircraftData.calls.push({ name, args })
          const result = (aircraftData.overrides[name] ?? real)(...args)
          aircraftData.results.push(result)
          return result
        },
      ]
    })
  )
})

afterEach(() => {
  aircraftData.calls.length = 0
  aircraftData.results.length = 0
  aircraftData.overrides = {}
  vi.restoreAllMocks()
})

const fail = () => Promise.reject(new Error("servicio caído"))

// Último pedido de la lista: los parámetros que se enviarán al backend.
const lastListParams = () =>
  aircraftData.calls.filter((call) => call.name === "getAircraft").at(-1)
    ?.args[0]

const lastCall = (name: string) =>
  aircraftData.calls.filter((call) => call.name === name).at(-1)?.args

// Aeronave que devolvió el último createAircraft (su id es el que recibe la foto).
const lastCreated = async () => {
  const index = aircraftData.calls.findLastIndex(
    (call) => call.name === "createAircraft"
  )
  return (await aircraftData.results[index]) as { id: string }
}

const renderPage = async (search = "") => {
  const user = userEvent.setup()
  const router = renderRoute(`${PATHS.superAdmin.aeronaves}${search}`)
  await screen.findByRole("heading", { level: 1, name: "Aeronaves" })
  await screen.findByRole("table")
  return { user, router }
}

// Matrículas de las filas visibles, en orden (la primera línea de la primera celda).
const registrations = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map(
      (row) =>
        within(row).getAllByRole("cell")[0].querySelector("span")?.textContent
    )

const rowOf = (registration: string) =>
  screen.getByText(registration).closest("tr") as HTMLElement

const filterButton = (name: RegExp) =>
  within(screen.getByRole("group", { name: "Filtrar por estado" })).getByRole(
    "button",
    { name }
  )

// jsdom no crea direcciones para archivos (fotos, CSV): se simulan.
const stubObjectUrls = (url: string) => {
  const createObjectURL = vi.fn(() => url)
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  )
  return createObjectURL
}

describe("Aeronaves: contenido", () => {
  it("muestra la ruta, el título y los indicadores de la flota", async () => {
    await renderPage()

    const breadcrumb = screen.getByRole("navigation", {
      name: "Ruta de navegación",
    })
    expect(breadcrumb).toHaveTextContent("Operaciones de vuelo")
    expect(within(breadcrumb).getByText("Control de flota")).toHaveAttribute(
      "aria-current",
      "page"
    )

    // Cada indicador es un par etiqueta/valor (dt/dd).
    await screen.findByText("Total aeronaves")
    const stats = Object.fromEntries(
      screen
        .getAllByRole("term")
        .map((term) => [
          term.textContent,
          term.parentElement?.querySelector("dd")?.textContent,
        ])
    )
    expect(stats).toEqual({
      "Total aeronaves": "18",
      Operativas: "15",
      "En mantenimiento": "3",
      "Asientos totales": "3,346",
    })
  })

  it("la tabla muestra 5 aeronaves por página, solo con datos del avión", async () => {
    await renderPage()

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((header) => header.textContent)
    ).toEqual([
      "Aeronave",
      "Categoría",
      "Capacidad",
      "Base",
      "Estado",
      "Acciones",
    ])
    expect(registrations()).toEqual([
      "N391DN",
      "N411DX",
      "N271SY",
      "N827DN",
      "N503DN",
    ])
    expect(screen.getByText("Mostrando 5 de 18 aeronaves")).toBeInTheDocument()

    const row = rowOf("N391DN")
    expect(row).toHaveTextContent("Airbus A321neo · MSN 10342")
    expect(row).toHaveTextContent("Narrow-body")
    expect(row).toHaveTextContent("194 pasajeros")
    expect(row).toHaveTextContent("2 Pilotos + 4 Auxiliares")
    expect(row).toHaveTextContent("Atlanta (ATL)")
    expect(row).toHaveTextContent("Operativa")
    expect(rowOf("N271SY")).toHaveTextContent(
      "En mantenimientoProblemas con el motor"
    )

    // Nada de vuelos: ni destino ni «en vuelo / en tierra».
    const table = screen.getByRole("table")
    expect(table).not.toHaveTextContent(/Destino|En vuelo|En tierra|En ruta/)
  })

  it("cada fila tiene el ojo (informe) y la papelera, como en Certificaciones", async () => {
    await renderPage()

    const actionsOf = (registration: string) =>
      within(rowOf(registration))
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"))

    expect(actionsOf("N391DN")).toEqual([
      "Ver informe de N391DN",
      "Eliminar aeronave N391DN",
    ])
    expect(actionsOf("N271SY")).toEqual([
      "Ver informe de N271SY",
      "Eliminar aeronave N271SY",
    ])
    // Editar ya no está en la fila: se hace desde el informe.
    expect(
      screen.queryByRole("button", { name: /^Editar aeronave/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /tripulación|suplente/i })
    ).not.toBeInTheDocument()
  })
})

describe("Aeronaves: filtros, búsqueda y paginación", () => {
  it("los filtros muestran sus conteos y cambian ?status=", async () => {
    const { user, router } = await renderPage()

    expect(
      await screen.findByRole("button", { name: "Todas (18)" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(filterButton(/^Operativas/)).toHaveTextContent("Operativas (15)")
    expect(filterButton(/^Mantenimiento/)).toHaveTextContent(
      "Mantenimiento (3)"
    )

    await user.click(filterButton(/^Mantenimiento/))
    await waitFor(() =>
      expect(registrations()).toEqual(["N271SY", "N396DN", "N125DU"])
    )
    expect(router.state.location.search).toBe("?status=mantenimiento")
    expect(lastListParams()).toMatchObject({
      status: "mantenimiento",
      page: 1,
      pageSize: 5,
    })
  })

  it("busca por matrícula o modelo y lo guarda en ?q=", async () => {
    const { user, router } = await renderPage()
    const search = screen.getByRole("searchbox", { name: "Buscar aeronave" })

    await user.type(search, "embraer")
    await waitFor(() =>
      expect(registrations()).toEqual(["N271SY", "N264SY", "N270SY"])
    )
    expect(router.state.location.search).toBe("?q=embraer")

    await user.clear(search)
    await user.type(search, "N999XX")
    expect(
      await screen.findByText("Ninguna aeronave coincide con «N999XX».")
    ).toBeInTheDocument()
  })

  it("pagina de a 5 con la paginación de los demás apartados", async () => {
    await renderPage("?page=2")
    expect(registrations()).toEqual([
      "N122DU",
      "N843DN",
      "N394DN",
      "N838MH",
      "N412DX",
    ])
    expect(
      screen.getByRole("navigation", { name: "Paginación de aeronaves" })
    ).toBeInTheDocument()
  })

  it("si la página no existe, pasa a la última", async () => {
    const { router } = await renderPage("?page=99")
    await waitFor(() => expect(router.state.location.search).toBe("?page=4"))
  })
})

describe("Aeronaves: informe y manifiesto", () => {
  it("«Ver informe» muestra todos los datos del avión (operativo, sin mantenimiento)", async () => {
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", { name: "Ver informe de N391DN" })
    )
    const dialog = within(
      await screen.findByRole("dialog", {
        name: "Informe de aeronave · N391DN",
      })
    )
    const data = await dialog.findByRole("region", {
      name: "Datos de la aeronave",
    })
    expect(
      within(data).getByRole("img", { name: "Foto de la aeronave N391DN" })
    ).toBeInTheDocument()
    const fields = Object.fromEntries(
      within(data)
        .getAllByRole("term")
        .map((term) => [
          term.textContent,
          term.parentElement?.querySelector("dd")?.textContent,
        ])
    )
    expect(fields).toEqual({
      Matrícula: "N391DN",
      "Número de serie": "10342",
      Modelo: "Airbus A321neo",
      Categoría: "Narrow-body",
      Capacidad: "194 pasajeros",
      "Tripulación mínima": "2 Pilotos + 4 Auxiliares",
      Motores: "2 × Pratt & Whitney PW1100G",
      "Año de fabricación": "2021",
      "En la flota desde": "14 jun 2021",
      "Horas de vuelo": "14,820 h",
      Ciclos: "6,210",
      "Base principal": "Atlanta (ATL)",
      Estado: "Operativa",
    })
    expect(
      dialog.queryByRole("region", { name: "Mantenimiento" })
    ).not.toBeInTheDocument()
    // Historial: reparaciones anteriores ya terminadas.
    const history = dialog.getByRole("region", {
      name: "Historial de mantenimientos",
    })
    // Texto del motivo según el catálogo (GET /aircraft/options).
    expect(history).toHaveTextContent("Revisión programada")
    expect(history).toHaveTextContent("2 mar 2026 – 9 mar 2026")
  })

  it("en mantenimiento, el informe explica el problema, la orden, el avance y las tareas", async () => {
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", { name: "Ver informe de N271SY" })
    )
    const maintenance = within(
      await screen.findByRole("region", { name: "Mantenimiento" })
    )
    expect(maintenance.getByText("Problemas con el motor")).toBeInTheDocument()
    expect(
      maintenance.getByText(
        "Vibración anormal en el motor derecho reportada después del último aterrizaje."
      )
    ).toBeInTheDocument()
    expect(maintenance.getByText("OT-2026-0412")).toBeInTheDocument()
    expect(maintenance.getByText("Hangar MRO 3 · MSP")).toBeInTheDocument()
    expect(maintenance.getByText("2 nov 2026")).toBeInTheDocument()
    expect(
      maintenance.getByRole("progressbar", {
        name: "2 de 5 tareas completadas",
      })
    ).toHaveAttribute("aria-valuenow", "40")
    // Las tareas son casillas: las dos primeras ya están hechas.
    const tasks = within(
      maintenance.getByRole("group", {
        name: "Tareas (marca las que ya están hechas)",
      })
    ).getAllByRole("checkbox")
    expect(tasks.map((task) => (task as HTMLInputElement).checked)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ])
    // Faltan tareas: todavía no se puede liberar.
    expect(
      maintenance.getByRole("button", { name: "Liberar a servicio" })
    ).toBeDisabled()
  })

  it("«Editar» desde el informe abre el formulario de esa aeronave", async () => {
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", { name: "Ver informe de N827DN" })
    )
    const dialog = within(
      await screen.findByRole("dialog", {
        name: "Informe de aeronave · N827DN",
      })
    )
    await dialog.findByRole("region", { name: "Datos de la aeronave" })
    await user.click(dialog.getByRole("button", { name: "Editar" }))

    expect(
      await screen.findByRole("dialog", { name: "Editar aeronave N827DN" })
    ).toBeInTheDocument()
  })

  it("«Exportar Manifiesto» descarga la flota en CSV", async () => {
    const createObjectURL = stubObjectUrls("blob:manifiesto")
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {})
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", { name: "Exportar Manifiesto" })
    )

    expect(await findToast("Manifiesto exportado")).toHaveTextContent(
      "Se descargó el manifiesto con 18 aeronaves."
    )
    expect(click).toHaveBeenCalledTimes(1)
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toMatch(/^manifiesto-flota-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})

describe("Aeronaves: estados de datos", () => {
  it("si la lista falla, avisa y los indicadores siguen", async () => {
    aircraftData.overrides.getAircraft = fail
    renderRoute(PATHS.superAdmin.aeronaves)

    expect(
      await screen.findByText("No se pudieron cargar las aeronaves.")
    ).toHaveAttribute("role", "alert")
    expect(await screen.findByText("Total aeronaves")).toBeInTheDocument()
  })

  it("si los indicadores fallan, avisa y la tabla sigue", async () => {
    aircraftData.overrides.getAircraftStats = fail
    renderRoute(PATHS.superAdmin.aeronaves)

    expect(
      await screen.findByText("No se pudieron cargar los indicadores.")
    ).toHaveAttribute("role", "alert")
    expect(await screen.findByRole("table")).toBeInTheDocument()
  })
})

describe("Aeronaves: registrar y editar", () => {
  const openRegister = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "Registrar Aeronave" }))
    return within(
      await screen.findByRole("dialog", { name: "Registrar aeronave" })
    )
  }

  it("valida el registro: foto, obligatorios, matrícula FAA y motivo del mantenimiento", async () => {
    const { user } = await renderPage()
    const form = await openRegister(user)
    const registration = await form.findByLabelText(/^Matrícula/)

    // Sin foto: solo el espacio vacío para elegirla.
    expect(form.getByText("Sin foto")).toBeInTheDocument()
    expect(form.queryByRole("img")).not.toBeInTheDocument()

    await user.click(form.getByRole("button", { name: "Registrar aeronave" }))
    await waitFor(() => expect(registration).toHaveFocus())
    expect(registration).toHaveAccessibleDescription(
      "Matrícula FAA: empieza por N. Ingresa la matrícula."
    )
    expect(
      form.getByLabelText(/^Año de fabricación/)
    ).toHaveAccessibleDescription("Ingresa el año de fabricación.")
    expect(
      form.getByLabelText(/^En la flota desde/)
    ).toHaveAccessibleDescription("Ingresa la fecha de llegada a la flota.")
    expect(form.getByLabelText("Subir foto")).toHaveAccessibleDescription(
      "PNG, JPG o WEBP de hasta 2 MB. Sube la foto de la aeronave."
    )

    await user.type(registration, "HK5342")
    await user.type(form.getByLabelText(/^Año de fabricación/), "1970")
    await user.click(form.getByRole("radio", { name: "En mantenimiento" }))
    await user.click(form.getByRole("button", { name: "Registrar aeronave" }))
    await waitFor(() =>
      expect(registration).toHaveAccessibleDescription(
        "Matrícula FAA: empieza por N. Matrícula no válida. Usa el formato FAA, ej. N391DN."
      )
    )
    expect(
      form.getByText("Selecciona el motivo del mantenimiento.")
    ).toBeInTheDocument()
    expect(
      form.getByLabelText(/^Año de fabricación/)
    ).toHaveAccessibleDescription(
      `Usa un año entre 1980 y el actual, ej. 2021.`
    )
    expect(lastCall("createAircraft")).toBeUndefined()
  })

  it("registra una aeronave con su foto: avisa, queda primera y suben los indicadores", async () => {
    stubObjectUrls("blob:foto-n402dx")
    const user = userEvent.setup({ applyAccept: false })
    renderRoute(PATHS.superAdmin.aeronaves)
    await screen.findByRole("table")
    const form = await openRegister(user)

    // Una foto que no es imagen no se acepta.
    await user.upload(
      await form.findByLabelText("Subir foto"),
      new File(["x"], "ficha.pdf", { type: "application/pdf" })
    )
    expect(
      await form.findByText(
        "Formato no válido. Sube una imagen PNG, JPG o WEBP."
      )
    ).toBeInTheDocument()

    await user.upload(
      form.getByLabelText("Subir foto"),
      new File(["png"], "n402dx.png", { type: "image/png" })
    )
    expect(
      await form.findByRole("img", { name: "Foto de la aeronave" })
    ).toHaveAttribute("src", "blob:foto-n402dx")
    await user.type(form.getByLabelText(/^Matrícula/), "n402dx")
    await user.type(form.getByLabelText(/^Número de serie/), "2041")
    await user.selectOptions(form.getByLabelText(/^Modelo/), "a330neo")
    await user.selectOptions(form.getByLabelText(/^Base principal/), "SEA")
    await user.type(form.getByLabelText(/^Año de fabricación/), "2020")
    await user.type(form.getByLabelText(/^En la flota desde/), "2021-03-15")
    await user.click(form.getByRole("button", { name: "Registrar aeronave" }))

    expect(await findToast("Aeronave registrada")).toHaveTextContent(
      "N402DX quedó en la flota con base en Seattle (SEA)."
    )
    const [input] = lastCall("createAircraft") ?? []
    expect(input).toMatchObject({
      registration: "N402DX",
      msn: "2041",
      modelId: "a330neo",
      baseCode: "SEA",
      manufactureYear: 2020,
      inFleetSince: "2021-03-15",
      condition: "operativa",
      maintenanceType: null,
    })
    // La foto no va en el formulario: se sube después, con el id de la aeronave nueva.
    expect(input).not.toHaveProperty("photo")
    const [photoId, photoFile] = lastCall("uploadAircraftPhoto") ?? []
    expect(photoId).toBe((await lastCreated()).id)
    expect((photoFile as File).name).toBe("n402dx.png")
    await waitFor(() => expect(registrations()[0]).toBe("N402DX"))
    expect(rowOf("N402DX").querySelector("img")).toHaveAttribute(
      "src",
      "blob:foto-n402dx"
    )
    expect(
      await screen.findByRole("button", { name: "Todas (19)" })
    ).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it("edita una aeronave: muestra su foto actual y la envía a mantenimiento", async () => {
    const { user } = await renderPage()
    const tableSrc = rowOf("N411DX").querySelector("img")?.getAttribute("src")

    // Editar se abre desde el informe.
    await user.click(
      screen.getByRole("button", { name: "Ver informe de N411DX" })
    )
    const report = within(
      await screen.findByRole("dialog", {
        name: "Informe de aeronave · N411DX",
      })
    )
    await report.findByRole("region", { name: "Datos de la aeronave" })
    await user.click(report.getByRole("button", { name: "Editar" }))
    const form = within(
      await screen.findByRole("dialog", { name: "Editar aeronave N411DX" })
    )
    // Al editar se ve la foto actual (la misma de la tabla) y solo se puede cambiar.
    expect(
      await form.findByRole("img", { name: "Foto de la aeronave" })
    ).toHaveAttribute("src", tableSrc)
    expect(form.queryByText("Sin foto")).not.toBeInTheDocument()
    expect(form.getByLabelText("Cambiar foto")).toBeInTheDocument()
    expect(
      form.queryByRole("button", { name: "Quitar foto" })
    ).not.toBeInTheDocument()
    await user.click(form.getByRole("radio", { name: "En mantenimiento" }))
    // Los motivos vienen del catálogo, en palabras claras.
    expect(
      within(form.getByLabelText(/^Motivo del mantenimiento/))
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual([
      "Selecciona…",
      "Problemas con el motor",
      "Daño en el ala",
      "Tren de aterrizaje",
      "Daño en el fuselaje",
      "Falla eléctrica",
      "Falla hidráulica",
      "Revisión programada",
    ])
    await user.selectOptions(
      form.getByLabelText(/^Motivo del mantenimiento/),
      "electrico"
    )
    await user.type(
      form.getByLabelText(/^Descripción del problema/),
      "Pantallas de cabina se apagan en tierra."
    )
    await user.click(form.getByRole("button", { name: "Guardar cambios" }))

    expect(await findToast("Aeronave actualizada")).toHaveTextContent(
      "Los cambios de N411DX ya están vigentes."
    )
    await waitFor(() =>
      expect(rowOf("N411DX")).toHaveTextContent(
        "En mantenimientoFalla eléctrica"
      )
    )
    expect(lastCall("updateAircraft")?.[1]).toMatchObject({
      condition: "mantenimiento",
      maintenanceType: "electrico",
      maintenanceNote: "Pantallas de cabina se apagan en tierra.",
    })
    // El informe ya muestra el mantenimiento (orden nueva, sin tareas hechas).
    await user.click(
      screen.getByRole("button", { name: "Ver informe de N411DX" })
    )
    const maintenance = within(
      await screen.findByRole("region", { name: "Mantenimiento" })
    )
    expect(
      maintenance.getByText("Pantallas de cabina se apagan en tierra.")
    ).toBeInTheDocument()
    expect(
      maintenance.getByRole("progressbar", {
        name: "0 de 4 tareas completadas",
      })
    ).toBeInTheDocument()
  })

  it("marca las tareas y, con todas hechas, libera el avión a servicio", async () => {
    const { user } = await renderPage()

    await user.click(
      screen.getByRole("button", { name: "Ver informe de N271SY" })
    )
    const maintenance = within(
      await screen.findByRole("region", { name: "Mantenimiento" })
    )
    const release = maintenance.getByRole("button", {
      name: "Liberar a servicio",
    })
    expect(release).toBeDisabled()

    // Marca las tres que faltan; cada una se guarda y sube el avance.
    for (const name of [
      "Cambio de las piezas dañadas",
      "Prueba del motor en tierra",
      "Vuelo de prueba y liberación a servicio",
    ]) {
      await user.click(maintenance.getByRole("checkbox", { name }))
      await waitFor(() =>
        expect(maintenance.getByRole("checkbox", { name })).toBeChecked()
      )
    }
    expect(lastCall("setMaintenanceTask")).toEqual(["ac-03", 4, true])
    expect(
      maintenance.getByRole("progressbar", {
        name: "5 de 5 tareas completadas",
      })
    ).toHaveAttribute("aria-valuenow", "100")

    await waitFor(() => expect(release).toBeEnabled())
    await user.click(release)

    expect(await findToast("Aeronave liberada a servicio")).toHaveTextContent(
      "N271SY volvió a estar operativa."
    )
    // Ya no está en mantenimiento: la reparación pasó al historial.
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Mantenimiento" })
      ).not.toBeInTheDocument()
    )
    expect(
      screen.getByRole("region", { name: "Historial de mantenimientos" })
    ).toHaveTextContent("Problemas con el motor")
    // Al cerrar el informe, la tabla ya lo muestra operativo.
    await user.click(screen.getByRole("button", { name: "Cerrar" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() =>
      expect(rowOf("N271SY")).not.toHaveTextContent("En mantenimiento")
    )
    expect(
      await screen.findByRole("button", { name: /^Mantenimiento \(\d+\)/ })
    ).toBeInTheDocument()
  })

  it("la papelera pide confirmación y elimina la aeronave", async () => {
    const { user } = await renderPage()

    // «Cancelar» no elimina nada.
    await user.click(
      screen.getByRole("button", { name: "Eliminar aeronave N827DN" })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Desea eliminar la aeronave N827DN?",
    })
    expect(confirm).toHaveTextContent(
      "Se borrarán también su mantenimiento y su historial."
    )
    await user.click(within(confirm).getByRole("button", { name: "Cancelar" }))
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(lastCall("deleteAircraft")).toBeUndefined()

    // «Eliminar» la quita de la flota.
    const totalBefore = await screen.findByRole("button", {
      name: /^Todas \(\d+\)/,
    })
    const before = Number(totalBefore.textContent?.match(/\d+/)?.[0])
    await user.click(
      screen.getByRole("button", { name: "Eliminar aeronave N827DN" })
    )
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Desea eliminar la aeronave N827DN?",
        })
      ).getByRole("button", { name: "Eliminar" })
    )

    expect(await findToast("Aeronave eliminada")).toHaveTextContent(
      "N827DN ya no forma parte de la flota."
    )
    expect(lastCall("deleteAircraft")).toEqual(["ac-04"])
    await waitFor(() => expect(registrations()).not.toContain("N827DN"))
    expect(
      await screen.findByRole("button", { name: `Todas (${before - 1})` })
    ).toBeInTheDocument()
  })
})
