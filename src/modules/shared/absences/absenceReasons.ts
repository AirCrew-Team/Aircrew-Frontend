import type { AbsenceReason } from "@/App/types/absences.types"

// Etiqueta de cada motivo, en el orden del formulario. La usan Reportar ausencia y el
// tablero de Ausencias del supervisor.
export const ABSENCE_REASON_LABELS: Record<AbsenceReason, string> = {
  incapacidad: "Incapacidad médica repentina",
  fatiga: "Fatiga operacional / RAC 212",
  calamidad: "Calamidad doméstica o familiar",
  traslado: "Dificultad de traslado comprobada",
}

// Etiqueta de una ausencia real: null es un motivo del backend que aquí no se conoce.
export const reasonLabel = (reason: AbsenceReason | null) =>
  reason ? ABSENCE_REASON_LABELS[reason] : "Otro motivo"
