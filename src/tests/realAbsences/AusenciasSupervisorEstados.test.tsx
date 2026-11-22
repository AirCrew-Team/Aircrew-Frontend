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
  COVERED_CHANGES,
  flightAbsenceOf,
  PENDING_ACK_CHANGES,
  REPORTED_ABSENCE,
} from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"
import { loadingStatuses, normalize } from "./realAbsencesTestUtils"

// Spec cierre-pendientes, FE-3 (corregido en la revisión final, I-1): en el backend solo
// cambian de estado las ausencias por vuelo (las hijas, con parent_absence_id): aprobar un
// reemplazo las pasa a pending_ack y su «Enterado» a covered; la ausencia por fechas (el
// padre) se queda en reported. Por eso el tablero pide GET /api/crew/absences sin `kind`
// (una sola petición), enseña los padres y los vuelos reportados sueltos (sin padre), nunca
// las hijas, y el estado de cada padre sale de sus hijas no canceladas: alguna reported →
// «Por aprobar»; si no, alguna pending_ack → «Esperando confirmación»; todas covered →
// «Cubiertas»; sin hijas, su propio estado. Las canceladas no aparecen.

const PENDING = "Por aprobar"
const WAITING = "Esperando confirmación"
const COVERED = "Cubiertas"
const REPORTED_CHIP = "Pendiente de reemplazo"
const COVERED_CHIP = "Cubierta"
const CANCELLED_CHIP = "Cancelada"
const EMPTY_BOARD = "No hay ausencias reportadas."
const DETAIL = /^Ver detalle/

const PARENT = REPORTED_ABSENCE
const PARENT_NAME = REPORTED_ABSENCE.crew_name

// Hijas por vuelo de PARENT en cada estado.
const reportedFlight = (n: number) => flightAbsenceOf(PARENT, n)
const pendingAckFlight = (n: number) =>
  flightAbsenceOf(PARENT, n, PENDING_ACK_CHANGES)
const coveredFlight = (n: number) => flightAbsenceOf(PARENT, n, COVERED_CHANGES)
const cancelledFlight = (n: number) =>
  flightAbsenceOf(PARENT, n, { status: "cancelled" })

// Vuelo reportado directamente por otro tripulante: sin padre ni fechas.
const LOOSE_FLIGHT = {
  ...REPORTED_ABSENCE,
  id: "abs-5",
  crew_user_id: "u-real-crew-7",
  crew_name: "Marta Salas Vega",
  employee_code: "EMP-300",
  kind: "flight",
  parent_absence_id: null,
  start_date: null,
  end_date: null,
  flight_id: "f-9",
  flight_number: "DL1209",
  flight_departure_at: "2026-11-21T15:00:00.000Z",
  attachment: null,
} satisfies ApiAbsence

const CANCELLED_ABSENCE = {
  ...COVERED_ABSENCE,
  id: "abs-4",
  crew_user_id: "u-real-crew-6",
  crew_name: "Julián Ortiz Mora",
  employee_code: "EMP-400",
  status: "cancelled",
  replacement_user_id: null,
  replacement_name: null,
  covered_at: null,
} satisfies ApiAbsence

// Como el backend: sin `kind` devuelve todas (por fechas y por vuelo); con `kind`, solo las
// de ese tipo. Guarda el `kind` de cada petición a la lista. El detalle por id devuelve
// solo la fila, sin sus hijas.
const mockBackend = (rows: ApiAbsence[]) => {
  const kinds: (string | null)[] = []
  server.use(
    http.get(ABSENCES_URL, ({ request }) => {
      const kind = new URL(request.url).searchParams.get("kind")
      kinds.push(kind)
      return HttpResponse.json(
        kind ? rows.filter((row) => row.kind === kind) : rows
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

const openBoard = async (rows: ApiAbsence[]) => {
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

// Columna (region) que contiene la tarjeta del tripulante; comprueba que la tarjeta sale
// una sola vez.
const columnOf = async (main: HTMLElement, crewName: string) => {
  const article = await within(main).findByRole("article", { name: crewName })
  expect(
    within(main).getAllByRole("article", { name: crewName }),
    `«${crewName}» debe verse una sola vez`
  ).toHaveLength(1)
  const regions = within(main)
    .getAllByRole("region")
    .filter((region) => region.contains(article))
  expect(regions).toHaveLength(1)
  return regions[0]
}

describe("I-1: el tablero pide todas las ausencias en una sola petición", () => {
  it("pide GET /api/crew/absences sin kind", async () => {
    const { main, kinds } = await openBoard([PARENT, reportedFlight(1)])
    await within(main).findAllByRole("article")

    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((kind) => kind === null)).toBe(true)
  })

  it("una ausencia por fechas con sus hijas por vuelo se ve una sola vez y sin los vuelos de las hijas", async () => {
    const { main } = await openBoard([
      PARENT,
      reportedFlight(1),
      pendingAckFlight(2),
    ])

    const pending = await within(main).findByRole("region", {
      name: `${PENDING} (1)`,
    })
    expect(
      within(main).getAllByRole("article", { name: PARENT_NAME })
    ).toHaveLength(1)
    expect(within(main).getAllByRole("article")).toHaveLength(1)
    expect(pending).toHaveTextContent("20 nov – 22 nov · 3 días")
    expect(main).not.toHaveTextContent("DL1101")
    expect(normalize(resultsStatus(main)?.textContent ?? "")).toBe("1 ausencia")
  })

  it("un vuelo reportado suelto (sin padre) sí es una tarjeta, con su vuelo", async () => {
    const { main } = await openBoard([PARENT, LOOSE_FLIGHT])

    const region = await columnOf(main, LOOSE_FLIGHT.crew_name)
    expect(region).toHaveAccessibleName(`${PENDING} (2)`)
    const article = within(region).getByRole("article", {
      name: LOOSE_FLIGHT.crew_name,
    })
    expect(article).toHaveTextContent("Vuelo DL1209")
    expect(normalize(resultsStatus(main)?.textContent ?? "")).toBe(
      "2 ausencias"
    )
  })

  it("un vuelo suelto en pending_ack va a «Esperando confirmación»", async () => {
    const { main } = await openBoard([
      { ...LOOSE_FLIGHT, ...PENDING_ACK_CHANGES },
    ])

    const region = await columnOf(main, LOOSE_FLIGHT.crew_name)
    expect(region).toHaveAccessibleName(`${WAITING} (1)`)
  })
})

describe("I-1: el estado de una ausencia por fechas sale de sus vuelos", () => {
  it.each([
    {
      case: "sin hijas, su propio estado (reported)",
      flights: [],
      column: PENDING,
      chip: REPORTED_CHIP,
    },
    {
      case: "alguna hija reported (aunque otra esté cubierta)",
      flights: [coveredFlight(1), reportedFlight(2)],
      column: PENDING,
      chip: REPORTED_CHIP,
    },
    {
      case: "ninguna reported y alguna pending_ack",
      flights: [coveredFlight(1), pendingAckFlight(2)],
      column: WAITING,
      chip: WAITING,
    },
    {
      case: "todas las hijas covered",
      flights: [coveredFlight(1), coveredFlight(2), coveredFlight(3)],
      column: COVERED,
      chip: COVERED_CHIP,
    },
    {
      case: "las hijas canceladas no cuentan (covered + cancelled)",
      flights: [coveredFlight(1), cancelledFlight(2)],
      column: COVERED,
      chip: COVERED_CHIP,
    },
    {
      case: "si todas las hijas están canceladas, su propio estado",
      flights: [cancelledFlight(1)],
      column: PENDING,
      chip: REPORTED_CHIP,
    },
  ])(
    "$case → columna «$column» y etiqueta «$chip»",
    async ({ flights, column, chip }) => {
      const { main } = await openBoard([PARENT, ...flights])

      const region = await columnOf(main, PARENT_NAME)
      expect(region).toHaveAccessibleName(`${column} (1)`)
      const article = within(region).getByRole("article", {
        name: PARENT_NAME,
      })
      expect(within(article).getByText(chip)).toBeInTheDocument()
    }
  )

  it("la etiqueta «Esperando confirmación» del padre también sale en el popup, con cada vuelo y su estado", async () => {
    const { user, main } = await openBoard([
      PARENT,
      coveredFlight(1),
      pendingAckFlight(2),
    ])

    const article = await within(main).findByRole("article", {
      name: PARENT_NAME,
    })
    expect(within(article).getByText(WAITING)).toBeInTheDocument()
    expect(article).not.toHaveTextContent(REPORTED_CHIP)

    await user.click(within(article).getByRole("button", { name: DETAIL }))
    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(dialog).toHaveTextContent(PARENT_NAME))
    await waitFor(() => expect(loadingStatuses(dialog)).toHaveLength(0))
    // GET /absences/:id devuelve el padre en reported: el popup no lo enseña así.
    expect(dialog).not.toHaveTextContent(REPORTED_CHIP)
    const flights = within(dialog).getByRole("list", { name: "Vuelos" })
    const items = within(flights).getAllByRole("listitem")
    expect(items.map((item) => normalize(item.textContent))).toEqual([
      expect.stringMatching(/^DL1101 .*Cubierta.*Sofía Herrera Paz/),
      expect.stringMatching(
        /^DL1102 .*Esperando confirmación.*Iván Torres Gil/
      ),
    ])
    // El estado del padre (fuera de la lista de vuelos) es el derivado.
    const parentChips = within(dialog)
      .getAllByText(WAITING)
      .filter((element) => !flights.contains(element))
    expect(parentChips).toHaveLength(1)
  })

  it("el buscador encuentra la ausencia por el reemplazo de uno de sus vuelos", async () => {
    const { user, main } = await openBoard([
      PARENT,
      coveredFlight(1),
      { ...COVERED_ABSENCE, replacement_name: "Otro Reemplazo" },
    ])
    await within(main).findByRole("article", { name: PARENT_NAME })

    await user.type(
      within(main).getByRole("searchbox", { name: "Buscar tripulante" }),
      "sofia herrera"
    )

    await waitFor(() =>
      expect(within(main).getAllByRole("article")).toHaveLength(1)
    )
    expect(
      within(main).getByRole("article", { name: PARENT_NAME })
    ).toBeInTheDocument()
  })
})

describe("FE-3: cancelled no aparece en el tablero", () => {
  it("una ausencia cancelada no sale en ninguna columna ni en la cuenta de resultados", async () => {
    const { main } = await openBoard([PARENT, CANCELLED_ABSENCE])

    await within(main).findByRole("region", { name: `${PENDING} (1)` })
    expect(
      within(main).queryByRole("article", {
        name: CANCELLED_ABSENCE.crew_name,
      })
    ).toBeNull()
    expect(within(main).getAllByRole("article")).toHaveLength(1)
    expect(normalize(resultsStatus(main)?.textContent ?? "")).toBe("1 ausencia")
  })

  it("las hijas de una ausencia por fechas cancelada tampoco aparecen", async () => {
    const parent = { ...PARENT, status: "cancelled" } satisfies ApiAbsence
    const { main } = await openBoard([
      parent,
      flightAbsenceOf(parent, 1),
      flightAbsenceOf(parent, 2, PENDING_ACK_CHANGES),
    ])

    expect(await within(main).findByText(EMPTY_BOARD)).toBeInTheDocument()
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
  })

  it("si solo hay ausencias canceladas se muestra el estado vacío del tablero", async () => {
    const { main } = await openBoard([CANCELLED_ABSENCE])

    expect(await within(main).findByText(EMPTY_BOARD)).toBeInTheDocument()
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
    expect(within(main).queryAllByRole("region")).toHaveLength(0)
  })

  it("si la ausencia se canceló después de cargar el tablero, el popup dice «Cancelada», no «Pendiente de reemplazo»", async () => {
    const { user, main } = await openBoard([PARENT])
    server.use(
      http.get(`${ABSENCES_URL}/:id`, () =>
        HttpResponse.json({ ...PARENT, status: "cancelled" })
      )
    )
    const article = await within(main).findByRole("article", {
      name: PARENT_NAME,
    })

    await user.click(within(article).getByRole("button", { name: DETAIL }))
    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(dialog).toHaveTextContent(PARENT_NAME))
    await waitFor(() => expect(loadingStatuses(dialog)).toHaveLength(0))

    expect(within(dialog).getByText(CANCELLED_CHIP)).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(REPORTED_CHIP)
  })
})
