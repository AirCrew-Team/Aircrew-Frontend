import type { AppNotification } from "@/App/actions/notifications/notifications.actions"
import { PATHS } from "@/routes/paths"

// Id de `data`, listo para la URL, solo si es un texto no vacío (los avisos antiguos
// pueden no traerlo).
const idOf = (value: unknown) =>
  typeof value === "string" && value !== "" ? encodeURIComponent(value) : null

// Día local AAAA-MM-DD de un instante, como dayFromToday de Programación (nunca
// toISOString, que es UTC). null si el instante no es válido.
const localDayOf = (value: unknown) => {
  if (typeof value !== "string") return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

// Pantalla a la que lleva un aviso de la campana (spec notificaciones-navegables). null:
// tipo desconocido o falta el id, y el aviso no se puede pulsar.
export const notificationTarget = ({
  type,
  data,
}: AppNotification): string | null => {
  switch (type) {
    case "absence:reported":
    case "absence:covered": {
      const absence = data.absence
      const id =
        typeof absence === "object" && absence !== null && "id" in absence
          ? idOf(absence.id)
          : null
      return id ? `${PATHS.superVisor.ausencias}?ausencia=${id}` : null
    }
    case "absence:suggestions_ready":
    case "absence:deadline_missed": {
      const id = idOf(data.absence_id)
      return id
        ? `${PATHS.superVisor.solicitudesReemplazo}?solicitud=${id}`
        : null
    }
    case "flight:slot_vacated": {
      const id = idOf(data.flight_id)
      if (!id) return null
      const day = localDayOf(data.departure_at)
      return `${PATHS.superVisor.programacion}?vuelo=${id}${day ? `&fecha=${day}` : ""}`
    }
    case "assignment:replacement":
      return PATHS.tripulante.inicio
    case "certification:registered":
    case "certification:verified":
      return PATHS.tripulante.certificaciones
    default:
      return null
  }
}
