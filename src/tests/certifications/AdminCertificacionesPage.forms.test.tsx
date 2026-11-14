import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { findToast } from "../utils/toasts"

// Certificaciones del super admin: ficha (ojo) y formulario para registrar o editar.
// Va en su propio archivo porque guardar cambia los datos simulados en memoria: los
// tests que guardan van al final y cada uno usa un tripulante distinto.

// Llenan el formulario con userEvent: con la máquina cargada pueden pasar de 5 s.
vi.setConfig({ testTimeout: 20_000 })

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.SUPER_ADMIN)
})

type DataFn = (...args: unknown[]) => unknown

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

const renderPage = async (options?: { applyAccept?: boolean }) => {
  const user = userEvent.setup(options)
  renderRoute(PATHS.superAdmin.certificaciones)
  await screen.findByRole("table")
  return user
}

const rowOf = (name: string) =>
  screen.getByText(name).closest("tr") as HTMLElement

const openDetail = async (name: string) => {
  const user = await renderPage()
  await user.click(
    screen.getByRole("button", { name: `Ver certificación de ${name}` })
  )
  const dialog = await screen.findByRole("dialog", { name })
  return { user, dialog }
}

const openRegisterFromToolbar = async (options?: { applyAccept?: boolean }) => {
  const user = await renderPage(options)
  await user.click(
    screen.getByRole("button", { name: "Registrar certificado" })
  )
  const dialog = await screen.findByRole("dialog", {
    name: "Registrar certificado",
  })
  await within(dialog).findByLabelText(/^Tripulante/)
  return { user, dialog }
}

const lastSave = () =>
  certificationsData.calls
    .filter((call) => call.name === "saveCertification")
    .at(-1)?.args

describe("Certificaciones (admin): ficha del ojo", () => {
  it("muestra el certificado FAA, la copia y el historial; sin vencimiento ni enlace a Usuarios", async () => {
    const { dialog } = await openDetail("Diego Salcedo")
    const ficha = within(dialog)

    expect(
      await ficha.findByText("Comandante · Base ATL · AC-1108")
    ).toBeInTheDocument()
    // «Verificado» aparece en la etiqueta del encabezado y en el historial.
    expect(ficha.getAllByText("Verificado")).toHaveLength(2)
    // Número completo, sin ocultar.
    expect(ficha.getByText("2775981")).toBeInTheDocument()
    expect(ficha.getByText("Airline Transport Pilot (ATP)")).toBeInTheDocument()
    expect(
      within(ficha.getByRole("list", { name: "Habilitaciones" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["Instrument Rating (IR)", "Multi-Engine (ME)"])
    expect(ficha.getByText("licencia-diego.pdf")).toBeInTheDocument()
    expect(ficha.getByText("Certificado registrado")).toBeInTheDocument()
    expect(
      ficha.getByText(
        "Admin AirCrew · 20 ago 2026 · cotejado con Airmen Inquiry (registro público FAA)"
      )
    ).toBeInTheDocument()

    expect(ficha.queryByText(/Vencimiento/i)).not.toBeInTheDocument()
    expect(ficha.queryByText(/Ver perfil en Usuarios/)).not.toBeInTheDocument()
    expect(ficha.getByRole("button", { name: "Cerrar" })).toBeInTheDocument()
    expect(ficha.getByRole("button", { name: "Editar" })).toBeInTheDocument()
  })

  it("sin certificado, la ficha lo dice y ofrece registrarlo con el tripulante fijo", async () => {
    const { user, dialog } = await openDetail("Laura Benítez")

    expect(
      await within(dialog).findByText(
        "Este tripulante aún no tiene un certificado FAA registrado."
      )
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar certificado" })
    )

    const form = await screen.findByRole("dialog", {
      name: "Registrar certificado",
    })
    // Tripulante fijo: no hay lista para elegirlo.
    expect(within(form).queryByLabelText(/^Tripulante/)).not.toBeInTheDocument()
    expect(within(form).getByText("Laura Benítez")).toBeInTheDocument()
    // Certificados de un sobrecargo.
    expect(
      within(form)
        .getAllByRole("checkbox")
        .slice(0, 4)
        .map((box) => box.closest("label")?.textContent?.trim())
    ).toEqual([
      "Certificate of Demonstrated Proficiency (CDP)",
      "Liderazgo",
      "Manejo de conflictos",
      "Aduanas / Inmigración",
    ])
  })
})

describe("Certificaciones (admin): formulario de registro", () => {
  it("desde la barra pide elegir el tripulante entre los que no tienen certificado", async () => {
    const { user, dialog } = await openRegisterFromToolbar()
    const form = within(dialog)

    expect(
      within(form.getByLabelText(/^Tripulante/))
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual([
      "Selecciona…",
      "Laura Benítez · Sobrecargo (AC-6014)",
      "Daniel Herrera · Copiloto (AC-4455)",
    ])
    // Sin el texto «Falta: …»: el botón está activo y, al pulsarlo sin tripulante,
    // marca ese campo y lo enfoca.
    expect(form.queryByText(/^Falta:/)).not.toBeInTheDocument()
    await user.click(
      form.getByRole("button", { name: "Guardar sin verificar" })
    )

    const crewSelect = form.getByLabelText(/^Tripulante/)
    await waitFor(() => expect(crewSelect).toHaveFocus())
    expect(crewSelect).toHaveAccessibleDescription("Selecciona el tripulante.")
    expect(lastSave()).toBeUndefined()
  })

  it("valida el número y exige una licencia de piloto (PPL, CPL o ATP)", async () => {
    const { user, dialog } = await openRegisterFromToolbar()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Tripulante/), "AC-4455")
    await user.type(form.getByLabelText(/^Número de certificado/), "12ab")
    await user.click(
      form.getByRole("checkbox", { name: "Instrument Rating (IR)" })
    )
    await user.click(
      form.getByRole("button", { name: "Guardar sin verificar" })
    )

    expect(
      await form.findByText(
        "Usa solo números (de 5 a 10 dígitos), como aparece en la tarjeta."
      )
    ).toBeInTheDocument()
    expect(
      form.getByText(
        "Un piloto necesita al menos una licencia: PPL, CPL o ATP."
      )
    ).toBeInTheDocument()
    expect(lastSave()).toBeUndefined()
  })

  it("para la tripulación de cabina el CDP es obligatorio", async () => {
    const { user, dialog } = await openRegisterFromToolbar()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Tripulante/), "AC-6014")
    await user.type(form.getByLabelText(/^Número de certificado/), "1234567")
    await user.click(form.getByRole("checkbox", { name: "Liderazgo" }))
    await user.click(
      form.getByRole("button", { name: "Guardar sin verificar" })
    )

    expect(
      await form.findByText(
        "El Certificate of Demonstrated Proficiency (CDP) es obligatorio para la tripulación de cabina."
      )
    ).toBeInTheDocument()
  })

  it("la copia acepta PDF o imagen y se puede quitar", async () => {
    const { user, dialog } = await openRegisterFromToolbar({
      applyAccept: false,
    })
    const form = within(dialog)
    await user.selectOptions(form.getByLabelText(/^Tripulante/), "AC-6014")

    await user.upload(
      form.getByLabelText("Adjuntar PDF o imagen"),
      new File(["x"], "notas.txt", { type: "text/plain" })
    )
    expect(
      await form.findByText("Formato no válido. Adjunta un PDF, PNG o JPG.")
    ).toBeInTheDocument()

    await user.upload(
      form.getByLabelText("Adjuntar PDF o imagen"),
      new File(["%PDF"], "licencia-laura.pdf", { type: "application/pdf" })
    )
    expect(form.getByText("licencia-laura.pdf")).toBeInTheDocument()
    await user.click(
      form.getByRole("button", { name: "Quitar licencia-laura.pdf" })
    )
    expect(form.getByLabelText("Adjuntar PDF o imagen")).toBeInTheDocument()
  })

  it("la casilla de verificación cambia el texto del botón", async () => {
    const { user, dialog } = await openRegisterFromToolbar()
    const form = within(dialog)
    await user.selectOptions(form.getByLabelText(/^Tripulante/), "AC-6014")

    await user.click(
      form.getByRole("checkbox", {
        name: "Confirmo que los datos coinciden con la FAA",
      })
    )

    expect(
      form.getByRole("button", { name: "Guardar y verificar" })
    ).toBeInTheDocument()
  })

  it("si guardar falla, avisa sin cerrar la ventana", async () => {
    certificationsData.overrides.saveCertification = () =>
      Promise.reject(new Error("servicio caído"))
    const { user, dialog } = await openRegisterFromToolbar()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Tripulante/), "AC-6014")
    await user.type(form.getByLabelText(/^Número de certificado/), "1234567")
    await user.click(
      form.getByRole("checkbox", {
        name: "Certificate of Demonstrated Proficiency (CDP)",
      })
    )
    await user.click(
      form.getByRole("button", { name: "Guardar sin verificar" })
    )

    expect(
      await form.findByText(
        "No se pudo guardar el certificado. Intenta de nuevo."
      )
    ).toHaveAttribute("role", "alert")
  })

  // A partir de aquí se guardan datos en memoria (un tripulante distinto en cada test).
  it("registrar y verificar: la tabla, los conteos y la ficha se actualizan", async () => {
    const { user, dialog } = await openRegisterFromToolbar()
    const form = within(dialog)

    await user.selectOptions(form.getByLabelText(/^Tripulante/), "AC-4455")
    await user.type(form.getByLabelText(/^Número de certificado/), "5550123")
    await user.click(
      form.getByRole("checkbox", { name: "Commercial Pilot (CPL)" })
    )
    await user.click(form.getByRole("checkbox", { name: "Multi-Engine (ME)" }))
    await user.click(
      form.getByRole("checkbox", {
        name: "Confirmo que los datos coinciden con la FAA",
      })
    )
    await user.click(form.getByRole("button", { name: "Guardar y verificar" }))

    expect(await findToast("Certificado verificado")).toHaveTextContent(
      "La certificación de Daniel Herrera quedó verificada."
    )
    const [crewId, input] = lastSave() ?? []
    expect(crewId).toBe("AC-4455")
    expect(input).toMatchObject({
      licenseNumber: "5550123",
      certificates: expect.arrayContaining(["CPL", "ME"]),
      verified: true,
    })
    await waitFor(() =>
      expect(rowOf("Daniel Herrera")).toHaveTextContent("Verificado")
    )
    expect(rowOf("Daniel Herrera")).toHaveTextContent("5550123")
    expect(
      await screen.findByRole("button", { name: "Verificados (5)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sin certificado (1)" })
    ).toBeInTheDocument()
  })

  it("«Editar» abre el formulario con los datos y guarda los cambios", async () => {
    const { user, dialog } = await openDetail("Juan Pablo Navarro")
    await within(dialog).findByText("3904418")
    await user.click(within(dialog).getByRole("button", { name: "Editar" }))

    const formDialog = await screen.findByRole("dialog", {
      name: "Editar certificado",
    })
    const form = within(formDialog)
    expect(form.getByLabelText(/^Número de certificado/)).toHaveValue("3904418")
    expect(
      form.getByRole("checkbox", { name: "Airline Transport Pilot (ATP)" })
    ).toBeChecked()
    expect(
      form.getByRole("checkbox", { name: "Multi-Engine (ME)" })
    ).toBeChecked()
    expect(
      form.getByRole("checkbox", { name: "Instrument Rating (IR)" })
    ).not.toBeChecked()
    expect(form.getByText("licencia-juan-pablo.pdf")).toBeInTheDocument()

    await user.click(
      form.getByRole("checkbox", { name: "Instrument Rating (IR)" })
    )
    await user.click(
      form.getByRole("checkbox", {
        name: "Confirmo que los datos coinciden con la FAA",
      })
    )
    await user.click(form.getByRole("button", { name: "Guardar y verificar" }))

    await findToast("Certificado verificado")
    const [crewId, input] = lastSave() ?? []
    expect(crewId).toBe("AC-2287")
    expect(input).toMatchObject({
      licenseNumber: "3904418",
      certificates: expect.arrayContaining(["ATP", "ME", "IR"]),
      verified: true,
    })
    await waitFor(() =>
      expect(rowOf("Juan Pablo Navarro")).toHaveTextContent("Verificado")
    )
  })
})
