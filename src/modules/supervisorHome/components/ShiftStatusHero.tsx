import { useQuery } from "@tanstack/react-query"

import BaseStatusHero from "@/modules/shared/opsHome/components/BaseStatusHero"
import { getShiftStatus } from "@/modules/supervisorHome/data/supervisorHome.data"

// Bloque 2: estado del turno en la base. Hace la consulta y pasa sus textos al banner compartido.
const ShiftStatusHero = () => {
  // Clave en el dominio "flights", distinta de ["flights", "airportStatus"] del admin:
  // los datos tienen otra forma y, al cambiar de rol, la caché los confundiría.
  const { data, isPending, isError } = useQuery({
    queryKey: ["flights", "shiftStatus"],
    queryFn: getShiftStatus,
  })

  return (
    <BaseStatusHero
      fallbackLabel="Estado del turno"
      loadingText="Cargando estado del turno…"
      errorText="No se pudo cargar el estado del turno."
      status={
        data
          ? {
              tag: data.tag,
              location: data.location,
              headline: data.headline,
              summary: data.summary,
              stats: [
                { label: "Vuelos hoy", value: `${data.flightsToday} Vuelos` },
                {
                  label: "Guardia activa",
                  value: `${data.standbyReadiness}% Lista`,
                },
              ],
            }
          : undefined
      }
      isPending={isPending}
      isError={isError}
    />
  )
}

export default ShiftStatusHero
