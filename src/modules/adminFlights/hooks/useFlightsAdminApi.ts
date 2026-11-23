import { useQuery } from "@tanstack/react-query"

import * as realApi from "@/App/actions/flights/flightsAdmin.actions"
import * as demoApi from "@/modules/adminFlights/data/adminFlights.data"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Funciones de datos de la pantalla Vuelos. Las cuentas demo y el selector «Rol (dev)»
// usan los datos de ejemplo (no llaman al backend); la sesión real, el servicio flights.
// Las dos fuentes tienen las mismas firmas y devuelven los mismos tipos.
export const useFlightsAdminApi = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  const api = isDemo ? demoApi : realApi
  return {
    getFlightsCatalog: api.getFlightsCatalog,
    getFlightsStats: api.getFlightsStats,
    getFlights: api.getFlights,
    createFlight: api.createFlight,
  }
}

// Aeropuertos, aeronaves operativas y estados. Cambian poco: se reutilizan 10 minutos
// (ADR 003). Los comparten el formulario, la tabla y la ficha.
export const useFlightsCatalog = (enabled = true) => {
  const { getFlightsCatalog } = useFlightsAdminApi()
  return useQuery({
    queryKey: ["adminFlights", "options"],
    queryFn: getFlightsCatalog,
    staleTime: 10 * 60 * 1000,
    enabled,
  })
}
