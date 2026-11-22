// Ausencias del servicio crew (spec ausencias-reales).

// Motivo con los nombres del frontend; App/actions/absences lo traduce al del backend.
export type AbsenceReason = "incapacidad" | "fatiga" | "calamidad" | "traslado"

// Fechas «YYYY-MM-DD», sin hora: se tratan como fechas puras, sin zona horaria.
export interface ReportAbsenceInput {
  startDate: string
  endDate: string
  reason: AbsenceReason
  notes: string
  attachment: File | null
}

export interface AbsenceAttachment {
  file_name: string
  mime_type: string
  size_bytes: number
}

// Ausencia tal como la devuelven la lista y el detalle, con el motivo ya traducido.
// Pueden llegar en null: el nombre (si Admin no responde), el código y el cargo (LEFT
// JOIN) y las fechas (filas antiguas por vuelo, que sí traen `flight_number`).
export interface Absence {
  id: string
  crew_name: string | null
  employee_code: string | null
  position: string | null
  start_date: string | null
  end_date: string | null
  flight_number: string | null
  // null: un motivo del backend que el frontend no conoce.
  reason: AbsenceReason | null
  notes: string | null
  // pending_ack: el reemplazo aún no da «Enterado». Un estado desconocido llega como
  // «reported»; las canceladas no llegan (getAbsences las quita).
  status: "reported" | "pending_ack" | "covered"
  replacement_name: string | null
  // ISO 8601 UTC.
  covered_at: string | null
  created_at: string
  attachment: AbsenceAttachment | null
}
