import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  ABSENCES_URL,
  absenceError,
  COVERED_ABSENCE,
  REPORTED_ABSENCE,
} from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { loadingStatuses } from "./realAbsencesTestUtils"

// Revisión de ausencias-reales: el backend puede mandar campos en null (nombre si Admin no
// responde; código y cargo por un LEFT JOIN; fechas en las filas antiguas por vuelo), un
// motivo o un estado que el frontend no conoce. El tablero no debe caerse por eso.

const NO_NAME = "Tripulante sin nombre"
const PENDING = "Por aprobar"
const DETAIL = /^Ver detalle/

// ApiAbsence de los mocks no admite null: aquí las filas son objetos sueltos.
type Row = Record<string, unknown> & { id: string }

const mockList = (list: Row[]) =>
  server.use(
    http.get(ABSENCES_URL, () => HttpResponse.json(list)),
    http.get(`${ABSENCES_URL}/:id`, ({ params }) => {
      const absence = list.find((item) => item.id === params.id)
      return absence
        ? HttpResponse.json(absence)
        : absenceError(404, "Ausencia no encontrada.")
    })
  )

const openBoard = async (list: Row[]) => {
  mockList(list)
  const user = userEvent.setup()
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  renderRoute(PATHS.superVisor.ausencias)
  await screen.findByRole("heading", { level: 1, name: "Ausencias" })
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return { user, main }
}

const openDetail = async (
  user: ReturnType<typeof userEvent.setup>,
  article: HTMLElement,
  expectedText: string
) => {
  await user.click(within(article).getByRole("button", { name: DETAIL }))
  const dialog = await screen.findByRole("dialog")
  await waitFor(() => expect(dialog).toHaveTextContent(expectedText))
  await waitFor(() => expect(loadingStatuses(dialog)).toHaveLength(0))
  return dialog
}

const NAMELESS: Row = {
  ...REPORTED_ABSENCE,
  id: "abs-sin-nombre",
  crew_name: null,
  employee_code: null,
  position: null,
}

describe("Revisión: campos en null del backend", () => {
  it("con crew_name, employee_code y position en null la tarjeta se ve con «Tripulante sin nombre» y «—», y la búsqueda sigue funcionando", async () => {
    const { user, main } = await openBoard([NAMELESS, { ...COVERED_ABSENCE }])

    const pending = await within(main).findByRole("region", {
      name: `${PENDING} (1)`,
    })
    const article = within(pending).getByRole("article", { name: NO_NAME })
    expect(article).toHaveTextContent("—")
    expect(article).toHaveTextContent(`Reportó: ${NO_NAME}`)
    expect(article).not.toHaveTextContent("null")
    expect(
      within(article).getByRole("button", { name: `Ver detalle de ${NO_NAME}` })
    ).toBeInTheDocument()

    const search = within(main).getByRole("searchbox", {
      name: "Buscar tripulante",
    })
    await user.type(search, "Pedro")
    await waitFor(() =>
      expect(within(main).queryByRole("article", { name: NO_NAME })).toBeNull()
    )
    expect(
      within(main).getByRole("article", { name: COVERED_ABSENCE.crew_name })
    ).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, "EMP-200")
    expect(
      await within(main).findByRole("article", {
        name: COVERED_ABSENCE.crew_name,
      })
    ).toBeInTheDocument()
    expect(within(main).queryByRole("article", { name: NO_NAME })).toBeNull()
  })

  it("con crew_name, employee_code y position en null el popup muestra «Tripulante sin nombre» y «— · —», sin «null»", async () => {
    const { user, main } = await openBoard([NAMELESS])
    const article = await within(main).findByRole("article", { name: NO_NAME })

    const dialog = await openDetail(user, article, NO_NAME)

    expect(dialog).toHaveTextContent("— · —")
    expect(dialog).not.toHaveTextContent("null")
  })

  it("una fila antigua sin fechas y con flight_number «AV-9001» muestra «Vuelo AV-9001» en la tarjeta y en el popup", async () => {
    const legacy: Row = {
      ...REPORTED_ABSENCE,
      id: "abs-vuelo",
      start_date: null,
      end_date: null,
      flight_number: "AV-9001",
    }
    const { user, main } = await openBoard([legacy])
    const article = await within(main).findByRole("article", {
      name: REPORTED_ABSENCE.crew_name,
    })

    expect(article).toHaveTextContent("Vuelo AV-9001")
    expect(article).not.toHaveTextContent(/null|NaN|undefined/)

    const dialog = await openDetail(user, article, REPORTED_ABSENCE.crew_name)
    expect(dialog).toHaveTextContent("Vuelo AV-9001")
    expect(dialog).not.toHaveTextContent(/null|NaN|undefined/)
  })

  it("una fila sin fechas ni vuelo muestra «Sin fechas» en la tarjeta y en el popup", async () => {
    const noDates: Row = {
      ...REPORTED_ABSENCE,
      id: "abs-sin-fechas",
      start_date: null,
      end_date: null,
      flight_number: null,
    }
    const { user, main } = await openBoard([noDates])
    const article = await within(main).findByRole("article", {
      name: REPORTED_ABSENCE.crew_name,
    })

    expect(article).toHaveTextContent("Sin fechas")
    expect(article).not.toHaveTextContent(/null|NaN|undefined/)

    const dialog = await openDetail(user, article, REPORTED_ABSENCE.crew_name)
    expect(dialog).toHaveTextContent("Sin fechas")
    expect(dialog).not.toHaveTextContent(/null|NaN|undefined/)
  })
})

describe("Revisión: valores que el frontend no conoce", () => {
  it("un motivo desconocido se muestra como «Otro motivo» en la tarjeta y en el popup", async () => {
    const other: Row = { ...REPORTED_ABSENCE, reason: "jury_duty" }
    const { user, main } = await openBoard([other])
    const article = await within(main).findByRole("article", {
      name: REPORTED_ABSENCE.crew_name,
    })

    expect(article).toHaveTextContent("Otro motivo")

    const dialog = await openDetail(user, article, REPORTED_ABSENCE.crew_name)
    expect(dialog).toHaveTextContent("Otro motivo")
  })

  it("un estado desconocido se trata como «Por aprobar» (columna y chip)", async () => {
    const unknown: Row = {
      ...COVERED_ABSENCE,
      id: "abs-estado-raro",
      status: "in_review",
    }
    const { main } = await openBoard([{ ...REPORTED_ABSENCE }, unknown])

    const pending = await within(main).findByRole("region", {
      name: `${PENDING} (2)`,
    })
    const article = within(pending).getByRole("article", {
      name: COVERED_ABSENCE.crew_name,
    })
    expect(article).toHaveTextContent("Pendiente de reemplazo")
  })
})
