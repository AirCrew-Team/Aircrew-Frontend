import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  API_CERTIFICATION_ITEMS,
  API_VERIFIED_DETAIL,
  apiError,
  certificationsHandlers,
  certificationUrl,
  CREW_UUIDS,
  uncertifiedDetail,
} from "../mocks/certificationsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { findToast } from "../utils/toasts"

// Pantalla Certificaciones con sesión real de super_admin: cada llamada va al servicio
// crew (MSW simula el backend). Revisa la traducción de valores (estados, áreas,
// historial, nombre), el catálogo del backend, los «—» de lo que llega en null, el PUT
// con la copia en base64 y los errores 400 / 404 / 413.

// Llenan el formulario con userEvent: más margen, solo aquí.
vi.setConfig({ testTimeout: 20_000 })

let listRequests: URL[]

beforeEach(() => {
  useAuthStore.getState().setUser(REAL_USERS.admin)
  const mocked = certificationsHandlers()
  listRequests = mocked.listRequests
  server.use(...mocked.handlers)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const renderPage = async (search = "") => {
  const user = userEvent.setup()
  renderRoute(`${PATHS.superAdmin.certificaciones}${search}`)
  await screen.findByRole("table")
  return user
}

const rowOf = (name: string) =>
  screen.getByText(name).closest("tr") as HTMLElement

// Guarda el cuerpo de cada PUT y responde con `reply`.
const capturePut = (id: string, reply: () => Response) => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.put(certificationUrl(id), async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)
      return reply()
    })
  )
  return bodies
}

const openDetail = async (name: string) => {
  const user = await renderPage()
  await user.click(
    screen.getByRole("button", { name: `Ver certificación de ${name}` })
  )
  const dialog = await screen.findByRole("dialog", { name })
  return { user, ficha: within(dialog) }
}

const openRegister = async () => {
  const user = await renderPage()
  await user.click(
    screen.getByRole("button", { name: "Registrar certificado" })
  )
  const dialog = await screen.findByRole("dialog", {
    name: "Registrar certificado",
  })
  const form = within(dialog)
  await form.findByLabelText(/^Tripulante/)
  return { user, form }
}

const openEdit = async (name: string) => {
  const { user, ficha } = await openDetail(name)
  await user.click(await ficha.findByRole("button", { name: "Editar" }))
  const dialog = await screen.findByRole("dialog", {
    name: "Editar certificado",
  })
  const form = within(dialog)
  await form.findByLabelText(/^Número de certificado/)
  return { user, form }
}

describe("Certificaciones (sesión real): lista e indicadores", () => {
  it("pide la página con page_size=5 y muestra los datos traducidos", async () => {
    await renderPage()

    const params = listRequests.at(-1)?.searchParams
    expect(params?.get("page")).toBe("1")
    expect(params?.get("page_size")).toBe("5")
    expect(params?.has("search")).toBe(false)
    expect(params?.has("status")).toBe(false)

    // Código (no el UUID), cargo, base, licencia, etiquetas del catálogo y estado.
    const diego = rowOf("Diego Salcedo Pérez")
    expect(diego).toHaveTextContent("AC-0001")
    expect(diego).not.toHaveTextContent(CREW_UUIDS.verified)
    expect(diego).toHaveTextContent("Comandante")
    expect(diego).toHaveTextContent("Base ATL")
    expect(diego).toHaveTextContent("2775981")
    expect(diego).toHaveTextContent("IR-cat")
    expect(diego).toHaveTextContent("Verificado")

    expect(rowOf("Sofía Restrepo")).toHaveTextContent("Base —")
    expect(rowOf("Sofía Restrepo")).toHaveTextContent("Por verificar")
    expect(rowOf("Daniel Herrera")).toHaveTextContent("Sin registrar")
  })

  it("sin nombre, correo ni código (admin no respondió) muestra «—»", async () => {
    await renderPage()
    const row = screen
      .getAllByRole("row")
      .find((candidate) => candidate.textContent?.includes("Instructor"))

    expect(row).toBeDefined()
    expect(
      within(row as HTMLElement).getByRole("button", {
        name: "Ver certificación de —",
      })
    ).toBeInTheDocument()
  })

  it("el filtro se traduce al enviarlo y la búsqueda va como search", async () => {
    const user = await renderPage()

    await user.click(screen.getByRole("button", { name: "Por verificar (1)" }))
    await waitFor(() =>
      expect(listRequests.at(-1)?.searchParams.get("status")).toBe(
        "pending_verification"
      )
    )

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar certificación" }),
      "2775981"
    )
    await waitFor(() =>
      expect(listRequests.at(-1)?.searchParams.get("search")).toBe("2775981")
    )
  })

  it("los indicadores y los conteos vienen de total y by_status", async () => {
    await renderPage()

    expect(
      await screen.findByRole("button", { name: "Todos (4)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Verificados (1)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sin certificado (2)" })
    ).toBeInTheDocument()
  })
})

describe("Certificaciones (sesión real): ficha", () => {
  it("muestra la copia con su tamaño y el historial, con «—» si no se sabe quién", async () => {
    const { ficha } = await openDetail("Diego Salcedo Pérez")

    expect(
      await ficha.findByText("Comandante · Base ATL · AC-0001")
    ).toBeInTheDocument()
    expect(ficha.getByText("licencia-diego.pdf")).toBeInTheDocument()
    expect(
      ficha.getByText("Copia del certificado · 240 KB")
    ).toBeInTheDocument()
    expect(
      within(ficha.getByRole("list", { name: "Habilitaciones" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["Instrument Rating (IR) · catálogo", "Multi-Engine (ME)"])
    expect(
      ficha.getByText(/^Ana Torres · 20 ago 2026 · cotejado con Airmen Inquiry/)
    ).toBeInTheDocument()
    expect(ficha.getByText(/^— · 19 ago 2026$/)).toBeInTheDocument()
  })

  it("«Abrir copia» descarga el archivo por el UUID y lo abre en otra pestaña", async () => {
    const requested: string[] = []
    server.use(
      http.get(
        `${certificationUrl(CREW_UUIDS.verified)}/file`,
        ({ request }) => {
          requested.push(request.url)
          return new HttpResponse("%PDF-1.4", {
            headers: { "Content-Type": "application/pdf" },
          })
        }
      )
    )
    // jsdom no tiene createObjectURL: se simula solo en este test.
    const createObjectURL = vi.fn(() => "blob:copia")
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window)
    const { user, ficha } = await openDetail("Diego Salcedo Pérez")

    await user.click(await ficha.findByRole("button", { name: "Abrir copia" }))

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("blob:copia", "_blank")
    )
    expect(requested).toHaveLength(1)
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
  })
})

describe("Certificaciones (sesión real): registrar y editar", () => {
  it("el desplegable sale de /uncertified y el PUT lleva la copia en base64 sin prefijo", async () => {
    const bodies = capturePut(CREW_UUIDS.uncertified, () =>
      HttpResponse.json({
        ...uncertifiedDetail(API_CERTIFICATION_ITEMS.uncertified),
        license_number: "5550123",
        certificates: ["CPL", "ME"],
        status: "verified",
      })
    )
    const { user, form } = await openRegister()

    const options = within(form.getByLabelText(/^Tripulante/))
      .getAllByRole("option")
      .map((option) => option.textContent)
    expect(options).toEqual([
      "Selecciona…",
      "Daniel Herrera · Copiloto (AC-0003)",
      "— · Instructor (—)",
    ])

    await user.selectOptions(
      form.getByLabelText(/^Tripulante/),
      CREW_UUIDS.uncertified
    )
    await user.type(form.getByLabelText(/^Número de certificado/), "5550123")
    await user.click(
      form.getByRole("checkbox", { name: "Commercial Pilot (CPL)" })
    )
    await user.click(form.getByRole("checkbox", { name: "Multi-Engine (ME)" }))
    await user.upload(
      form.getByLabelText("Adjuntar PDF o imagen"),
      new File(["%PDF-1.4"], "licencia.pdf", { type: "application/pdf" })
    )
    await user.click(
      form.getByRole("checkbox", {
        name: "Confirmo que los datos coinciden con la FAA",
      })
    )
    await user.click(form.getByRole("button", { name: "Guardar y verificar" }))

    expect(await findToast("Certificado verificado")).toHaveTextContent(
      "La certificación de Daniel Herrera quedó verificada."
    )
    expect(bodies).toEqual([
      {
        license_number: "5550123",
        certificates: ["CPL", "ME"],
        verified: true,
        file: {
          file_name: "licencia.pdf",
          mime_type: "application/pdf",
          data_base64: "JVBERi0xLjQ=",
        },
      },
    ])
  })

  it("editar sin tocar la copia no envía file; quitar la verificación envía verified: false", async () => {
    const bodies = capturePut(CREW_UUIDS.verified, () =>
      HttpResponse.json({
        ...API_VERIFIED_DETAIL,
        status: "pending_verification",
      })
    )
    const { user, form } = await openEdit("Diego Salcedo Pérez")

    expect(form.getByText("licencia-diego.pdf")).toBeInTheDocument()
    await user.click(
      form.getByRole("checkbox", {
        name: "Confirmo que los datos coinciden con la FAA",
      })
    )
    await user.click(
      form.getByRole("button", { name: "Guardar sin verificar" })
    )

    await findToast("Certificado guardado")
    expect(bodies).toEqual([
      {
        license_number: "2775981",
        certificates: ["ATP", "IR", "ME"],
        verified: false,
      },
    ])
  })

  it("quitar la copia envía file: null", async () => {
    const bodies = capturePut(CREW_UUIDS.verified, () =>
      HttpResponse.json({ ...API_VERIFIED_DETAIL, file: null })
    )
    const { user, form } = await openEdit("Diego Salcedo Pérez")

    await user.click(
      form.getByRole("button", { name: "Quitar licencia-diego.pdf" })
    )
    await user.click(form.getByRole("button", { name: "Guardar y verificar" }))

    await findToast("Certificado verificado")
    expect(bodies[0]).toMatchObject({ file: null })
  })

  it("un 400 muestra el mensaje del backend sin cerrar la ventana", async () => {
    capturePut(CREW_UUIDS.verified, () =>
      apiError("Certificados no permitidos para Comandante: CDP.", 400)
    )
    const { user, form } = await openEdit("Diego Salcedo Pérez")

    await user.click(form.getByRole("button", { name: "Guardar y verificar" }))

    expect(
      await form.findByText("Certificados no permitidos para Comandante: CDP.")
    ).toHaveAttribute("role", "alert")
  })

  it("un 413 dice que el archivo es muy grande", async () => {
    capturePut(CREW_UUIDS.verified, () =>
      HttpResponse.json(null, { status: 413 })
    )
    const { user, form } = await openEdit("Diego Salcedo Pérez")

    await user.click(form.getByRole("button", { name: "Guardar y verificar" }))

    expect(
      await form.findByText("El archivo es muy grande.")
    ).toBeInTheDocument()
  })
})

describe("Certificaciones (sesión real): eliminar", () => {
  it("envía DELETE por el UUID y refresca la lista", async () => {
    const deleted: string[] = []
    server.use(
      http.delete(certificationUrl(CREW_UUIDS.pending), ({ request }) => {
        deleted.push(request.url)
        return new HttpResponse(null, { status: 204 })
      })
    )
    const user = await renderPage()
    const before = listRequests.length

    await user.click(
      screen.getByRole("button", {
        name: "Eliminar la certificación de Sofía Restrepo",
      })
    )
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }))

    expect(await findToast("Certificación eliminada")).toHaveTextContent(
      "Sofía Restrepo quedó sin certificado."
    )
    expect(deleted).toEqual([certificationUrl(CREW_UUIDS.pending)])
    await waitFor(() => expect(listRequests.length).toBeGreaterThan(before))
  })

  it("un 404 muestra el mensaje del backend y refresca la lista", async () => {
    server.use(
      http.delete(certificationUrl(CREW_UUIDS.pending), () =>
        apiError("El tripulante no tiene una certificación registrada.", 404)
      )
    )
    const user = await renderPage()
    const before = listRequests.length

    await user.click(
      screen.getByRole("button", {
        name: "Eliminar la certificación de Sofía Restrepo",
      })
    )
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }))

    expect(
      await within(dialog).findByText(
        "El tripulante no tiene una certificación registrada."
      )
    ).toHaveAttribute("role", "alert")
    await waitFor(() => expect(listRequests.length).toBeGreaterThan(before))
  })
})
