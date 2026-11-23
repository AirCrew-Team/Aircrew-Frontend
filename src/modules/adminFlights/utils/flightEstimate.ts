import type { Airport } from "@/modules/adminFlights/types/adminFlights.types"

// Duración estimada de una ruta, para proponer la llegada en «Crear vuelo». Es una
// estimación (el admin la puede cambiar): el tiempo real depende del viento, la
// aerovía y la aeronave.
// - Distancia: ortodrómica (la más corta sobre la Tierra) entre los dos aeropuertos.
// - Velocidad de crucero media de un avión comercial: 820 km/h.
// - Más 30 min de rodaje, despegue, ascenso, aproximación y aterrizaje.
// - Redondeada a 5 min, como se publican los horarios.
const EARTH_RADIUS_KM = 6371
const CRUISE_SPEED_KMH = 820
const GROUND_AND_CLIMB_MINUTES = 30
const ROUND_TO_MINUTES = 5

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

type Located = Pick<Airport, "latitude" | "longitude">

// Kilómetros entre dos aeropuertos (fórmula del haversine). null si falta una coordenada.
export const distanceKm = (from: Located, to: Located): number | null => {
  if (
    from.latitude === null ||
    from.longitude === null ||
    to.latitude === null ||
    to.longitude === null
  ) {
    return null
  }
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Minutos estimados de vuelo entre dos aeropuertos; null sin coordenadas.
export const estimatedMinutes = (from: Located, to: Located): number | null => {
  const km = distanceKm(from, to)
  if (km === null) return null
  const minutes = (km / CRUISE_SPEED_KMH) * 60 + GROUND_AND_CLIMB_MINUTES
  return Math.round(minutes / ROUND_TO_MINUTES) * ROUND_TO_MINUTES
}
