import { act, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import { queryAllToasts } from "../utils/toasts"
import {
  ATTACHMENT_REQUIRED,
  DATE_ERROR,
  localDate,
  openReportForm,
  typeDate,
} from "./realAbsencesTestUtils"

// Spec ausencias-reales, AU-04 (el formulario pasa a ser por fechas) y AU-05 (validaciones
// de las fechas y del comprobante). Con la cuenta demo: la validación no depende de la
// sesión y así ninguna petición sale al backend.

type DataFn = (...args: unknown[]) => Promise<unknown>

// Envuelve absences.data.ts para ver si la simulación llegó a enviarse.
const absencesData = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown[] }[],
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
          return real(...args)
        },
      ]
    })
  )
})

const submitCalls = () =>
  absencesData.calls.filter((call) => call.name === "submitAbsenceReport")

// Deja pasar la validación asíncrona y un posible envío antes de afirmar que no ocurrió.
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))

const expectFieldError = async (input: HTMLElement, message: string) => {
  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(input).toHaveAttribute("aria-invalid", "true")
  expect(input).toHaveAccessibleDescription(expect.stringContaining(message))
}

beforeEach(() => {
  useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
})

afterEach(() => {
  absencesData.calls.length = 0
})

describe("AU-04: el formulario es por fechas", () => {
  it("AU-04: el formulario tiene «Fecha de inicio» y «Fecha de fin», obligatorias y de tipo fecha, antes del motivo", async () => {
    const { start, end, reason } = await openReportForm()

    for (const input of [start, end]) {
      expect(input).toHaveAttribute("type", "date")
      expect(input).toHaveAttribute("aria-required", "true")
      expect(input).toHaveValue("")
    }
    // Orden de lectura: inicio, fin y luego el motivo.
    expect(
      start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING,
      "«Fecha de fin» va después de «Fecha de inicio»"
    ).toBeTruthy()
    expect(
      end.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING,
      "el motivo va después de las fechas"
    ).toBeTruthy()
  })

  it("AU-04: ya no están la sección del vuelo afectado ni la cuenta a presentación, y el botón de envío está habilitado sin esperar a ningún vuelo", async () => {
    const { main, submit } = await openReportForm()

    expect(
      within(main).queryByRole("heading", { name: /Vuelo o Turno Afectado/ })
    ).toBeNull()
    for (const text of [
      "Vuelo o Turno Afectado",
      "Auto-asignado por Roster",
      "AV-8520",
      "Tiempo a presentación",
      "Cargando vuelo asignado…",
    ]) {
      expect(main).not.toHaveTextContent(text)
    }
    expect(submit).toBeEnabled()
  })
})

describe("AU-05: validaciones de las fechas", () => {
  it("AU-05: enviar sin fechas marca las dos con su mensaje y aria-invalid, y no envía", async () => {
    const { user, start, end, reason, submit } = await openReportForm()
    await user.selectOptions(reason, "fatiga")

    await user.click(submit)

    await expectFieldError(start, DATE_ERROR.startRequired)
    await expectFieldError(end, DATE_ERROR.endRequired)
    await settle()
    expect(submitCalls()).toHaveLength(0)
    expect(queryAllToasts()).toHaveLength(0)
  })

  it("AU-05: un inicio anterior a hoy muestra «La fecha de inicio no puede ser anterior a hoy.» en el campo y no envía", async () => {
    const { user, start, end, reason, submit } = await openReportForm()
    await typeDate(user, start, localDate(-1))
    await typeDate(user, end, localDate(1))
    await user.selectOptions(reason, "fatiga")

    await user.click(submit)

    await expectFieldError(start, DATE_ERROR.startBeforeToday)
    expect(end).not.toHaveAttribute("aria-invalid", "true")
    await settle()
    expect(submitCalls()).toHaveLength(0)
  })

  it("AU-05: un fin anterior al inicio muestra «La fecha de fin no puede ser anterior a la de inicio.» en el fin y no envía", async () => {
    const { user, start, end, reason, submit } = await openReportForm()
    await typeDate(user, start, localDate(3))
    await typeDate(user, end, localDate(2))
    await user.selectOptions(reason, "fatiga")

    await user.click(submit)

    await expectFieldError(end, DATE_ERROR.endBeforeStart)
    expect(start).not.toHaveAttribute("aria-invalid", "true")
    await settle()
    expect(submitCalls()).toHaveLength(0)
  })

  it("AU-05: con 31 días entre inicio y fin aparece «No puede haber más de 30 días entre la fecha de inicio y la de fin.» y no envía", async () => {
    const { user, start, end, reason, submit } = await openReportForm()
    await typeDate(user, start, localDate(1))
    await typeDate(user, end, localDate(32))
    await user.selectOptions(reason, "fatiga")

    await user.click(submit)

    await expectFieldError(end, DATE_ERROR.tooLong)
    await settle()
    expect(submitCalls()).toHaveLength(0)
  })

  it("AU-05 (límites): inicio hoy y fin a 30 días exactos es válido y se envía con las dos fechas", async () => {
    const { user, start, end, reason, submit } = await openReportForm()
    const from = localDate(0)
    const to = localDate(30)
    await typeDate(user, start, from)
    await typeDate(user, end, to)
    await user.selectOptions(reason, "fatiga")

    await user.click(submit)

    await waitFor(() => expect(submitCalls()).toHaveLength(1))
    for (const message of Object.values(DATE_ERROR)) {
      expect(screen.queryByText(message)).toBeNull()
    }
    const input = submitCalls()[0].args[0] as Record<string, unknown>
    // La forma del input de la simulación es libre; lleva las dos fechas «YYYY-MM-DD».
    expect(Object.values(input)).toEqual(expect.arrayContaining([from, to]))
    expect(input).not.toHaveProperty("flightNumber")
  })

  it("AU-05 (límites): una ausencia de un solo día (fin igual al inicio) es válida", async () => {
    const { user, start, end, reason, submit } = await openReportForm()
    await typeDate(user, start, localDate(2))
    await typeDate(user, end, localDate(2))
    await user.selectOptions(reason, "calamidad")

    await user.click(submit)

    await waitFor(() => expect(submitCalls()).toHaveLength(1))
    expect(end).not.toHaveAttribute("aria-invalid", "true")
  })

  it("AU-05: con fechas válidas e «Incapacidad médica repentina» sin archivo, el comprobante es obligatorio y no se envía", async () => {
    const { user, start, end, reason, attachment, submit } =
      await openReportForm()
    await typeDate(user, start, localDate(1))
    await typeDate(user, end, localDate(3))
    await user.selectOptions(reason, "incapacidad")

    await user.click(submit)

    await expectFieldError(attachment, ATTACHMENT_REQUIRED)
    expect(start).not.toHaveAttribute("aria-invalid", "true")
    expect(end).not.toHaveAttribute("aria-invalid", "true")
    await settle()
    expect(submitCalls()).toHaveLength(0)
  })
})
