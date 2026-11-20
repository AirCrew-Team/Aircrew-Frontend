import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect } from "vitest"

import { PATHS } from "@/routes/paths"

import { renderRoute } from "../utils/renderRoute"

// Utilidades de los tests de la spec ausencias-reales (no es un *.test: Vitest no lo recoge).

export type User = ReturnType<typeof userEvent.setup>

// La ruta se carga con `lazy` (react-hook-form + zod): la primera espera lleva margen.
export const LAZY = { timeout: 3000 }

export const FIELD = {
  // Regex sin anclas: getByLabelText usa el textContent del <label>, que incluye lo
  // aria-hidden (el número del paso delante y el asterisco detrás).
  start: /Fecha de inicio/,
  end: /Fecha de fin/,
  reason: "Motivo de la Ausencia",
  notes: "Observaciones Adicionales",
  attachment: "Soporte o Incapacidad Médica",
} as const

export const SUBMIT = "Enviar Aviso a Despacho"
export const SUCCESS_TITLE = "Aviso enviado al supervisor"
export const NOTES = "Fiebre alta desde la madrugada."

// Supuestos de textos (la spec no los fija): mensajes de validación de las fechas.
export const DATE_ERROR = {
  startRequired: "Indica la fecha de inicio.",
  endRequired: "Indica la fecha de fin.",
  startBeforeToday: "La fecha de inicio no puede ser anterior a hoy.",
  endBeforeStart: "La fecha de fin no puede ser anterior a la de inicio.",
  tooLong:
    "No puede haber más de 30 días entre la fecha de inicio y la de fin.",
} as const

export const ATTACHMENT_REQUIRED =
  "Adjunta el soporte médico de la incapacidad."

const pad = (value: number) => String(value).padStart(2, "0")

// «YYYY-MM-DD» del día local `offset` días después de hoy. Con getters locales, nunca
// toISOString(), que en Bogotá (UTC−5) daría el día siguiente por la noche.
export const localDate = (offset = 0) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const normalize = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim()

export const loadingStatuses = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("status")
    .filter((element) => /^cargando/i.test(normalize(element.textContent)))

export const alertsWithText = (container: HTMLElement, text: string) =>
  within(container)
    .queryAllByRole("alert")
    .filter((element) => normalize(element.textContent) === text)

export const pdf = (name = "incapacidad.pdf") =>
  new File(["%PDF-1.4 prueba"], name, { type: "application/pdf" })

// Las fechas no tienen role (input type="date"): se buscan por su etiqueta.
export const dateInput = (form: HTMLElement, label: RegExp) =>
  within(form).getByLabelText(label, { selector: "input" }) as HTMLInputElement

export const attachmentInput = (form: HTMLElement) => {
  const input = form.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input, 'el comprobante debe ser un <input type="file">').not.toBeNull()
  expect(input).toHaveAccessibleName(FIELD.attachment)
  return input as HTMLInputElement
}

// Monta Reportar Ausencia y espera el formulario ya listo (con las dos fechas).
export const openReportForm = async (
  options?: Parameters<typeof userEvent.setup>[0]
) => {
  const user = userEvent.setup(options)
  const router = renderRoute(PATHS.tripulante.reportarAusencia)
  const main = await screen.findByRole("main", undefined, LAZY)
  const form = await waitFor(() => {
    const element = main.querySelector("form")
    expect(element, "la pantalla debe tener un <form>").not.toBeNull()
    return element as HTMLFormElement
  }, LAZY)
  await waitFor(() => expect(loadingStatuses(main)).toHaveLength(0))
  const scope = within(form)
  const start = await waitFor(() => dateInput(form, FIELD.start))
  return {
    user,
    router,
    main,
    form,
    start,
    end: dateInput(form, FIELD.end),
    reason: scope.getByRole("combobox", { name: FIELD.reason }),
    notes: scope.getByRole("textbox", { name: FIELD.notes }),
    attachment: attachmentInput(form),
    submit: scope.getByRole("button", { name: SUBMIT }),
  }
}

export const typeDate = async (
  user: User,
  input: HTMLInputElement,
  value: string
) => {
  await user.clear(input)
  if (value) await user.type(input, value)
}
