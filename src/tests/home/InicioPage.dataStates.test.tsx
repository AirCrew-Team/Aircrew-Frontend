import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PATHS } from "@/routes/paths"

import { renderRoute } from "../utils/renderRoute"

type DataFn = (...args: unknown[]) => unknown

// Cada función de home.data.ts se envuelve para registrar sus llamadas.
// Sin override, delega en la función real (datos simulados de la referencia).
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const homeData = vi.hoisted(() => ({
  calls: [] as string[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/home/data/home.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          homeData.calls.push(name)
          return (homeData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

const DATA_FUNCTIONS = [
  "getCrewStatus",
  "getUrgentReplacementRequest",
  "getNextFlight",
  "getCertificationsSummary",
]

const overrideAll = (fn: DataFn) => {
  for (const name of DATA_FUNCTIONS) homeData.overrides[name] = fn
}

afterEach(() => {
  homeData.calls.length = 0
  homeData.overrides = {}
})

// Bloques con datos: WelcomeHeader, AvailabilitySelector, ReplacementRequestBanner,
// NextFlightCard y CertificationsCard.
const BLOCKS_WITH_DATA = 5

const statusesStartingWith = (container: HTMLElement, prefix: RegExp) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => prefix.test(element.textContent?.trim() ?? ""))

describe("Inicio del tripulante: carga, error y datos vacíos", () => {
  it("HT-03: mientras los datos no se resuelven, cada bloque con datos muestra «Cargando…» en un role=status", async () => {
    overrideAll(() => new Promise(() => {}))

    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(
        BLOCKS_WITH_DATA
      )
    )
    expect(homeData.calls).toEqual(expect.arrayContaining(DATA_FUNCTIONS))
  })

  it("HT-03: si los datos fallan, cada bloque con datos muestra «No se pudo cargar…» en un role=alert", async () => {
    overrideAll(() => Promise.reject(new Error("fallo simulado")))

    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    await waitFor(() =>
      expect(
        within(main)
          .queryAllByRole("alert")
          .filter((element) =>
            /^no se pudo cargar/i.test(element.textContent?.trim() ?? "")
          )
      ).toHaveLength(BLOCKS_WITH_DATA)
    )
    expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(0)
  })

  it("HT-03: si solo falla el próximo vuelo, solo su tarjeta muestra el error y el resto, sus datos", async () => {
    homeData.overrides.getNextFlight = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.inicio)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/^no se pudo cargar/i)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(
      await screen.findByRole("heading", { level: 2, name: "Certificaciones" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { level: 2, name: "AV-8520" })
    ).not.toBeInTheDocument()
  })

  it("HT-13: si getUrgentReplacementRequest devuelve null, no existe la región «Solicitud de reemplazo urgente»", async () => {
    homeData.overrides.getUrgentReplacementRequest = () => Promise.resolve(null)

    renderRoute(PATHS.tripulante.inicio)

    // Ancla positiva: el resto de la pantalla ya cargó y ningún bloque sigue cargando.
    const main = await screen.findByRole("main")
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await waitFor(() =>
      expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(0)
    )
    expect(homeData.calls).toContain("getUrgentReplacementRequest")
    expect(
      screen.queryByRole("region", { name: /solicitud de reemplazo urgente/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/AV-9344/)).not.toBeInTheDocument()
  })

  it("HT-11: cambiar el estado de asignación no vuelve a llamar a ninguna función de datos", async () => {
    const user = userEvent.setup()
    renderRoute(PATHS.tripulante.inicio)

    const main = await screen.findByRole("main")
    const group = await screen.findByRole("radiogroup", {
      name: /^estado de asignación$/i,
    })
    await screen.findByRole("heading", { level: 2, name: "AV-8520" })
    await waitFor(() =>
      expect(statusesStartingWith(main, /^cargando/i)).toHaveLength(0)
    )
    const callsBefore = [...homeData.calls]
    expect(callsBefore.length).toBeGreaterThan(0)

    await user.click(within(group).getByRole("radio", { name: "Vacaciones" }))
    await user.keyboard("{ArrowRight}")
    await user.click(within(group).getByRole("radio", { name: "Disponible" }))

    expect(
      within(group).getByRole("radio", { name: "Disponible" })
    ).toBeChecked()
    expect(homeData.calls).toEqual(callsBefore)
  })
})
