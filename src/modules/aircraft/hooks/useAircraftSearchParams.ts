import { useListSearchParams } from "@/hooks/useListSearchParams"
import { AIRCRAFT_FILTERS } from "@/modules/aircraft/utils/aircraftStatus"

// URL de la lista de aeronaves: ?page=, ?q= (búsqueda) y ?status= (filtro: operativa o
// mantenimiento). La barra y la lista usan este hook para leer y cambiar
// los mismos valores.
export const useAircraftSearchParams = () =>
  useListSearchParams({
    filterParam: "status",
    filterValues: AIRCRAFT_FILTERS,
  })
