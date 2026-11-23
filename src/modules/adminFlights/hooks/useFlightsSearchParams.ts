import { useListSearchParams } from "@/hooks/useListSearchParams"
import { FLIGHT_STATUSES } from "@/modules/adminFlights/utils/flightStatus"

// Registros por página: lo envía el frontend y lo confirma el backend en la respuesta.
export const FLIGHTS_PAGE_SIZE = 5

// URL de la lista de vuelos: ?page=, ?q= (búsqueda) y ?status= (programado, retrasado,
// en_vuelo, completado o cancelado). La barra y la tabla leen y cambian los mismos
// valores.
export const useFlightsSearchParams = () =>
  useListSearchParams({
    filterParam: "status",
    filterValues: FLIGHT_STATUSES,
  })
