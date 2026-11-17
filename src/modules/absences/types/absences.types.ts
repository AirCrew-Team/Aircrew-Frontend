export type AbsenceReason = "incapacidad" | "fatiga" | "calamidad" | "traslado"

export interface AffectedFlight {
  flightNumber: string
  aircraft: string
  origin: string
  destination: string
  // ISO 8601 UTC.
  departureAt: string
  // ISO 8601 UTC: departureAt − 1 h 30 min.
  presentationAt: string
  flightRole: string
  gate: string
  airport: string
}

export interface AbsenceReportInput {
  flightNumber: string
  reason: AbsenceReason
  notes: string
  attachment: File | null
}

export interface AbsenceReportReceipt {
  reportId: string
  flightNumber: string
}
