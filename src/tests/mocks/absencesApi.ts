// Contrato de ausencias del servicio crew (spec ausencias-reales) que simulan los tests:
// - POST /api/crew/absences con { start_date, end_date, reason, notes, attachment } → 201
//   con la ausencia; errores { error: "texto" } con 400 o 409;
// - GET /api/crew/absences → lista de ausencias (sin los bytes del comprobante);
// - GET /api/crew/absences/:id → la misma forma;
// - GET /api/crew/absences/:id/attachment → el binario del comprobante.
// Los errores de este servicio son planos ({ error: "texto" }): no usar errorBody de
// authApi, que los anida. Los valores son simples a propósito (Gitleaks).
import { onTestFinished } from "vitest"
import { http, HttpResponse } from "msw"

import { server } from "../utils/server"

import { API_URL } from "./authApi"

export const ABSENCES_URL = `${API_URL}/api/crew/absences`
export const absenceUrl = (id: string) => `${ABSENCES_URL}/${id}`
export const attachmentUrl = (id: string) => `${ABSENCES_URL}/${id}/attachment`

// Tabla única de motivos (Decisiones, punto 6).
export const REASONS = {
  incapacidad: { api: "illness", label: "Incapacidad médica repentina" },
  fatiga: { api: "fatigue", label: "Fatiga operacional / RAC 212" },
  calamidad: { api: "emergency", label: "Calamidad doméstica o familiar" },
  traslado: { api: "transfer", label: "Dificultad de traslado comprobada" },
} as const

export const OVERLAP_MESSAGE =
  "Ya tienes una ausencia reportada que se cruza con esas fechas."
export const GENERIC_SUBMIT_ERROR =
  "No pudimos enviar el reporte. Intenta de nuevo."

export interface ApiAbsenceAttachment {
  file_name: string
  mime_type: string
  size_bytes: number
}

export interface ApiAbsence {
  id: string
  crew_user_id: string
  crew_name: string
  employee_code: string
  position: string
  start_date: string
  end_date: string
  reason: string
  notes: string | null
  status: "reported" | "covered"
  replacement_user_id: string | null
  replacement_name: string | null
  covered_at: string | null
  created_at: string
  flight_id: null
  flight_number: null
  flight_departure_at: null
  attachment: ApiAbsenceAttachment | null
}

// Las fechas del tablero solo se muestran (nada las compara con hoy): pueden ser fijas.
export const REPORTED_ABSENCE: ApiAbsence = {
  id: "abs-1",
  crew_user_id: "u-real-crew-1",
  crew_name: "Laura Méndez Ríos",
  employee_code: "EMP-100",
  position: "Auxiliar de vuelo",
  start_date: "2026-11-20",
  end_date: "2026-11-22",
  reason: "illness",
  notes: "Fiebre alta desde la madrugada.",
  status: "reported",
  replacement_user_id: null,
  replacement_name: null,
  covered_at: null,
  created_at: "2026-11-19T14:30:00.000Z",
  flight_id: null,
  flight_number: null,
  flight_departure_at: null,
  attachment: {
    file_name: "incapacidad-laura.pdf",
    mime_type: "application/pdf",
    size_bytes: 2048,
  },
}

export const COVERED_ABSENCE: ApiAbsence = {
  id: "abs-2",
  crew_user_id: "u-real-crew-2",
  crew_name: "Pedro Gómez Ruiz",
  employee_code: "EMP-200",
  position: "Primer Oficial",
  start_date: "2026-12-03",
  end_date: "2026-12-04",
  reason: "emergency",
  notes: null,
  status: "covered",
  replacement_user_id: "u-real-crew-3",
  replacement_name: "Sofía Herrera Paz",
  covered_at: "2026-11-19T18:00:00.000Z",
  created_at: "2026-11-19T15:00:00.000Z",
  flight_id: null,
  flight_number: null,
  flight_departure_at: null,
  attachment: null,
}

export const absenceError = (status: number, message: string) =>
  HttpResponse.json({ error: message }, { status })

type Respond = () => Response | Promise<Response>

// POST /absences: guarda cada body recibido y responde con `respond` (por defecto, 201 con
// una ausencia creada a partir del body).
export const mockReportAbsence = (respond?: Respond) => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.post(ABSENCES_URL, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      if (respond) return respond()
      return HttpResponse.json(
        {
          ...REPORTED_ABSENCE,
          id: "abs-nueva",
          start_date: body.start_date,
          end_date: body.end_date,
          reason: body.reason,
          notes: body.notes,
          attachment: null,
        },
        { status: 201 }
      )
    })
  )
  return bodies
}

// GET /absences y GET /absences/:id con la lista dada. Devuelve los ids pedidos al detalle.
export const mockAbsencesList = (
  list: ApiAbsence[] = [REPORTED_ABSENCE, COVERED_ABSENCE],
  respondDetail?: (id: string) => Response | Promise<Response>
) => {
  const detailIds: string[] = []
  server.use(
    http.get(ABSENCES_URL, () => HttpResponse.json(list)),
    http.get(`${ABSENCES_URL}/:id`, ({ params }) => {
      const id = String(params.id)
      detailIds.push(id)
      if (respondDetail) return respondDetail(id)
      const absence = list.find((item) => item.id === id)
      return absence
        ? HttpResponse.json(absence)
        : absenceError(404, "Ausencia no encontrada.")
    })
  )
  return detailIds
}

export const mockAbsencesListError = () =>
  server.use(http.get(ABSENCES_URL, () => absenceError(500, "Error interno")))

// GET /absences/:id/attachment. Devuelve los ids pedidos.
export const mockAttachment = (respond?: Respond) => {
  const ids: string[] = []
  server.use(
    http.get(`${ABSENCES_URL}/:id/attachment`, ({ params }) => {
      ids.push(String(params.id))
      if (respond) return respond()
      return new HttpResponse(new TextEncoder().encode("%PDF-1.4 prueba"), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="incapacidad.pdf"',
        },
      })
    })
  )
  return ids
}

// Todas las peticiones que salen durante el test (con o sin handler), como «MÉTODO url».
// Una petición sin handler no hace fallar el test (Axios recibe un Network Error): para
// afirmar «no llamó al backend» hay que contarlas.
export const recordRequests = () => {
  const requests: string[] = []
  const listener = ({ request }: { request: Request }) => {
    requests.push(`${request.method} ${request.url}`)
  }
  server.events.on("request:start", listener)
  onTestFinished(() => {
    server.events.removeListener("request:start", listener)
  })
  return requests
}
