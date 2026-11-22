import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  EMPTY_CERTIFICATION,
  mockAcknowledge,
  mockMyAssignments,
  mockMyCertification,
  mockMyCertificationError,
  mockNextAssignment,
  mockNextAssignmentError,
  REPLACEMENT_ASSIGNMENT,
  SCHEDULED_ASSIGNMENT,
  TODAY,
} from "../mocks/crewFlightsApi"
import { crewMemberHandler, REAL_USERS } from "../mocks/profileApi"
import { findToast } from "../utils/toasts"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// FE-4 (docs/specs/cierre-pendientes.md): Inicio del tripulante con la sesión real.
// - Próximo vuelo: GET /api/flights/assignments/me/next (404 = sin vuelos).
// - Asignación de reemplazo: GET /api/flights/assignments/me?replacement=true&acknowledged=false
//   &status=upcoming (I-3: sin status saldrían reemplazos cancelados o ya volados);
//   «Enterado» hace POST /api/flights/assignments/:id/acknowledge, avisa con un toast y
//   vuelve a pedir las asignaciones. Un 409 already_acknowledged (ya se confirmó, p. ej.
//   desde otra pestaña) cuenta como éxito.
// - Certificaciones: GET /api/crew/certifications/me.

const BANNER = "Asignación de reemplazo"
const ACK_TOAST = "Asignación del vuelo DL2201 marcada como enterada"
const ACK_ERROR_TOAST =
  "No se pudo marcar como enterada la asignación del vuelo DL2201."

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const loadingStatuses = (main: HTMLElement) =>
  within(main)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(normalize(element.textContent)))

const articleWithHeading = (name: string) => {
  const heading = screen.getByRole("heading", { level: 2, name })
  const article = heading.closest("article")
  expect(article, `tarjeta con «${name}»`).not.toBeNull()
  return article as HTMLElement
}

const openHome = async () => {
  server.use(crewMemberHandler())
  useAuthStore.getState().setUser(REAL_USERS.crew)
  renderRoute(PATHS.tripulante.inicio)
  await screen.findByRole("heading", {
    level: 1,
    name: `${REAL_USERS.crew.displayName}, Bienvenido a AirCrew`,
  })
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return main
}

// Todo con datos, salvo lo que cada test cambie después.
const mockAll = () => {
  const assignments = mockMyAssignments()
  mockNextAssignment()
  mockMyCertification()
  return { assignments }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("FE-4: próximo vuelo con la sesión real", () => {
  it("FE-4: muestra el vuelo de me/next con ruta, aeropuertos, salida UTC, puerta, rol y «Mañana»", async () => {
    mockAll()
    await openHome()

    const card = articleWithHeading("DL2201")
    const text = normalize(card.textContent)
    for (const fragment of [
      "Itinerario Confirmado",
      "Mañana",
      "ATL → LAX",
      "Atlanta Hartsfield-Jackson a Los Angeles Intl",
      "16:15 UTC",
      "Puerta B12",
      "Primer Oficial",
    ]) {
      expect(text).toContain(fragment)
    }
  })

  it("FE-4: un vuelo sin puerta dice «Por asignar»", async () => {
    mockMyAssignments()
    mockNextAssignment(SCHEDULED_ASSIGNMENT)
    mockMyCertification()
    await openHome()

    expect(normalize(articleWithHeading("DL1102").textContent)).toContain(
      "Por asignar"
    )
  })

  it("FE-4: con 404 (sin vuelos próximos) se ve «No tienes vuelos programados.» con la etiqueta «Próximo vuelo»", async () => {
    mockMyAssignments()
    mockNextAssignment(null)
    mockMyCertification()
    const main = await openHome()

    const card = articleWithHeading("Próximo vuelo")
    expect(card).toHaveTextContent("No tienes vuelos programados.")
    expect(main).not.toHaveTextContent("Itinerario Confirmado")
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
  })

  it("FE-4: si me/next falla, la tarjeta muestra «No se pudo cargar el próximo vuelo.» en un alert", async () => {
    mockMyAssignments()
    mockNextAssignmentError()
    mockMyCertification()
    const main = await openHome()

    expect(
      within(main)
        .queryAllByRole("alert")
        .map((alert) => normalize(alert.textContent))
    ).toEqual(["No se pudo cargar el próximo vuelo."])
  })
})

describe("FE-4: asignación de reemplazo con la sesión real", () => {
  it("FE-4: pide los reemplazos sin «Enterado» y muestra el vuelo, la salida, el equipo, el rol, el bloque y el motivo", async () => {
    const { assignments } = mockAll()
    await openHome()

    const banner = await screen.findByRole("region", { name: BANNER })
    expect(
      assignments.map((query) => Object.fromEntries(new URLSearchParams(query)))
    ).toContainEqual({
      replacement: "true",
      acknowledged: "false",
      status: "upcoming",
    })
    const text = normalize(banner.textContent)
    for (const fragment of [
      "Vuelo DL2201",
      "Mañana, 16:15 UTC (11:15 local)",
      "Airbus A321neo",
      "Primer Oficial",
      "4h 55m",
      "Incapacidad médica del titular. Aprobada por Sara Gómez Ruiz.",
    ]) {
      expect(text).toContain(fragment)
    }
    // El vuelo propio (no reemplazo) no sale en el banner.
    expect(text).not.toContain("DL1102")
  })

  it("FE-4: «Enterado» hace POST /assignments/asg-1/acknowledge, muestra el toast, quita el banner y vuelve a pedir las asignaciones", async () => {
    const { assignments } = mockAll()
    const acknowledged = mockAcknowledge()
    const user = userEvent.setup()
    await openHome()

    const banner = await screen.findByRole("region", { name: BANNER })
    const before = assignments.length
    await user.click(within(banner).getByRole("button", { name: "Enterado" }))

    await findToast(ACK_TOAST)
    expect(acknowledged).toEqual(["asg-1"])
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: BANNER })
      ).not.toBeInTheDocument()
    )
    await waitFor(() => expect(assignments.length).toBeGreaterThan(before))
  })

  it("FE-4: si el «Enterado» falla, avisa con un toast de error y el banner vuelve a mostrar el vuelo", async () => {
    mockAll()
    mockAcknowledge(409)
    const user = userEvent.setup()
    await openHome()

    const banner = await screen.findByRole("region", { name: BANNER })
    await user.click(within(banner).getByRole("button", { name: "Enterado" }))

    await findToast(ACK_ERROR_TOAST)
    await waitFor(() =>
      expect(screen.getByRole("region", { name: BANNER })).toHaveTextContent(
        "Vuelo DL2201"
      )
    )
  })

  it("I-3: un reemplazo pendiente de un vuelo cancelado o ya volado no pide «Enterado»", async () => {
    const cancelled = {
      ...REPLACEMENT_ASSIGNMENT,
      id: "asg-6",
      flight: { ...REPLACEMENT_ASSIGNMENT.flight, status: "cancelled" },
    } as const
    const flown = {
      ...REPLACEMENT_ASSIGNMENT,
      id: "asg-7",
      flight: {
        ...REPLACEMENT_ASSIGNMENT.flight,
        id: "fl-2101",
        flight_number: "DL2101",
        departure_at: "2026-11-20T16:15:00.000Z",
        arrival_at: "2026-11-20T21:10:00.000Z",
      },
    }
    mockMyAssignments([flown, cancelled])
    mockNextAssignment(null)
    mockMyCertification()
    await openHome()

    expect(
      screen.queryByRole("region", { name: BANNER })
    ).not.toBeInTheDocument()
  })

  it("I-3: si el backend responde 409 already_acknowledged, el «Enterado» cuenta como hecho", async () => {
    mockAll()
    const acknowledged = mockAcknowledge(409, "already_acknowledged")
    const user = userEvent.setup()
    await openHome()

    const banner = await screen.findByRole("region", { name: BANNER })
    await user.click(within(banner).getByRole("button", { name: "Enterado" }))

    await findToast(ACK_TOAST)
    expect(acknowledged).toEqual(["asg-1"])
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: BANNER })
      ).not.toBeInTheDocument()
    )
    expect(screen.queryByText(ACK_ERROR_TOAST)).toBeNull()
  })

  it("FE-4: sin reemplazos pendientes no se pinta el banner", async () => {
    mockMyAssignments([SCHEDULED_ASSIGNMENT])
    mockNextAssignment()
    mockMyCertification()
    await openHome()

    expect(
      screen.queryByRole("region", { name: BANNER })
    ).not.toBeInTheDocument()
  })
})

describe("FE-4: tarjeta de certificaciones con la sesión real", () => {
  it("FE-4: resume certifications/me: aptas, el médico como próximo vencimiento y «Vigente»", async () => {
    mockAll()
    await openHome()

    const card = articleWithHeading("Certificaciones")
    const text = normalize(card.textContent)
    expect(text).toContain("Certificaciones Aptas: 5 Requisitos")
    expect(text).toContain("Certificado médico")
    expect(text).toContain("En 20 días")
    expect(text).toContain("Vigente")
  })

  it.each([
    {
      label: "sin certificación ni datos del perfil",
      body: EMPTY_CERTIFICATION,
    },
    { label: "404 (sin perfil de crew)", body: null },
  ])(
    "FE-4: $label se ve «Aún no tienes certificaciones registradas.»",
    async ({ body }) => {
      mockMyAssignments()
      mockNextAssignment()
      mockMyCertification(body)
      await openHome()

      expect(articleWithHeading("Certificaciones")).toHaveTextContent(
        "Aún no tienes certificaciones registradas."
      )
    }
  )

  it("FE-4: si certifications/me falla, la tarjeta muestra su error en un alert", async () => {
    mockMyAssignments()
    mockNextAssignment()
    mockMyCertificationError()
    const main = await openHome()

    expect(
      within(main)
        .queryAllByRole("alert")
        .map((alert) => normalize(alert.textContent))
    ).toEqual(["No se pudo cargar el resumen de certificaciones."])
  })
})
