import { act, screen, waitFor, within } from "@testing-library/react"
import { focusManager } from "@tanstack/react-query"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { renderRoute } from "../utils/renderRoute"
import { queryAllToasts } from "../utils/toasts"

// La ruta se carga con `lazy` (react-hook-form + zod): la primera espera de la pantalla
// lleva más margen que el segundo por defecto, por si el chunk se transforma en frío.
const LAZY = { timeout: 3000 }

// RA-02 (carga y error del vuelo) y RA-12 (error de envío) con fallos simulados.

type DataFn = (...args: unknown[]) => Promise<unknown>

// Cada función de absences.data.ts se envuelve para registrar sus llamadas.
// Sin override, delega en la función real (datos simulados de la spec).
// No se importa el módulo en el test, así el archivo compila aunque el módulo aún no exista.
const absencesData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
  overrides: {} as Record<string, DataFn | undefined>,
}))

vi.mock("@/modules/absences/data/absences.data", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => {
      if (typeof value !== "function") return [name, value]
      const real = value as DataFn
      return [
        name,
        (...args: unknown[]) => {
          absencesData.calls.push({ name, args })
          return (absencesData.overrides[name] ?? real)(...args)
        },
      ]
    })
  )
})

const callsTo = (name: string) =>
  absencesData.calls.filter((call) => call.name === name)

const H1 = "Reportar Novedad de Ausencia"
const SUBMIT = "Enviar Aviso a Despacho"
const FLIGHT_LOADING = "Cargando vuelo asignado…"
const FLIGHT_ERROR = "No se pudo cargar el vuelo asignado."
const SUBMIT_ERROR =
  "No se pudo enviar el aviso. Intenta de nuevo o llama a la línea de emergencia OCC."
const NOTES = "Fiebre alta desde la madrugada."

const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(element.textContent?.trim() ?? ""))

const alertsWithText = (container: HTMLElement, text: string) =>
  within(container)
    .queryAllByRole("alert")
    .filter((element) => normalize(element.textContent) === text)

// LG-08: el store arranca sin sesión, así que cada test pone la del tripulante.
beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

afterEach(() => {
  absencesData.calls.length = 0
  absencesData.overrides = {}
})

describe("Reportar Ausencia: carga y error del vuelo (RA-02)", () => {
  it("RA-02: mientras carga el vuelo hay un único role=status «Cargando vuelo asignado…» y «Enviar Aviso a Despacho» está deshabilitado", async () => {
    absencesData.overrides.getAffectedFlight = () => new Promise(() => {})

    renderRoute(PATHS.tripulante.reportarAusencia)

    await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
    const main = screen.getByRole("main")
    const status = await waitFor(() => {
      const statuses = within(main).queryAllByRole("status")
      expect(statuses, "un único role=status en la pantalla").toHaveLength(1)
      return statuses[0]
    })
    expect(status).toHaveTextContent(FLIGHT_LOADING)
    expect(callsTo("getAffectedFlight").length).toBeGreaterThan(0)

    expect(within(main).getByRole("button", { name: SUBMIT })).toBeDisabled()
    // C: la cuenta no aparece hasta que carga el vuelo.
    expect(within(main).queryByText("Tiempo a presentación")).toBeNull()
  })

  it("RA-02: si la carga falla, hay un único role=alert «No se pudo cargar el vuelo asignado.» y el botón sigue deshabilitado", async () => {
    absencesData.overrides.getAffectedFlight = () =>
      Promise.reject(new Error("fallo simulado"))

    renderRoute(PATHS.tripulante.reportarAusencia)

    await screen.findByRole("heading", { level: 1, name: H1 }, LAZY)
    const main = screen.getByRole("main")
    await waitFor(() =>
      expect(alertsWithText(main, FLIGHT_ERROR)).toHaveLength(1)
    )
    expect(within(main).getAllByRole("alert")).toHaveLength(1)
    expect(loadingStatuses(main)).toHaveLength(0)
    expect(callsTo("getAffectedFlight").length).toBeGreaterThan(0)

    expect(within(main).getByRole("button", { name: SUBMIT })).toBeDisabled()
    // C: el error se muestra en F1, no en la cabecera.
    expect(within(main).queryByText("Tiempo a presentación")).toBeNull()
  })
})

describe("Reportar Ausencia: error de envío (RA-12)", () => {
  it("RA-12: si submitAbsenceReport falla, aparece el role=alert de error, no sale ningún toast y los campos siguen habilitados y con sus valores", async () => {
    absencesData.overrides.submitAbsenceReport = () =>
      Promise.reject(new Error("fallo simulado"))
    const user = userEvent.setup()

    renderRoute(PATHS.tripulante.reportarAusencia)

    const main = await screen.findByRole("main")
    const form = await waitFor(() => {
      const element = main.querySelector("form")
      expect(element, "la pantalla debe tener un <form>").not.toBeNull()
      return element as HTMLFormElement
    }, LAZY)
    await waitFor(() => expect(form).toHaveTextContent("AV-8520"))
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))

    const scope = within(form)
    await user.selectOptions(
      scope.getByRole("combobox", { name: "Motivo de la Ausencia" }),
      "fatiga"
    )
    await user.type(
      scope.getByRole("textbox", { name: "Observaciones Adicionales" }),
      NOTES
    )
    await user.click(scope.getByRole("button", { name: SUBMIT }))

    await waitFor(
      () => expect(alertsWithText(main, SUBMIT_ERROR)).toHaveLength(1),
      { timeout: 2000 }
    )
    expect(callsTo("submitAbsenceReport")).toHaveLength(1)
    expect(queryAllToasts()).toHaveLength(0)

    const reason = scope.getByRole("combobox", {
      name: "Motivo de la Ausencia",
    })
    const notes = scope.getByRole("textbox", {
      name: "Observaciones Adicionales",
    })
    expect(reason).toBeEnabled()
    expect(reason).toHaveValue("fatiga")
    expect(notes).toBeEnabled()
    expect(notes).toHaveValue(NOTES)
    expect(scope.getByRole("button", { name: SUBMIT })).toBeEnabled()
    // A11Y-AUS-2: el foco sigue en el botón para reintentar.
    expect(scope.getByRole("button", { name: SUBMIT })).toHaveFocus()
    expect(
      within(main).queryByText(
        "Aviso enviado al supervisor para el vuelo AV-8520."
      )
    ).toBeNull()
  })
})

describe("Reportar Ausencia: vuelo sin recargas (PERF-AUS-1)", () => {
  it("PERF-AUS-1: volver a la pestaña no vuelve a pedir el vuelo (la cuenta regresiva no salta)", async () => {
    renderRoute(PATHS.tripulante.reportarAusencia)

    const main = await screen.findByRole("main")
    await waitFor(
      () =>
        expect(within(main).getByText("Tiempo a presentación")).toBeVisible(),
      LAZY
    )
    const callsBefore = callsTo("getAffectedFlight").length
    expect(callsBefore).toBeGreaterThan(0)

    // Simula salir y volver a la pestaña (refetchOnWindowFocus de TanStack Query).
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
    expect(callsTo("getAffectedFlight")).toHaveLength(callsBefore)
    focusManager.setFocused(undefined)
  })
})
