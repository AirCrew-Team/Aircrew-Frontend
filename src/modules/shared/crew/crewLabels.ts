// Traducciones de los valores del backend (en inglés) a los textos de la UI.

export type ApiRank = "captain" | "first_officer" | "purser" | "flight_attendant"

export const RANK_LABEL: Record<ApiRank, string> = {
  captain: "Comandante",
  first_officer: "Primer Oficial",
  purser: "Jefe de Cabina",
  flight_attendant: "Tripulante de Cabina",
}

// Cargo a cubrir con la familia del avión si se conoce: «Primer Oficial A320».
export const positionLabel = (
  role: string | null | undefined,
  aircraftFamily?: string | null
) => {
  const label = RANK_LABEL[role as ApiRank] ?? role ?? "Puesto sin definir"
  return aircraftFamily ? `${label} ${aircraftFamily}` : label
}

export type ApiAbsenceReason = "illness" | "fatigue" | "emergency" | "transfer"

// Las mismas etiquetas del formulario de Reportar Ausencia.
export const ABSENCE_REASON_LABEL: Record<ApiAbsenceReason, string> = {
  illness: "Incapacidad médica repentina",
  fatigue: "Fatiga operacional / RAC 212",
  emergency: "Calamidad doméstica o familiar",
  transfer: "Dificultad de traslado comprobada",
}

// Tiempo hasta la salida: «1h 45m», «0h 20m»; si ya salió, «0h 00m».
export const timeUntil = (iso: string, now = Date.now()) => {
  const minutes = Math.max(
    0,
    Math.floor((new Date(iso).getTime() - now) / 60_000)
  )
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`
}
