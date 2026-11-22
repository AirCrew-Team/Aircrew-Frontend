import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  ABSENCES_URL,
  absenceError,
  type ApiAbsence,
  COVERED_ABSENCE,
  REPORTED_ABSENCE,
} from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { loadingStatuses, normalize } from "./realAbsencesTestUtils"

// Spec cierre-pendientes, FE-3: el tablero de Ausencias del supervisor (sesión real) pide
// solo las ausencias por fechas (`kind=dates`), así no repite la ausencia por fechas con
// sus hijas por vuelo; `pending_ack` va a «Esperando confirmación» (columna y etiqueta
// propias, no «Por aprobar») y `cancelled` no aparece.

const PENDING = "Por aprobar"
const WAITING = "Esperando confirmación"
const EMPTY_BOARD = "No hay ausencias reportadas."
const DETAIL = /^Ver detalle/

// Fila del backend con los campos de FE-3 (kind y parent_absence_id).
type Row = ApiAbsence & {
  kind?: "flight" | "dates"
  parent_absence_id?: string | null
}

// Hija por vuelo de REPORTED_ABSENCE: mismo tripulante y mismo motivo, con vuelo.
const CHILD_ABSENCE: Row = {
  ...REPORTED_ABSENCE,
  id: "abs-1-vuelo",
  kind: "flight",
  parent_absence_id: REPORTED_ABSENCE.id,
  start_date: null,
  end_date: null,
  flight_id: "f-1",
  flight_number: "DL-1001",
  flight_departure_at: "2026-11-21T13:00:00.000Z",
  attachment: null,
}

const PENDING_ACK_ABSENCE: Row = {
  ...REPORTED_ABSENCE,
  id: "abs-3",
  crew_user_id: "u-real-crew-4",
  crew_name: "Marta Salas Vega",
  employee_code: "EMP-300",
  status: "pending_ack",
  replacement_user_id: "u-real-crew-5",
  replacement_name: "Iván Torres Gil",
  attachment: null,
}

const CANCELLED_ABSENCE: Row = {
  ...COVERED_ABSENCE,
  id: "abs-4",
  crew_user_id: "u-real-crew-6",
  crew_name: "Julián Ortiz Mora",
  employee_code: "EMP-400",
  status: "cancelled",
  replacement_user_id: null,
  replacement_name: null,
  covered_at: null,
}

// Como el backend: sin `kind` devuelve todas (por fechas y por vuelo); con `kind`, solo las
// de ese tipo. Guarda el `kind` de cada petición a la lista.
const mockBackend = (rows: Row[]) => {
  const kinds: (string | null)[] = []
  const kindOf = (row: Row) => row.kind ?? (row.flight_id ? "flight" : "dates")
  server.use(
    http.get(ABSENCES_URL, ({ request }) => {
      const kind = new URL(request.url).searchParams.get("kind")
      kinds.push(kind)
      return HttpResponse.json(
        kind ? rows.filter((row) => kindOf(row) === kind) : rows
      )
    }),
    http.get(`${ABSENCES_URL}/:id`, ({ params }) => {
      const absence = rows.find((row) => row.id === params.id)
      return absence
        ? HttpResponse.json(absence)
        : absenceError(404, "Ausencia no encontrada.")
    })
  )
  return kinds
}

const openBoard = async (rows: Row[]) => {
  const kinds = mockBackend(rows)
  const user = userEvent.setup()
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  renderRoute(PATHS.superVisor.ausencias)
  await screen.findByRole("heading", { level: 1, name: "Ausencias" })
  const main = screen.getByRole("main")
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  return { user, main, kinds }
}

const resultsStatus = (main: HTMLElement) =>
  within(main)
    .getAllByRole("status")
    .find((element) => /ausencias?$/.test(normalize(element.textContent)))

describe("FE-3: el tablero pide las ausencias por fechas", () => {
  it("pide GET /api/crew/absences con kind=dates", async () => {
    const { main, kinds } = await openBoard([
      { ...REPORTED_ABSENCE, kind: "dates" },
      CHILD_ABSENCE,
    ])
    await within(main).findAllByRole("article")

    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((kind) => kind === "dates")).toBe(true)
  })

  it("una ausencia por fechas con su hija por vuelo se ve una sola vez", async () => {
    const { main } = await openBoard([
      { ...REPORTED_ABSENCE, kind: "dates" },
      CHILD_ABSENCE,
    ])

    const pending = await within(main).findByRole("region", {
      name: `${PENDING} (1)`,
    })
    expect(
      within(main).getAllByRole("article", { name: REPORTED_ABSENCE.crew_name })
    ).toHaveLength(1)
    expect(pending).toHaveTextContent("20 nov – 22 nov · 3 días")
    expect(main).not.toHaveTextContent("DL-1001")
    expect(normalize(resultsStatus(main)?.textContent ?? "")).toBe("1 ausencia")
  })
})

describe("FE-3: pending_ack es «Esperando confirmación»", () => {
  it("una ausencia pending_ack va a la columna «Esperando confirmación», no a «Por aprobar»", async () => {
    const { main } = await openBoard([
      { ...REPORTED_ABSENCE },
      PENDING_ACK_ABSENCE,
      { ...COVERED_ABSENCE },
    ])

    const waiting = await within(main).findByRole("region", {
      name: `${WAITING} (1)`,
    })
    expect(within(waiting).getAllByRole("article")).toEqual([
      within(waiting).getByRole("article", {
        name: PENDING_ACK_ABSENCE.crew_name ?? "",
      }),
    ])
    const pending = within(main).getByRole("region", { name: `${PENDING} (1)` })
    expect(
      within(pending).queryByRole("article", {
        name: PENDING_ACK_ABSENCE.crew_name ?? "",
      })
    ).toBeNull()
  })

  it("la etiqueta de estado dice «Esperando confirmación» (con texto, no solo color) en la tarjeta y en el popup", async () => {
    const { user, main } = await openBoard([PENDING_ACK_ABSENCE])

    const article = await within(main).findByRole("article", {
      name: PENDING_ACK_ABSENCE.crew_name ?? "",
    })
    expect(within(article).getByText(WAITING)).toBeInTheDocument()
    expect(article).not.toHaveTextContent("Pendiente de reemplazo")

    await user.click(within(article).getByRole("button", { name: DETAIL }))
    const dialog = await screen.findByRole("dialog")
    await waitFor(() =>
      expect(dialog).toHaveTextContent(PENDING_ACK_ABSENCE.crew_name ?? "")
    )
    await waitFor(() => expect(loadingStatuses(dialog)).toHaveLength(0))
    expect(within(dialog).getByText(WAITING)).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent("Pendiente de reemplazo")
  })
})

describe("FE-3: cancelled no aparece en el tablero", () => {
  it("una ausencia cancelada no sale en ninguna columna ni en la cuenta de resultados", async () => {
    const { main } = await openBoard([
      { ...REPORTED_ABSENCE },
      CANCELLED_ABSENCE,
    ])

    await within(main).findByRole("region", { name: `${PENDING} (1)` })
    expect(
      within(main).queryByRole("article", {
        name: CANCELLED_ABSENCE.crew_name ?? "",
      })
    ).toBeNull()
    expect(within(main).getAllByRole("article")).toHaveLength(1)
    expect(normalize(resultsStatus(main)?.textContent ?? "")).toBe("1 ausencia")
  })

  it("si solo hay ausencias canceladas se muestra el estado vacío del tablero", async () => {
    const { main } = await openBoard([CANCELLED_ABSENCE])

    expect(await within(main).findByText(EMPTY_BOARD)).toBeInTheDocument()
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
    expect(within(main).queryAllByRole("region")).toHaveLength(0)
  })
})
