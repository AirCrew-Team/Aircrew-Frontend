import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"

// Spec certificaciones-tripulante: buscador del expediente (CE-07) y status de resultados
// para el lector (CE-08), con los datos simulados reales.

// La ruta puede pasar a lazy (CE-14): la primera espera lleva margen.
const LAZY = { timeout: 3000 }
const TODAY = new Date(2026, 10, 10, 15, 0)

const H1 = "Certificaciones y Licencias"
const LOADED_TEXT = "5 licencias cargadas en expediente digital (SKBO Base)"

const ALL = [
  "Licencia ATP (Airline Transport Pilot)",
  "Evaluación Médica Clase 1",
  "Type Rating A320 Family",
  "ICAO English Level 6",
  "CAT IIIb Autoland & LVP",
]

const noMatch = (query: string) => `Ninguna licencia coincide con «${query}».`

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const isLoading = (element: HTMLElement) =>
  /^cargando/i.test(normalize(element.textContent))

// El elemento más interno cuyo texto completo (normalizado) es `text`,
// aunque el texto esté repartido en varios <span>.
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

// Los h3 de las licencias de la lista «Licencias». Sin resultados la lista puede no montarse.
// Se acota a la lista porque otros bloques (resumen, T1–T3) podrían usar <article>.
const visibleLicenses = (main: HTMLElement) => {
  const list = within(main).queryByRole("list", { name: "Licencias" })
  if (!list) return []
  return within(list)
    .queryAllByRole("article")
    .map((article) =>
      normalize(within(article).getByRole("heading", { level: 3 }).textContent)
    )
}

const expectLicenses = (main: HTMLElement, names: string[]) =>
  waitFor(() => expect(visibleLicenses(main)).toEqual(names))

// CE-08: el status de resultados es el único role=status de la pantalla que no es de carga.
const resultsStatus = (main: HTMLElement) => {
  const statuses = within(main)
    .queryAllByRole("status")
    .filter((element) => !isLoading(element))
  expect(statuses, "un único status de resultados").toHaveLength(1)
  return statuses[0]
}

const expectResults = (main: HTMLElement, text: string) =>
  waitFor(() => expect(normalize(resultsStatus(main).textContent)).toBe(text))

const searchBox = (main: HTMLElement) =>
  within(main).getByRole("searchbox", { name: "Filtrar por certificación" })

// Espera a que carguen la lista y los demás bloques (sin status de carga).
const findLoadedBrowser = async () => {
  await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
  const main = screen.getByRole("main")
  await expectLicenses(main, ALL)
  await waitFor(() =>
    expect(within(main).queryAllByRole("status").filter(isLoading)).toEqual([])
  )
  return main
}

const search = async (
  user: ReturnType<typeof userEvent.setup>,
  main: HTMLElement,
  query: string
) => {
  const box = searchBox(main)
  await user.clear(box)
  await user.type(box, query)
}

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
// D3: solo se falsea Date; setTimeout y setInterval siguen reales para Query, waitFor y user-event.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Certificaciones: buscador (CE-07)", () => {
  it("CE-07 (contrato): el buscador es un <input type=search> «Filtrar por certificación» con su marcador de posición", async () => {
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    const box = searchBox(main)
    expect(box.tagName).toBe("INPUT")
    expect(box).toHaveAttribute("type", "search")
    expect(box).toHaveAttribute("placeholder", "Filtrar por certificación…")
  })

  it("CE-07: buscar «icao» deja solo ICAO English Level 6", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "icao")

    await expectLicenses(main, ["ICAO English Level 6"])
  })

  it("CE-07: «evaluacion medica» (sin tildes) encuentra la Evaluación Médica Clase 1", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "evaluacion medica")

    await expectLicenses(main, ["Evaluación Médica Clase 1"])
  })

  it("CE-07: «cae» encuentra Type Rating A320 Family por su alcance", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "cae")

    await expectLicenses(main, ["Type Rating A320 Family"])
  })

  it("CE-07 (contrato): también filtra por código («#2287» → ATP) y por organismo («BAJA VISIBILIDAD» → CAT IIIb)", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "#2287")
    await expectLicenses(main, ["Licencia ATP (Airline Transport Pilot)"])

    await search(user, main, "BAJA VISIBILIDAD")
    await expectLicenses(main, ["CAT IIIb Autoland & LVP"])
  })

  it("CE-07: «xyz» no deja ninguna licencia y muestra «Ninguna licencia coincide con «xyz».»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "xyz")

    await expectLicenses(main, [])
    getByFullText(main, noMatch("xyz"))
  })

  it("CE-07: el texto «5 licencias cargadas en expediente digital (SKBO Base)» no cambia con la búsqueda", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()
    getByFullText(main, LOADED_TEXT)

    await search(user, main, "icao")
    await expectLicenses(main, ["ICAO English Level 6"])
    getByFullText(main, LOADED_TEXT)

    await search(user, main, "xyz")
    await expectLicenses(main, [])
    getByFullText(main, LOADED_TEXT)
  })

  it("CE-07 (contrato): al borrar la búsqueda vuelven las 5 licencias en su orden y desaparece «Ninguna licencia coincide…»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "xyz")
    await expectLicenses(main, [])
    await user.clear(searchBox(main))

    await expectLicenses(main, ALL)
    expect(main).not.toHaveTextContent("Ninguna licencia coincide")
  })
})

describe("Certificaciones: status de resultados (CE-08)", () => {
  it("CE-08: el status sr-only de resultados dice «5 licencias» al entrar, «1 licencia» con «icao» y «0 licencias» con «xyz»", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await expectResults(main, "5 licencias")
    expect(resultsStatus(main)).toHaveClass("sr-only")

    await search(user, main, "icao")
    await expectResults(main, "1 licencia")

    await search(user, main, "xyz")
    await expectResults(main, "0 licencias")
  })
})

describe("Certificaciones: correcciones de la revisión", () => {
  it("Revisión: los espacios repetidos dentro de la búsqueda cuentan como uno («evaluacion  medica»)", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.certificaciones)
    const main = await findLoadedBrowser()

    await search(user, main, "evaluacion  medica")

    await expectLicenses(main, ["Evaluación Médica Clase 1"])
  })
})
