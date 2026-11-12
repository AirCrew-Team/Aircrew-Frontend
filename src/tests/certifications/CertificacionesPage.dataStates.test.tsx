import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec certificaciones-tripulante: el resumen y la lista se derivan de las fechas (CE-03, D3),
// y los estados de carga y error de cada bloque (CE-04), con datos y fallos simulados.

// La ruta puede pasar a lazy (CE-14): la primera espera lleva margen.
const LAZY = { timeout: 3000 }
const TODAY = new Date(2026, 10, 10, 15, 0)

type DataFn = (...args: unknown[]) => Promise<unknown>

// Cada función de certifications.data.ts se envuelve para registrar sus llamadas.
// Sin override, delega en la función real (datos simulados de la spec).
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const certificationsData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock(
  "@/modules/certifications/data/certifications.data",
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

const callsTo = (name: string) =>
  certificationsData.calls.filter((call) => call.name === name)

const H1 = "Certificaciones y Licencias"
const SUMMARY_LOADING = "Cargando resumen de certificaciones…"
const SUMMARY_ERROR = "No se pudo cargar el resumen de certificaciones."
const LIST_LOADING = "Cargando licencias…"
const LIST_ERROR = "No se pudieron cargar las licencias."
const TRAINING_LOADING = "Cargando calendario de recurrentes…"
const TRAINING_ERROR = "No se pudo cargar el calendario de recurrentes."
const TRAINING_DATES = "08 Jul 2027 al 11 Jul 2027"

const SUMMARY_TITLES = [
  "Vigente / Al día",
  "Próximo a vencer (<60 días)",
  "Vencido / No apto",
] as const

const ATP = "Licencia ATP (Airline Transport Pilot)"
const MEDICAL = "Evaluación Médica Clase 1"
const TYPE_RATING = "Type Rating A320 Family"
const ICAO = "ICAO English Level 6"
const CAT = "CAT IIIb Autoland & LVP"

// Una licencia con la forma `Certification` de la spec (literal: el tipo aún no existe).
const certification = (
  id: string,
  name: string,
  expiresAt: string | null,
  extra: Record<string, unknown> = {}
) => ({
  id,
  kind: "license",
  name,
  code: `COD-${id}`,
  issuer: `Organismo ${id}`,
  scope: `Alcance ${id}`,
  expiresAt,
  observation: "Observación simulada",
  appointment: null,
  details: [{ label: "Emisor", value: "Simulado" }],
  ...extra,
})

// CE-03, con hoy = 10 Nov 2026 (ISO escritos a mano: en Bogotá `toISOString()` daría el día
// anterior). ATP vencida hace 5 días y Type Rating a 10 días; el resto, como en la spec.
const CE03_DATA = [
  certification("atp", ATP, "2026-11-05"),
  certification("medical-class-1", MEDICAL, "2026-12-15", {
    kind: "medical",
    observation: null,
    appointment: {
      date: "2026-11-12",
      time: "08:30 COT",
      center: "CEMAE",
      location: "Aeropuerto El Dorado",
    },
  }),
  certification("type-rating-a320", TYPE_RATING, "2026-11-20", {
    kind: "typeRating",
  }),
  certification("icao-english", ICAO, null, { kind: "language" }),
  certification("cat-iiib", CAT, "2027-01-27", { kind: "lowVisibility" }),
]

// D3: singulares y «Vence hoy». Vencida ayer, vence mañana y vence hoy.
const SINGULAR_DATA = [
  certification("ayer", "Licencia Vencida Ayer", "2026-11-09"),
  certification("manana", "Licencia Vence Mañana", "2026-11-11"),
  certification("hoy", "Licencia Vence Hoy", "2026-11-10"),
]

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const withText = (elements: HTMLElement[], text: string) =>
  elements.filter((element) => normalize(element.textContent) === text)

const statusesWithText = (container: HTMLElement, text: string) =>
  withText(within(container).queryAllByRole("status"), text)

const alertsWithText = (container: HTMLElement, text: string) =>
  withText(within(container).queryAllByRole("alert"), text)

const isLoading = (element: HTMLElement) =>
  /^cargando/i.test(normalize(element.textContent))

const loadingStatuses = (container: HTMLElement) =>
  within(container).queryAllByRole("status").filter(isLoading)

// «{n} Certificados» o «1 Certificado», sin confundir «1 Certificado» con «1 Certificados».
const countPattern = (count: number) =>
  count === 1
    ? /(^|\D)1 Certificado(?!s)/
    : new RegExp(`(^|\\D)${count} Certificados`)

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

// La tarjeta de un h2 del resumen: su ancestro más amplio que no contiene otro h2 del resumen.
const summaryCard = (main: HTMLElement, title: string) => {
  const heading = within(main).getByRole("heading", { level: 2, name: title })
  const others = SUMMARY_TITLES.filter((other) => other !== title).map(
    (other) => within(main).getByRole("heading", { level: 2, name: other })
  )
  let card: HTMLElement = heading
  while (
    card.parentElement &&
    card.parentElement !== main &&
    !others.some((other) => card.parentElement?.contains(other))
  ) {
    card = card.parentElement
  }
  return card
}

const expectSummary = (
  main: HTMLElement,
  title: string,
  count: number,
  note: string
) => {
  const text = normalize(summaryCard(main, title).textContent)
  expect(text, `«${title}» cuenta ${count}`).toMatch(countPattern(count))
  expect(text, `nota de «${title}»`).toContain(note)
}

const licensesIn = (main: HTMLElement) => {
  const list = within(main).queryByRole("list", { name: "Licencias" })
  return list ? within(list).queryAllByRole("article") : []
}

const licenseArticle = (main: HTMLElement, name: string) => {
  const article = within(main)
    .getByRole("heading", { level: 3, name })
    .closest("article")
  expect(article, `«${name}» debe ser un <article>`).not.toBeNull()
  return article as HTMLElement
}

const findMain = async () => {
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  return screen.getByRole("main")
}

// Espera a que la lista tenga `count` licencias y no quede ningún status de carga.
const findLoaded = async (count: number) => {
  const main = await findMain()
  await waitFor(() => expect(licensesIn(main)).toHaveLength(count))
  await waitFor(() => expect(loadingStatuses(main)).toEqual([]))
  return main
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
// D3: solo se falsea Date; setTimeout y setInterval siguen reales para Query y waitFor.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
  certificationsData.calls.length = 0
  certificationsData.overrides = {}
})

describe("Certificaciones: resumen y estados derivados de las fechas (CE-03)", () => {
  it("CE-03: con la ATP vencida y Type Rating a 10 días, R1 cuenta 2, R2 cuenta 2 con sus nombres y R3 cuenta 1 con el nombre de la ATP", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve(CE03_DATA)

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoaded(5)

    expectSummary(main, "Vigente / Al día", 2, "Aptos para despacho inmediato")
    expectSummary(
      main,
      "Próximo a vencer (<60 días)",
      2,
      `${MEDICAL}, ${TYPE_RATING}`
    )
    expectSummary(main, "Vencido / No apto", 1, ATP)
    expect(summaryCard(main, "Vencido / No apto")).not.toHaveTextContent(
      "Sin suspensiones reglamentarias"
    )
  })

  it("CE-03: la fila de la ATP vencida muestra «05 Nov 2026», «Vencido hace 5 días» y la insignia «Vencido»", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve(CE03_DATA)

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoaded(5)

    const text = normalize(licenseArticle(main, ATP).textContent)
    expect(text).toContain("05 Nov 2026")
    expect(text).toContain("Vencido hace 5 días")
    // «Vencido» aparece en la línea de días y, además, en la insignia.
    expect(
      text.match(/Vencido/g)?.length ?? 0,
      "«Vencido» en la línea y en la insignia"
    ).toBeGreaterThanOrEqual(2)
    expect(text).not.toContain("días restantes")
    expect(text).not.toContain("Vigente")
  })

  it("CE-03: Type Rating, a 10 días, muestra «20 Nov 2026», «Restan 10 días» y «Próximo vencimiento»", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve(CE03_DATA)

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoaded(5)

    const article = licenseArticle(main, TYPE_RATING)
    expect(article).toHaveTextContent("20 Nov 2026")
    expect(article).toHaveTextContent("Restan 10 días")
    expect(article).toHaveTextContent("Próximo vencimiento")
    expect(article).not.toHaveTextContent("Vigente")
  })

  it("D3 (contrato): singulares y límite de hoy: «Vencido hace 1 día», «Resta 1 día» y «Vence hoy»; R2 nombra las dos próximas y R3 la vencida", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve(SINGULAR_DATA)

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoaded(3)

    expect(licenseArticle(main, "Licencia Vencida Ayer")).toHaveTextContent(
      "Vencido hace 1 día"
    )
    expect(
      normalize(licenseArticle(main, "Licencia Vencida Ayer").textContent)
    ).not.toContain("Vencido hace 1 días")
    expect(licenseArticle(main, "Licencia Vence Mañana")).toHaveTextContent(
      "Resta 1 día"
    )
    expect(
      normalize(licenseArticle(main, "Licencia Vence Mañana").textContent)
    ).not.toContain("Restan")
    const today = licenseArticle(main, "Licencia Vence Hoy")
    expect(today).toHaveTextContent("Vence hoy")
    expect(today).toHaveTextContent("Próximo vencimiento")
    expect(normalize(today.textContent)).not.toContain("Restan 0 días")

    expectSummary(main, "Vigente / Al día", 0, "Aptos para despacho inmediato")
    expectSummary(
      main,
      "Próximo a vencer (<60 días)",
      2,
      "Licencia Vence Mañana, Licencia Vence Hoy"
    )
    expectSummary(main, "Vencido / No apto", 1, "Licencia Vencida Ayer")
    getByFullText(
      main,
      "3 licencias cargadas en expediente digital (SKBO Base)"
    )
  })

  it("R y L (contrato): con una sola licencia vigente se ve «1 licencia cargada en expediente digital (SKBO Base)», «1 Certificado» y las notas vacías de R2 y R3", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.resolve([certification("atp", ATP, "2028-11-28")])

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoaded(1)

    getByFullText(main, "1 licencia cargada en expediente digital (SKBO Base)")
    expectSummary(main, "Vigente / Al día", 1, "Aptos para despacho inmediato")
    expectSummary(
      main,
      "Próximo a vencer (<60 días)",
      0,
      "Sin vencimientos en los próximos 60 días"
    )
    expectSummary(
      main,
      "Vencido / No apto",
      0,
      "Sin suspensiones reglamentarias"
    )
  })
})

describe("Certificaciones: carga y error de la lista y el resumen (CE-04)", () => {
  it("CE-04: mientras carga la lista hay exactamente un status «Cargando resumen de certificaciones…» y uno «Cargando licencias…», sin licencias", async () => {
    certificationsData.overrides.getCertifications = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findMain()
    // T2 carga bien: se espera a que termine para que solo quede la carga de la lista.
    await waitFor(() => expect(main).toHaveTextContent(TRAINING_DATES))

    await waitFor(() =>
      expect(statusesWithText(main, SUMMARY_LOADING)).toHaveLength(1)
    )
    expect(statusesWithText(main, LIST_LOADING)).toHaveLength(1)
    expect(loadingStatuses(main)).toHaveLength(2)
    expect(licensesIn(main)).toHaveLength(0)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
    expect(callsTo("getCertifications").length).toBeGreaterThan(0)
  })

  it("L (contrato): mientras carga la lista, el status de resultados está montado y vacío", async () => {
    certificationsData.overrides.getCertifications = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findMain()
    await waitFor(() => expect(main).toHaveTextContent(TRAINING_DATES))
    await waitFor(() =>
      expect(statusesWithText(main, LIST_LOADING)).toHaveLength(1)
    )

    const others = within(main)
      .queryAllByRole("status")
      .filter((element) => !isLoading(element))
    expect(others, "un único status de resultados, vacío").toHaveLength(1)
    expect(normalize(others[0].textContent)).toBe("")
  })

  it("CE-04: si getCertifications falla hay un alert «No se pudo cargar el resumen de certificaciones.» y otro «No se pudieron cargar las licencias.», sin cargas", async () => {
    certificationsData.overrides.getCertifications = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findMain()

    await waitFor(() =>
      expect(alertsWithText(main, SUMMARY_ERROR)).toHaveLength(1)
    )
    expect(alertsWithText(main, LIST_ERROR)).toHaveLength(1)
    await waitFor(() => expect(main).toHaveTextContent(TRAINING_DATES))
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
    expect(within(main).getAllByRole("alert")).toHaveLength(2)
    expect(licensesIn(main)).toHaveLength(0)
  })

  it("CE-04: un fallo de getRecurrentTraining solo afecta a T2: un único alert «No se pudo cargar el calendario de recurrentes.» y las licencias y el resumen se ven", async () => {
    certificationsData.overrides.getRecurrentTraining = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoaded(5)

    await waitFor(() =>
      expect(alertsWithText(main, TRAINING_ERROR)).toHaveLength(1)
    )
    expect(within(main).getAllByRole("alert")).toHaveLength(1)
    expect(main).not.toHaveTextContent(TRAINING_DATES)
    expectSummary(main, "Vigente / Al día", 4, "Aptos para despacho inmediato")
    expect(callsTo("getRecurrentTraining").length).toBeGreaterThan(0)
  })

  it("T2 (contrato): mientras carga el calendario hay un único status «Cargando calendario de recurrentes…» y las licencias se ven", async () => {
    certificationsData.overrides.getRecurrentTraining = () =>
      new Promise(() => {})

    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findMain()
    await waitFor(() => expect(licensesIn(main)).toHaveLength(5))

    await waitFor(() =>
      expect(statusesWithText(main, TRAINING_LOADING)).toHaveLength(1)
    )
    expect(loadingStatuses(main)).toHaveLength(1)
    expect(main).not.toHaveTextContent(TRAINING_DATES)
    expect(within(main).queryAllByRole("alert")).toHaveLength(0)
  })
})

describe("Certificaciones: consultas al entrar (Datos simulados)", () => {
  it("Datos simulados (contrato): el resumen y la lista comparten la query, así que getCertifications se pide una sola vez; getRecurrentTraining también se pide", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    await findLoaded(5)

    expect(
      callsTo("getCertifications"),
      'R y L comparten ["certifications", "list"]'
    ).toHaveLength(1)
    expect(callsTo("getRecurrentTraining").length).toBeGreaterThan(0)
  })
})

describe("Certificaciones: expediente vacío (corrección de la revisión)", () => {
  it("Revisión: sin licencias y sin búsqueda se ve «No hay licencias cargadas en el expediente.» y ninguna licencia", async () => {
    certificationsData.overrides.getCertifications = () => Promise.resolve([])
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findMain()

    await waitFor(() =>
      getByFullText(main, "No hay licencias cargadas en el expediente.")
    )
    expect(within(main).queryAllByRole("article")).toHaveLength(0)
    expect(main).not.toHaveTextContent("Ninguna licencia coincide")
  })
})
