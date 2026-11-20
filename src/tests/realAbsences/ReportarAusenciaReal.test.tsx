import { act, screen, waitFor, within } from "@testing-library/react"
import { HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { ROLES } from "@/App/types/auth.types"
import { useAuthStore } from "@/stores/auth.store"

import {
  ABSENCES_URL,
  absenceError,
  GENERIC_SUBMIT_ERROR,
  mockReportAbsence,
  OVERLAP_MESSAGE,
  REASONS,
  recordRequests,
} from "../mocks/absencesApi"
import { REAL_USERS } from "../mocks/profileApi"
import { findToast, queryToast } from "../utils/toasts"
import {
  alertsWithText,
  attachmentInput,
  dateInput,
  FIELD,
  localDate,
  NOTES,
  openReportForm,
  pdf,
  SUCCESS_TITLE,
  typeDate,
} from "./realAbsencesTestUtils"

// Spec ausencias-reales, AU-06 (envío al backend con sesión real) y AU-07 (errores del
// envío). Con la sesión real el formulario llama a POST /api/crew/absences; las cuentas
// demo siguen con la simulación.

const PDF_CONTENT = "%PDF-1.4 prueba"
// base64 puro (sin el prefijo «data:…;base64,» de readAsDataURL).
const PDF_BASE64 = btoa(PDF_CONTENT)

// Deja pasar respuestas y renders pendientes antes de afirmar que algo no ocurrió.
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))

const postsToAbsences = (requests: string[]) =>
  requests.filter((request) => request === `POST ${ABSENCES_URL}`)

describe("AU-06: envío con sesión real", () => {
  beforeEach(() => {
    useAuthStore.getState().setUser(REAL_USERS.crew)
  })

  it("AU-06: con incapacidad y un PDF, envía POST /api/crew/absences con las fechas, «illness», las observaciones y el adjunto en base64", async () => {
    const bodies = mockReportAbsence()
    const { user, form, start, end, reason, notes, attachment, submit } =
      await openReportForm()
    const from = localDate(1)
    const to = localDate(3)

    await typeDate(user, start, from)
    await typeDate(user, end, to)
    await user.selectOptions(reason, "incapacidad")
    await user.type(notes, NOTES)
    await user.upload(attachment, pdf("incapacidad.pdf"))
    await within(form).findByText("incapacidad.pdf")
    await user.click(submit)

    await findToast(SUCCESS_TITLE)
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toEqual({
      start_date: from,
      end_date: to,
      reason: "illness",
      notes: NOTES,
      attachment: {
        file_name: "incapacidad.pdf",
        mime_type: "application/pdf",
        data_base64: PDF_BASE64,
      },
    })
  })

  it.each([
    ["fatiga", REASONS.fatiga.api],
    ["calamidad", REASONS.calamidad.api],
    ["traslado", REASONS.traslado.api],
  ] as const)(
    "AU-06: con «%s», sin observaciones ni archivo, envía reason «%s», notes null y attachment null",
    async (reasonValue, apiReason) => {
      const bodies = mockReportAbsence()
      const { user, start, end, reason, submit } = await openReportForm()
      const from = localDate(0)
      const to = localDate(0)

      await typeDate(user, start, from)
      await typeDate(user, end, to)
      await user.selectOptions(reason, reasonValue)
      await user.click(submit)

      await findToast(SUCCESS_TITLE)
      expect(bodies).toEqual([
        {
          start_date: from,
          end_date: to,
          reason: apiReason,
          notes: null,
          attachment: null,
        },
      ])
    }
  )

  it("AU-06: con el 201 aparece el toast «Aviso enviado al supervisor» y el formulario queda vacío y listo para otro reporte", async () => {
    mockReportAbsence()
    const { user, main, form, start, end, reason, notes, attachment, submit } =
      await openReportForm()

    await typeDate(user, start, localDate(1))
    await typeDate(user, end, localDate(2))
    await user.selectOptions(reason, "incapacidad")
    await user.type(notes, NOTES)
    await user.upload(attachment, pdf("incapacidad.pdf"))
    await within(form).findByText("incapacidad.pdf")
    await user.click(submit)

    const toast = await findToast(SUCCESS_TITLE)
    expect(toast).toHaveAttribute("data-type", "success")

    // Se vuelven a buscar: limpiar puede montar el formulario de nuevo.
    await waitFor(() => expect(dateInput(main, FIELD.start)).toHaveValue(""))
    const scope = within(main)
    const fields = {
      start: dateInput(main, FIELD.start),
      end: dateInput(main, FIELD.end),
      reason: scope.getByRole("combobox", { name: FIELD.reason }),
      notes: scope.getByRole("textbox", { name: FIELD.notes }),
      attachment: attachmentInput(main),
    }
    expect(fields.end).toHaveValue("")
    expect(fields.reason).toHaveValue("")
    expect(fields.notes).toHaveValue("")
    expect(scope.queryByText("incapacidad.pdf")).toBeNull()
    // Supuesto: limpio quiere decir listo para otro reporte (prueba manual, paso 3).
    for (const field of Object.values(fields)) {
      expect(field).toBeEnabled()
    }
    expect(
      scope.getByRole("button", { name: "Enviar Aviso a Despacho" })
    ).toBeEnabled()
  })
})

describe("AU-07: errores del envío con sesión real", () => {
  beforeEach(() => {
    useAuthStore.getState().setUser(REAL_USERS.crew)
  })

  const BACKEND_400 = "El comprobante no coincide con su tipo."

  it.each([
    {
      name: "409 por solapamiento",
      respond: () => absenceError(409, OVERLAP_MESSAGE),
      expected: OVERLAP_MESSAGE,
      hidden: null,
    },
    {
      name: "400 con el mensaje del backend",
      respond: () => absenceError(400, BACKEND_400),
      expected: BACKEND_400,
      hidden: null,
    },
    {
      name: "500",
      respond: () => absenceError(500, "Error interno"),
      expected: GENERIC_SUBMIT_ERROR,
      hidden: "Error interno",
    },
    {
      name: "error de red",
      respond: () => HttpResponse.error(),
      expected: GENERIC_SUBMIT_ERROR,
      hidden: null,
    },
  ])(
    "AU-07: con $name aparece «$expected» en un role=alert dentro del formulario, sin toast, y lo escrito se conserva",
    async ({ respond, expected, hidden }) => {
      const bodies = mockReportAbsence(respond)
      const { user, form, start, end, reason, notes } = await openReportForm()
      const from = localDate(1)
      const to = localDate(4)

      await typeDate(user, start, from)
      await typeDate(user, end, to)
      await user.selectOptions(reason, "fatiga")
      await user.type(notes, NOTES)
      await user.click(
        within(form).getByRole("button", { name: "Enviar Aviso a Despacho" })
      )

      await waitFor(() =>
        expect(alertsWithText(form, expected)).toHaveLength(1)
      )
      expect(bodies).toHaveLength(1)
      if (hidden) expect(screen.queryByText(hidden)).toBeNull()
      await settle()
      expect(queryToast(SUCCESS_TITLE)).toBeNull()

      expect(start).toHaveValue(from)
      expect(end).toHaveValue(to)
      expect(reason).toHaveValue("fatiga")
      expect(notes).toHaveValue(NOTES)
      for (const field of [start, end, reason, notes]) {
        expect(field).toBeEnabled()
      }
      expect(
        within(form).getByRole("button", { name: "Enviar Aviso a Despacho" })
      ).toBeEnabled()
    }
  )
})

describe("Decisión 3: la cuenta demo sigue con la simulación", () => {
  it("AU-03 (formulario): con la cuenta demo el envío por fechas sale bien sin llamar a POST /api/crew/absences", async () => {
    useAuthStore.getState().setMockRole(ROLES.TRIPULANTE)
    const requests = recordRequests()
    const { user, start, end, reason, submit } = await openReportForm()

    await typeDate(user, start, localDate(1))
    await typeDate(user, end, localDate(2))
    await user.selectOptions(reason, "fatiga")
    await user.click(submit)

    await findToast(SUCCESS_TITLE)
    expect(postsToAbsences(requests)).toEqual([])
  })
})
