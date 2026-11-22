import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  EMPTY_CERTIFICATION,
  MY_CERTIFICATION,
  mockMyCertification,
  mockMyCertificationError,
  TODAY,
} from "../mocks/crewFlightsApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"

// FE-4 (docs/specs/cierre-pendientes.md): Certificaciones del tripulante con la sesión
// real, desde GET /api/crew/certifications/me.
// - Cada certificado de certificate_details es una fila con el estado del expediente
//   («Verificado» o «Por verificar»); el backend no tiene emisor, alcance ni vencimiento
//   de licencias, así que no se inventan («Permanente», «No expira», «Vitalicio»).
// - El certificado médico (medical_expires_on) es el único vencimiento real.
// - Las habilitaciones (ratings) y el nivel de inglés OACI salen como «Registrado».
// - La tarjeta de sincronización pasa a «Verificación del expediente» (sin API, hora ni
//   hash inventados) y la de instrucción no muestra contactos de ejemplo.

const LAZY = { timeout: 3000 }
const H1 = "Certificaciones y Licencias"

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const loadingStatuses = (main: HTMLElement) =>
  within(main)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(normalize(element.textContent)))

const list = () => screen.getByRole("list", { name: "Licencias" })

const rowNames = () =>
  within(list())
    .getAllByRole("heading", { level: 3 })
    .map((heading) => normalize(heading.textContent))

const rowOf = (name: string) => {
  const heading = within(list()).getByRole("heading", { level: 3, name })
  const article = heading.closest("article")
  expect(article, `fila de «${name}»`).not.toBeNull()
  return article as HTMLElement
}

const openPage = async () => {
  useAuthStore.getState().setUser(REAL_USERS.crew)
  renderRoute(PATHS.tripulante.certificaciones)
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return main
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("FE-4: lista de Certificaciones con la sesión real", () => {
  it("FE-4: lista los certificados, el médico, la habilitación y el inglés de certifications/me", async () => {
    const calls = mockMyCertification()
    await openPage()

    expect(rowNames()).toEqual([
      "Airline Transport Pilot (ATP)",
      "Instrument Rating (IR)",
      "Multi-Engine (ME)",
      "Certificado médico",
      "Habilitación de tipo A320",
      "Inglés OACI nivel 5",
    ])
    expect(calls()).toBeGreaterThan(0)
  })

  it("FE-4: la licencia lleva su número y el estado «Verificado», sin vencimiento ni emisor inventados", async () => {
    mockMyCertification()
    const main = await openPage()

    const text = normalize(rowOf("Airline Transport Pilot (ATP)").textContent)
    expect(text).toContain("Licencia N.º 1234567")
    expect(text).toContain("Verificado")
    expect(text).toContain("Sin fecha")
    expect(text).toContain("Sin vencimiento registrado")
    for (const invented of [
      "Permanente",
      "No expira",
      "Vitalicio",
      "Aeronáutica Civil",
      "Aerocivil",
      "RAC",
    ]) {
      expect(main).not.toHaveTextContent(invented)
    }
  })

  it("FE-4: el certificado médico vence el 12 Dic 2026: «Restan 20 días» y «Próximo vencimiento»", async () => {
    mockMyCertification()
    await openPage()

    const text = normalize(rowOf("Certificado médico").textContent)
    expect(text).toContain("12 Dic 2026")
    expect(text).toContain("Restan 20 días")
    expect(text).toContain("Próximo vencimiento")
  })

  it("FE-4: con la certificación sin cotejar, los certificados dicen «Por verificar»", async () => {
    mockMyCertification({
      ...MY_CERTIFICATION,
      status: "pending_verification",
    })
    await openPage()

    expect(rowOf("Instrument Rating (IR)")).toHaveTextContent("Por verificar")
  })

  it("FE-4: el detalle de la licencia muestra el número, el estado y la copia, sin firma PKI ni descarga de ejemplo", async () => {
    mockMyCertification()
    const user = userEvent.setup()
    await openPage()

    const row = rowOf("Airline Transport Pilot (ATP)")
    await user.click(
      within(row).getByRole("button", {
        name: "Ver certificado de Airline Transport Pilot (ATP)",
      })
    )

    const text = normalize(row.textContent)
    expect(text).toContain("1234567")
    expect(text).toContain("certificado-faa.pdf")
    expect(text).not.toContain("PKI")
    expect(
      within(row).queryByRole("button", { name: /Descargar PDF/ })
    ).not.toBeInTheDocument()
  })

  it("FE-4: el resumen cuenta 5 al día, 1 próximo a vencer (el médico) y 0 vencidos", async () => {
    mockMyCertification()
    const main = await openPage()

    const card = (title: RegExp) => {
      const heading = within(main).getByRole("heading", {
        level: 2,
        name: title,
      })
      return normalize(heading.parentElement?.parentElement?.textContent ?? "")
    }
    expect(card(/^Vigente \/ Al día$/)).toContain("5 Certificados")
    expect(card(/^Próximo a vencer/)).toContain("1 Certificado")
    expect(card(/^Próximo a vencer/)).toContain("Certificado médico")
    expect(card(/^Vencido \/ No apto$/)).toContain("0 Certificados")
  })

  it.each([
    {
      label: "sin certificación ni datos del perfil",
      body: EMPTY_CERTIFICATION,
    },
    { label: "404 (sin perfil de crew)", body: null },
  ])(
    "FE-4: $label se ve «No hay licencias cargadas en el expediente.» y ningún alert",
    async ({ body }) => {
      mockMyCertification(body)
      const main = await openPage()

      await waitFor(() =>
        expect(main).toHaveTextContent(
          "No hay licencias cargadas en el expediente."
        )
      )
      expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    }
  )

  it("FE-4: si certifications/me falla, la lista muestra «No se pudieron cargar las licencias.» en un alert", async () => {
    mockMyCertificationError()
    const main = await openPage()

    expect(
      within(main)
        .queryAllByRole("alert")
        .map((alert) => normalize(alert.textContent))
    ).toContain("No se pudieron cargar las licencias.")
  })
})

describe("FE-4: tarjetas informativas con la sesión real", () => {
  it("FE-4: «Verificación del expediente» muestra el estado real, sin API FAA, hora ni hash de ejemplo", async () => {
    mockMyCertification()
    const main = await openPage()

    const heading = within(main).getByRole("heading", {
      level: 2,
      name: "Verificación del expediente",
    })
    const card = normalize(heading.parentElement?.textContent ?? "")
    expect(card).toContain("Verificado")
    expect(main).not.toHaveTextContent("API FAA conectada")
    expect(main).not.toHaveTextContent("Hash:")
    expect(main).not.toHaveTextContent("Última comprobación")
  })

  it("FE-4: con la certificación sin cotejar, la tarjeta dice «Por verificar»", async () => {
    mockMyCertification({
      ...MY_CERTIFICATION,
      status: "pending_verification",
    })
    const main = await openPage()

    const heading = within(main).getByRole("heading", {
      level: 2,
      name: "Verificación del expediente",
    })
    expect(heading.parentElement).toHaveTextContent("Por verificar")
  })

  it("FE-4: la tarjeta de instrucción no muestra el correo ni la extensión de ejemplo", async () => {
    mockMyCertification()
    const main = await openPage()

    expect(
      within(main).getByRole("heading", {
        level: 2,
        name: "Jefatura de Instrucción y Entrenamiento",
      })
    ).toBeInTheDocument()
    expect(main).not.toHaveTextContent("instruccion@aircrew.aero")
    expect(main).not.toHaveTextContent("Ext. 4022")
  })
})

describe("Revisión final de FE-4: textos de la sesión real sin atribuir a la FAA la verificación interna", () => {
  it("con la sesión real, la cabecera, la columna de estado y la tarjeta del expediente hablan de la administración de AirCrew, no de la FAA", async () => {
    mockMyCertification()
    const main = await openPage()

    const text = normalize(main.textContent)
    expect(text).toContain("Estado del expediente")
    expect(text).toContain("verificado por la administración de AirCrew")
    for (const fragment of [
      "Estado FAA",
      "Expediente FAA",
      "Auditoría FAA",
      "auditado por la",
    ]) {
      expect(text).not.toContain(fragment)
    }
    const heading = within(main).getByRole("heading", {
      level: 2,
      name: "Verificación del expediente",
    })
    expect(normalize(heading.parentElement?.textContent ?? "")).toMatch(
      /^Verificación del expedienteExpediente/
    )
  })
})
