import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  dateInput,
  localDate,
  typeDate,
} from "../realAbsences/realAbsencesTestUtils"
import { renderRoute } from "../utils/renderRoute"
import { queryAllToasts } from "../utils/toasts"

// La ruta se carga con `lazy` (react-hook-form + zod): la primera espera de la pantalla
// lleva más margen que el segundo por defecto, por si el chunk se transforma en frío.
const LAZY = { timeout: 3000 }

// RA-12 (error de envío) con un fallo simulado.
// Spec ausencias-reales: el formulario ya no carga un vuelo, así que RA-02 (carga y error
// del vuelo) y PERF-AUS-1 (el vuelo no se recarga al volver a la pestaña) se quitaron.
// El error genérico del envío pasa a ser «No pudimos enviar el reporte. Intenta de nuevo.»
// (la lista de errores del formulario de la spec), también para la simulación demo.

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

const SUBMIT = "Enviar Aviso a Despacho"
const SUBMIT_ERROR = "No pudimos enviar el reporte. Intenta de nuevo."
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
    await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))

    const scope = within(form)
    const start = await waitFor(() => dateInput(form, /Fecha de inicio/))
    const end = dateInput(form, /Fecha de fin/)
    const from = localDate(1)
    const to = localDate(2)
    await typeDate(user, start, from)
    await typeDate(user, end, to)
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
    expect(start).toBeEnabled()
    expect(start).toHaveValue(from)
    expect(end).toBeEnabled()
    expect(end).toHaveValue(to)
    expect(reason).toBeEnabled()
    expect(reason).toHaveValue("fatiga")
    expect(notes).toBeEnabled()
    expect(notes).toHaveValue(NOTES)
    expect(scope.getByRole("button", { name: SUBMIT })).toBeEnabled()
    // A11Y-AUS-2: el foco sigue en el botón para reintentar.
    expect(scope.getByRole("button", { name: SUBMIT })).toHaveFocus()
    expect(within(main).queryByText(/^Aviso enviado al supervisor/)).toBeNull()
  })
})
