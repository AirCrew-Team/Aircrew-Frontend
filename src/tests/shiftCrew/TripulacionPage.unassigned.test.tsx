import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { getShiftCrew } from "@/modules/shiftCrew/data/shiftCrew.data"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { API_URL } from "../mocks/authApi"
import { REAL_USERS } from "../mocks/profileApi"
import { renderRoute } from "../utils/renderRoute"
import { server } from "../utils/server"

// Spec docs/specs/tripulacion-sin-asignacion.md (amplía tripulacion-supervisor): los
// tripulantes sin vuelo, guardia, descanso ni ausencia («available» en el backend) llegan
// como «sin_asignar», con su filtro, su etiqueta y su tarjeta (TS-01 a TS-07). La sesión
// real usa MSW: GET /api/admin/bases/me y GET /api/crew/shift-crew?base=. TS-02 usa los
// datos de ejemplo; el ajuste de TC-07 y TC-21 (TS-08) va en los archivos de la spec
// original. La ampliación «Inicio y texto de la guardia» suma TS-12 (nota de la guardia) al
// final; TS-09 a TS-11 van en src/tests/supervisorHome/InicioPage.crewSummary.test.tsx.

type User = ReturnType<typeof userEvent.setup>

// Formas locales del contrato del backend (ApiShiftMember no se exporta) y de lo que
// estos tests leen del resultado de getShiftCrew.
interface ApiMemberLike {
  id: string
  employee_code: string
  full_name: string
  position: string
  rank: string
  phone: string | null
  radio_channel: string | null
  expiring_certification: { name: string; days_left: number } | null
  status: string
  location?: string | null
  minutes_to_ramp?: number | null
  guard_until?: string | null
  replacement_blocker?: string | null
  flight?: {
    id: string
    flight_number: string
    origin: string
    destination: string
  } | null
  reason?: string | null
}

interface CrewMemberLike {
  id: string
  fullName: string
  status: string
}

interface ShiftCrewLike {
  base: { code: string; name: string }
  members: CrewMemberLike[]
}

const BASE_ME_URL = `${API_URL}/api/admin/bases/me`
const SHIFT_CREW_URL = `${API_URL}/api/crew/shift-crew`

const JFK_BASE = {
  unit: "Delta Air Lines",
  hq_code: "ATL",
  base_name: "Base JFK",
  city: "New York",
  iata: "JFK",
  icao: "KJFK",
  operational_condition: "normal",
}

const person = (
  id: string,
  fullName: string,
  position: string,
  phone: string | null,
  radioChannel: string | null,
  certification: { name: string; days_left: number } | null = null
) => ({
  id,
  employee_code: id.toUpperCase(),
  full_name: fullName,
  position,
  rank: position,
  phone,
  radio_channel: radioChannel,
  expiring_certification: certification,
})

const PILOTS_RADIO = "CH-04 OPS JFK (131.85)"
const CABIN_RADIO = "CH-02 OPS JFK (129.40)"

const guard = (
  base: ReturnType<typeof person>,
  location: string,
  minutesToRamp: number
): ApiMemberLike => ({
  ...base,
  status: "standby",
  location,
  minutes_to_ramp: minutesToRamp,
  guard_until: "2026-11-22T22:00:00.000Z",
  replacement_blocker: null,
})

const absent = (
  base: ReturnType<typeof person>,
  reason: string
): ApiMemberLike => ({
  ...base,
  status: "absent",
  reason,
  flight: null,
})

const available = (base: ReturnType<typeof person>): ApiMemberLike => ({
  ...base,
  status: "available",
})

const GUARD_1 = "Grace Holloway"
const GUARD_2 = "Marcus Bell"
const ABSENT_NAME = "Nora Fitzgerald"
// Libre sin teléfono ni canal y con una certificación por vencer.
const FREE_1 = "Elena Brooks"
// Libre con teléfono y canal, y certificaciones al día.
const FREE_2 = "Owen Price"
const FREE = [FREE_1, FREE_2]

const FREE_1_MEMBER = available(
  person("sc-4", FREE_1, "Comandante", null, null, {
    name: "Simulador A330",
    days_left: 20,
  })
)
const FREE_2_MEMBER = available(
  person("sc-5", FREE_2, "Tripulante de Cabina", "+1 212 555 0105", CABIN_RADIO)
)

// Turno de TS-03, TS-05 y TS-07: 2 de guardia, 1 ausente y 2 libres, en el orden del
// backend (los libres al final).
const SHIFT: ApiMemberLike[] = [
  guard(
    person("sc-1", GUARD_1, "Primer Oficial", "+1 212 555 0101", PILOTS_RADIO),
    "Standby Hotel (JFK)",
    20
  ),
  guard(
    person("sc-2", GUARD_2, "Jefe de Cabina", "+1 212 555 0102", CABIN_RADIO),
    "Zona Queens",
    35
  ),
  absent(
    person(
      "sc-3",
      ABSENT_NAME,
      "Tripulante de Cabina",
      "+1 212 555 0103",
      CABIN_RADIO
    ),
    "Incapacidad médica repentina"
  ),
  FREE_1_MEMBER,
  FREE_2_MEMBER,
]

// Simula la base del supervisor y la tripulación del turno; devuelve los `base` pedidos.
const mockShiftCrew = (members: ApiMemberLike[]) => {
  const requestedBases: (string | null)[] = []
  server.use(
    http.get(BASE_ME_URL, () => HttpResponse.json(JFK_BASE)),
    http.get(SHIFT_CREW_URL, ({ request }) => {
      requestedBases.push(new URL(request.url).searchParams.get("base"))
      return HttpResponse.json({ base: "JFK", shift: "day", members })
    })
  )
  return requestedBases
}

const H1 = "Tripulación"
const LIST = "Tripulantes del turno"
const FILTER_GROUP = "Filtrar por estado"
const LOADING = "Cargando tripulación…"
const EMPTY = "No hay tripulantes asignados al turno."
const EMPTY_FILTER = "No hay tripulantes en este estado."
const UNASSIGNED_CHIP = "Sin asignación"
const UNASSIGNED_LINE = "Sin vuelo ni guardia en el turno"
const AVAILABLE = "Disponible para reemplazos"
const DEMO_FILTERS = [
  "Todos (37)",
  "De guardia (12)",
  "En vuelo (10)",
  "Programados (8)",
  "En descanso (4)",
  "Ausentes (3)",
  "Sin asignación (0)",
]

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

// El elemento más interno cuyo texto completo (normalizado) es `text`.
const getByFullText = (container: HTMLElement, text: string) => {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>("*")
  ).filter((element) => normalize(element.textContent) === text)
  const innermost = matches.filter(
    (element) =>
      !matches.some((other) => other !== element && element.contains(other))
  )
  expect(innermost, `debe verse el texto «${text}»`).toHaveLength(1)
  return innermost[0]
}

const LIVE_REGION =
  '[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])'

const expectNoLiveRegion = (element: HTMLElement) => {
  expect(element).not.toHaveAttribute("role")
  expect(element.closest(LIVE_REGION), "sin región viva").toBeNull()
}

const crewList = (main: HTMLElement) =>
  within(main).getByRole("list", { name: LIST })

// Nombres de las tarjetas visibles, en orden, contadas dentro de la lista con nombre.
const cardNames = (main: HTMLElement) => {
  const list = within(main).queryByRole("list", { name: LIST })
  if (!list) return []
  return within(list)
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 3 }).textContent)
    )
}

const expectCards = (main: HTMLElement, names: string[]) => {
  expect(cardNames(main)).toEqual(names)
  expect(within(main).queryAllByRole("article")).toHaveLength(names.length)
}

const card = (main: HTMLElement, name: string) =>
  within(crewList(main)).getByRole("article", { name })

const filterGroup = (main: HTMLElement) =>
  within(main).getByRole("group", { name: FILTER_GROUP })

const filterButton = (main: HTMLElement, name: string) =>
  within(filterGroup(main)).getByRole("button", { name })

const filterNames = (main: HTMLElement) =>
  within(filterGroup(main))
    .getAllByRole("button")
    .map((button) => normalize(button.textContent))

const chooseFilter = async (user: User, main: HTMLElement, name: string) => {
  await user.click(filterButton(main, name))
  await waitFor(() =>
    expect(filterButton(main, name)).toHaveAttribute("aria-pressed", "true")
  )
}

const search = async (user: User, main: HTMLElement, query: string) => {
  const box = within(main).getByRole("searchbox", {
    name: "Buscar tripulante o vuelo",
  })
  await user.clear(box)
  await user.type(box, query)
}

// El status de resultados es el único role=status del tablero ya cargado.
const expectResults = (main: HTMLElement, text: string) =>
  waitFor(() => {
    const statuses = within(main).queryAllByRole("status")
    expect(statuses, "un único status de resultados").toHaveLength(1)
    expect(normalize(statuses[0].textContent)).toBe(text)
  })

const detailButton = (article: HTMLElement, name: string) =>
  within(article).getByRole("button", { name: `Ver detalle de ${name}` })

// Filas del dl: cada dt seguido de su dd, en orden (admite dl > div > dt + dd).
const dlRows = (dl: HTMLElement) =>
  Array.from(dl.querySelectorAll("dt")).map((term) => {
    const definition = term.nextElementSibling
    expect(definition?.tagName, `dd tras «${term.textContent}»`).toBe("DD")
    return [
      normalize(term.textContent),
      normalize(definition?.textContent ?? ""),
    ]
  })

const controlledDl = (button: HTMLElement) => {
  const id = button.getAttribute("aria-controls")
  expect(id, "aria-controls con el id del detalle").toBeTruthy()
  const dl = document.getElementById(id ?? "")
  expect(dl, "el detalle existe").not.toBeNull()
  expect(dl?.tagName).toBe("DL")
  return dl as HTMLElement
}

// Pantalla con la sesión real del supervisor y el turno simulado; espera a que termine
// la carga, no a la lista.
const renderRealBoard = async (members: ApiMemberLike[]) => {
  const requestedBases = mockShiftCrew(members)
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  const user = userEvent.setup()
  renderRoute(PATHS.superVisor.tripulacion)
  await screen.findByRole("heading", { level: 1, name: H1 })
  const main = screen.getByRole("main")
  await waitFor(() => expect(within(main).queryByText(LOADING)).toBeNull())
  expect(
    within(main).queryAllByRole("alert"),
    "sin error de carga"
  ).toHaveLength(0)
  return { user, main, requestedBases }
}

const loadRealShiftCrew = async (members: ApiMemberLike[]) => {
  const requestedBases = mockShiftCrew(members)
  useAuthStore.getState().setUser(REAL_USERS.supervisor)
  const crew = (await getShiftCrew()) as ShiftCrewLike
  return { crew, requestedBases }
}

describe("Tripulación sin asignación: ancla de la sesión real", () => {
  it("TS-03 a TS-07 (ancla) con la sesión real el tablero pide la tripulación de JFK y muestra «Base JFK · JFK» con la guardia y el ausente", async () => {
    const { main, requestedBases } = await renderRealBoard(SHIFT)

    expect(requestedBases).toContain("JFK")
    const region = within(main).getByRole("region", { name: "Tu base" })
    getByFullText(region, "Base JFK · JFK")
    for (const name of [GUARD_1, GUARD_2, ABSENT_NAME]) {
      expect(card(main, name), name).toBeInTheDocument()
    }
  })
})

describe("Tripulación sin asignación: datos (TS-01)", () => {
  it("TS-01 con la sesión real, «available» llega como «sin_asignar», en el mismo orden del backend (los libres al final)", async () => {
    const { crew, requestedBases } = await loadRealShiftCrew(SHIFT)

    expect(requestedBases).toEqual(["JFK"])
    expect(crew.members.map(({ id, status }) => [id, status])).toEqual([
      ["sc-1", "guardia"],
      ["sc-2", "guardia"],
      ["sc-3", "ausente"],
      ["sc-4", "sin_asignar"],
      ["sc-5", "sin_asignar"],
    ])
  })

  it("TS-01 cada libre conserva nombre, cargo, teléfono, canal y certificación; si «phone» o «radio_channel» vienen null, sale «—»", async () => {
    const { crew } = await loadRealShiftCrew(SHIFT)

    const free = crew.members.filter(({ id }) => id === "sc-4" || id === "sc-5")
    expect(free).toEqual([
      {
        id: "sc-4",
        fullName: FREE_1,
        position: "Comandante",
        phone: "—",
        radioChannel: "—",
        expiringCertification: { name: "Simulador A330", daysLeft: 20 },
        status: "sin_asignar",
      },
      {
        id: "sc-5",
        fullName: FREE_2,
        position: "Tripulante de Cabina",
        phone: "+1 212 555 0105",
        radioChannel: CABIN_RADIO,
        expiringCertification: null,
        status: "sin_asignar",
      },
    ])
  })
})

describe("Tripulación sin asignación: filtro con los datos de ejemplo (TS-02)", () => {
  it("TS-02 el grupo «Filtrar por estado» tiene 7 botones, en orden, el último «Sin asignación (0)»", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    renderRoute(PATHS.superVisor.tripulacion)
    await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")
    await within(main).findByRole("list", { name: LIST })

    expect(filterNames(main)).toEqual(DEMO_FILTERS)
  })

  it("TS-02 al pulsar «Sin asignación (0)» se ve «No hay tripulantes en este estado.» sin región viva, sin tarjetas y con «0 tripulantes»", async () => {
    useAuthStore.getState().setMockRole(ROLES.SUPER_VISOR)
    const user = userEvent.setup()
    renderRoute(PATHS.superVisor.tripulacion)
    await screen.findByRole("heading", { level: 1, name: H1 })
    const main = screen.getByRole("main")
    await within(main).findByRole("list", { name: LIST })

    await chooseFilter(user, main, "Sin asignación (0)")

    const message = await waitFor(() => getByFullText(main, EMPTY_FILTER))
    expectNoLiveRegion(message)
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
    await expectResults(main, "0 tripulantes")
  })
})

describe("Tripulación sin asignación: tarjeta y detalle (TS-03, TS-04)", () => {
  it("TS-03 la tarjeta de cada libre muestra «Sin asignación» y «Sin vuelo ni guardia en el turno»", async () => {
    const { main } = await renderRealBoard(SHIFT)

    expectCards(main, [GUARD_1, GUARD_2, ABSENT_NAME, ...FREE])
    for (const name of FREE) {
      const article = card(main, name)
      getByFullText(article, UNASSIGNED_CHIP)
      getByFullText(article, UNASSIGNED_LINE)
    }
  })

  it("TS-03 la tarjeta de un libre no tiene «Ver en Ausencias», ni «Disponible para reemplazos», ni «a … min de rampa»", async () => {
    const { main } = await renderRealBoard(SHIFT)

    for (const name of FREE) {
      const article = card(main, name)
      expect(
        within(article).queryByRole("link", { name: "Ver en Ausencias" }),
        name
      ).toBeNull()
      expect(article.textContent, name).not.toContain(AVAILABLE)
      expect(article.textContent, name).not.toMatch(/min de rampa/)
      expect(article.textContent, name).not.toContain("No disponible")
    }
  })

  it("TS-04 el detalle de Elena Brooks (libre sin teléfono ni canal) tiene «Teléfono» «—», «Canal de radio» «—» y «Certificaciones», sin la fila «Guardia»", async () => {
    const { user, main } = await renderRealBoard(SHIFT)
    const article = card(main, FREE_1)

    await user.click(detailButton(article, FREE_1))

    const button = await within(article).findByRole("button", {
      name: `Ocultar detalle de ${FREE_1}`,
    })
    const rows = dlRows(controlledDl(button))
    expect(rows).toEqual([
      ["Teléfono", "—"],
      ["Canal de radio", "—"],
      ["Certificaciones", "Simulador A330 vence en 20 días"],
    ])
    expect(rows.map(([term]) => term)).not.toContain("Guardia")
  })

  it("TS-04 el detalle de Owen Price (libre) tiene su teléfono, su canal y «Certificaciones» «Al día», sin la fila «Guardia»", async () => {
    const { user, main } = await renderRealBoard(SHIFT)
    const article = card(main, FREE_2)

    await user.click(detailButton(article, FREE_2))

    const button = await within(article).findByRole("button", {
      name: `Ocultar detalle de ${FREE_2}`,
    })
    expect(dlRows(controlledDl(button))).toEqual([
      ["Teléfono", "+1 212 555 0105"],
      ["Canal de radio", CABIN_RADIO],
      ["Certificaciones", "Al día"],
    ])
  })
})

describe("Tripulación sin asignación: panorama «Tu base» (TS-05)", () => {
  it("TS-05 con 2 de guardia, 1 ausente y 2 libres, «Tu base» muestra «2» «en servicio» y «80 % de la tripulación del turno está apta (4 de 5).»", async () => {
    const { main } = await renderRealBoard(SHIFT)
    const region = within(main).getByRole("region", { name: "Tu base" })

    getByFullText(region, "2")
    getByFullText(region, "en servicio")
    getByFullText(
      region,
      "80 % de la tripulación del turno está apta (4 de 5)."
    )
  })
})

describe("Tripulación sin asignación: turno solo con libres (TS-06)", () => {
  it("TS-06 si todos los miembros son libres no sale «No hay tripulantes asignados al turno.» y se ven sus tarjetas y «Sin asignación (2)»", async () => {
    const { main } = await renderRealBoard([FREE_1_MEMBER, FREE_2_MEMBER])

    expect(main).not.toHaveTextContent(EMPTY)
    await waitFor(() => expectCards(main, FREE))
    expect(filterButton(main, "Sin asignación (2)")).toBeInTheDocument()
    expect(filterButton(main, "Todos (2)")).toBeInTheDocument()

    // Caso borde de la fórmula: nadie en servicio y todos aptos.
    const region = within(main).getByRole("region", { name: "Tu base" })
    getByFullText(region, "0")
    getByFullText(
      region,
      "100 % de la tripulación del turno está apta (2 de 2)."
    )
  })
})

describe("Tripulación sin asignación: filtro y búsqueda (TS-07)", () => {
  it("TS-07 con «Sin asignación (2)» se ven solo los 2 libres y el status dice «2 tripulantes»", async () => {
    const { user, main } = await renderRealBoard(SHIFT)

    await chooseFilter(user, main, "Sin asignación (2)")

    await waitFor(() => expectCards(main, FREE))
    await expectResults(main, "2 tripulantes")
  })

  it("TS-07 la búsqueda por nombre encuentra a los libres: «brooks» con «Todos» y «price» con «Sin asignación (2)»", async () => {
    const { user, main } = await renderRealBoard(SHIFT)

    await search(user, main, "brooks")
    await waitFor(() => expectCards(main, [FREE_1]))
    await expectResults(main, "1 tripulante")

    await chooseFilter(user, main, "Sin asignación (2)")
    await search(user, main, "price")
    await waitFor(() => expectCards(main, [FREE_2]))
    await expectResults(main, "1 tripulante")
  })
})

// Ampliación «Inicio y texto de la guardia» (TS-12): la nota también nombra a los libres,
// porque Programación y Recomendaciones los proponen. Con los datos de ejemplo va en TC-06
// (TripulacionPage.test.tsx).
const GUARD_NOTE =
  "La IA propone los reemplazos con prioridad para la guardia disponible y también entre quienes están sin asignación. Quien no cumple descanso, habilitación o certificaciones queda fuera."

describe("Tripulación sin asignación: nota de la guardia (TS-12)", () => {
  it("TS-12 con la sesión real, «Guardia para reemplazos» tiene la nota nueva exacta, que nombra a quienes están sin asignación", async () => {
    const { main } = await renderRealBoard(SHIFT)
    const region = within(main).getByRole("region", {
      name: "Guardia para reemplazos",
    })

    getByFullText(region, GUARD_NOTE)
  })
})
