import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http } from "msw"
import { describe, expect, it, onTestFinished } from "vitest"

import { reportAbsence } from "@/App/actions/absences/absences.actions"
import AbsenceDetail from "@/modules/absenceTracking/components/AbsenceDetail"

import {
  ABSENCES_URL,
  absenceError,
  mockReportAbsence,
} from "../mocks/absencesApi"
import { server } from "../utils/server"

// Revisión de ausencias-reales: detalles de las acciones y de la consulta del detalle.

describe("Revisión: mime_type del comprobante", () => {
  it.each([
    { name: "x.pdf", mime: "application/pdf" },
    { name: "x.png", mime: "image/png" },
    { name: "x.jpg", mime: "image/jpeg" },
    { name: "x.JPEG", mime: "image/jpeg" },
  ])(
    "un File sin type llamado «$name» se envía con mime_type «$mime»",
    async ({ name, mime }) => {
      const bodies = mockReportAbsence()
      // Sin `type`: algunos navegadores lo dejan vacío.
      const file = new File(["%PDF-1.4 prueba"], name)
      expect(file.type).toBe("")

      await reportAbsence({
        startDate: "2026-11-21",
        endDate: "2026-11-22",
        reason: "incapacidad",
        notes: "",
        attachment: file,
      })

      expect(bodies).toHaveLength(1)
      expect(bodies[0].attachment).toMatchObject({
        file_name: name,
        mime_type: mime,
      })
    }
  )

  it("si el File trae type, se envía ese", async () => {
    const bodies = mockReportAbsence()

    await reportAbsence({
      startDate: "2026-11-21",
      endDate: "2026-11-22",
      reason: "incapacidad",
      notes: "",
      attachment: new File(["%PDF-1.4 prueba"], "x.pdf", {
        type: "application/pdf",
      }),
    })

    expect(bodies[0].attachment).toMatchObject({ mime_type: "application/pdf" })
  })
})

describe("Revisión: consulta del detalle sin reintentos", () => {
  it("un 404 del detalle no se reintenta: una sola petición y el error del popup enseguida", async () => {
    let calls = 0
    server.use(
      http.get(`${ABSENCES_URL}/:id`, () => {
        calls += 1
        return absenceError(404, "Ausencia no encontrada.")
      })
    )
    // Cliente con las opciones por defecto (reintenta 3 veces), no el de renderRoute.
    const client = new QueryClient()
    onTestFinished(() => client.clear())

    render(
      <QueryClientProvider client={client}>
        <AbsenceDetail id="abs-inexistente" />
      </QueryClientProvider>
    )

    expect(
      await screen.findByText(
        "No se pudo cargar el detalle de la ausencia.",
        {},
        { timeout: 1500 }
      )
    ).toBeInTheDocument()
    expect(calls).toBe(1)
  })
})
