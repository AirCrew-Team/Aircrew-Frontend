// Contrato de ausencias del servicio crew (spec ausencias-reales) que simulan los tests:
// - POST /api/crew/absences con { start_date, end_date, reason, notes, attachment } → 201
//   con la ausencia; errores { error: "texto" } con 400 o 409;
// - GET /api/crew/absences → lista de ausencias (sin los bytes del comprobante): las de
//   fechas y sus hijas por vuelo (parent_absence_id), más las de un vuelo reportado suelto;
// - GET /api/crew/absences/:id → la misma forma;
// - GET /api/crew/absences/:id/attachment → el binario del comprobante.
// Los errores de este servicio son planos ({ error: "texto" }): no usar errorBody de
// authApi, que los anida. Los valores son simples a propósito (Gitleaks).
import { onTestFinished } from "vitest"
import { http, HttpResponse } from "msw"

import type { Absence } from "@/App/types/absences.types"

import { server } from "../utils/server"

import { API_URL } from "./authApi"

export const ABSENCES_URL = `${API_URL}/api/crew/absences`
export const absenceUrl = (id: string) => `${ABSENCES_URL}/${id}`
export const attachmentUrl = (id: string) => `${ABSENCES_URL}/${id}/attachment`

// Tabla única de motivos (Decisiones, punto 6).
export const REASONS = {
  incapacidad: { api: "illness", label: "Incapacidad médica repentina" },
  fatiga: { api: "fatigue", label: "Fatiga operacional / 14 CFR 117.5" },
  calamidad: { api: "emergency", label: "Calamidad doméstica o familiar" },
  traslado: { api: "transfer", label: "Dificultad de traslado comprobada" },
} as const

export const OVERLAP_MESSAGE =
  "Ya tienes una ausencia reportada que se cruza con esas fechas."
export const GENERIC_SUBMIT_ERROR =
  "No pudimos enviar el reporte. Intenta de nuevo."

// Ausencia tal como la manda el backend: el tipo real (Absence, con sus null) con el
// motivo en inglés, todos los estados del backend y los ids que el frontend no usa. Sin
// `flights`: los vuelos de una ausencia por fechas llegan como filas propias (hijas).
export type ApiAbsence = Omit<Absence, "reason" | "status" | "flights"> & {
  crew_user_id: string
  reason: string
  status: "reported" | "pending_ack" | "covered" | "cancelled"
  replacement_user_id: string | null
  kind: "dates" | "flight"
  parent_absence_id: string | null
  flight_id: string | null
  flight_departure_at: string | null
}

// Los ejemplos van con satisfies (no con anotación): conservan sus tipos literales, así
// crew_name sigue siendo string para los tests que lo usan como nombre de la tarjeta.
// Las fechas del tablero solo se muestran (nada las compara con hoy): pueden ser fijas.
export const REPORTED_ABSENCE = {
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
  kind: "dates",
  parent_absence_id: null,
  flight_id: null,
  flight_number: null,
  flight_departure_at: null,
  attachment: {
    file_name: "incapacidad-laura.pdf",
    mime_type: "application/pdf",
    size_bytes: 2048,
  },
} satisfies ApiAbsence

// Ausencia por fechas cubierta directamente (PATCH /absences/:id/cover), sin hijas.
export const COVERED_ABSENCE = {
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
  kind: "dates",
  parent_absence_id: null,
  flight_id: null,
  flight_number: null,
  flight_departure_at: null,
  attachment: null,
} satisfies ApiAbsence

// Hija `n` por vuelo de una ausencia por fechas, como la crea el backend al reportar:
// mismo tripulante, motivo y observaciones; con vuelo y sin fechas ni comprobante. En el backend solo cambian de estado las hijas: aprobar un
// reemplazo → pending_ack; su «Enterado» → covered. El padre se queda en reported.
export const flightAbsenceOf = (
  parent: ApiAbsence,
  n: number,
  changes: Partial<ApiAbsence> = {}
): ApiAbsence => ({
  ...parent,
  id: `${parent.id}-vuelo-${n}`,
  kind: "flight",
  parent_absence_id: parent.id,
  start_date: null,
  end_date: null,
  status: "reported",
  replacement_user_id: null,
  replacement_name: null,
  covered_at: null,
  flight_id: `f-${parent.id}-${n}`,
  flight_number: `DL${1100 + n}`,
  // La salida solo ordena los vuelos (n de 1 a 9: del 20 al 28 de noviembre).
  flight_departure_at: `2026-11-${19 + n}T13:00:00.000Z`,
  attachment: null,
  ...changes,
})

// Cambios de una hija que espera el «Enterado» de su reemplazo y de una ya cubierta.
export const PENDING_ACK_CHANGES = {
  status: "pending_ack",
  replacement_user_id: "u-real-crew-5",
  replacement_name: "Iván Torres Gil",
} satisfies Partial<ApiAbsence>

export const COVERED_CHANGES = {
  status: "covered",
  replacement_user_id: "u-real-crew-3",
  replacement_name: "Sofía Herrera Paz",
  covered_at: "2026-11-19T18:00:00.000Z",
} satisfies Partial<ApiAbsence>

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
          // Formato del backend (RFC 6266): nombre en ASCII y el real en UTF-8.
          "Content-Disposition":
            "attachment; filename=\"incapacidad-medica.pdf\"; filename*=UTF-8''incapacidad-m%C3%A9dica.pdf",
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
