import { useQuery } from "@tanstack/react-query"

import { getAirportStatus } from "@/modules/adminHome/data/adminHome.data"
import BaseStatusHero from "@/modules/shared/opsHome/components/BaseStatusHero"

// Bloque 2: estado de la base principal. Hace la consulta y pasa sus textos al banner compartido.
const AirportStatusHero = () => {
  // Clave en el dominio "flights": el estado del aeropuerto vendrá del servicio de vuelos.
  const { data, isPending, isError } = useQuery({
    queryKey: ["flights", "airportStatus"],
    queryFn: getAirportStatus,
  })

  return (
    <BaseStatusHero
      fallbackLabel="Estado de la base"
      loadingText="Cargando estado de la base…"
      errorText="No se pudo cargar el estado de la base."
      status={
        data
          ? {
              tag: data.trafficLabel,
              location: data.location,
              headline: data.headline,
              summary: data.summary,
              stats: [
                { label: "Pista activa", value: data.activeRunway },
                { label: "QNH local", value: data.localQnh },
              ],
            }
          : undefined
      }
      isPending={isPending}
      isError={isError}
    />
  )
}

export default AirportStatusHero
