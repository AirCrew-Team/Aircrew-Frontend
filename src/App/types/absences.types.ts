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

// Estado de una ausencia. pending_ack: el reemplazo aún no da «Enterado». Un estado
// desconocido llega como «reported».
export type AbsenceStatus = "reported" | "pending_ack" | "covered" | "cancelled"

// Ausencia por vuelo que salió de una ausencia por fechas (una «hija»): en el backend solo
// cambian de estado las hijas (aprobar un reemplazo y su «Enterado»). Las canceladas no
// llegan.
export interface AbsenceFlight {
  id: string
  flight_number: string | null
  status: Exclude<AbsenceStatus, "cancelled">
  replacement_name: string | null
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
  // En la lista (getAbsences), el de sus vuelos si los tiene, y nunca «cancelled». El
  // detalle por id trae el de la fila, que sí puede ser «cancelled».
  status: AbsenceStatus
  replacement_name: string | null
  // ISO 8601 UTC.
  covered_at: string | null
  created_at: string
  attachment: AbsenceAttachment | null
  // Sus vuelos (hijas), ordenados por salida. Solo los trae la lista: el detalle por id
  // y las ausencias sin vuelos llevan [].
  flights: AbsenceFlight[]
}
