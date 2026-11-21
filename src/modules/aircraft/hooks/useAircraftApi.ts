import { useQuery } from "@tanstack/react-query"

import * as realApi from "@/App/actions/aircraft/aircraft.actions"
import type { MaintenanceType } from "@/App/types/aircraft.types"
import * as demoApi from "@/modules/aircraft/data/aircraft.data"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Funciones de datos de la pantalla Aeronaves. Las cuentas demo y el selector «Rol (dev)»
// usan los datos de ejemplo (no llaman al backend); la sesión real, el servicio flights.
// Las dos fuentes tienen las mismas firmas y devuelven los mismos tipos.
export const useAircraftApi = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  const api = isDemo ? demoApi : realApi
  return {
    getAircraft: api.getAircraft,
    getAircraftStats: api.getAircraftStats,
    getAircraftOptions: api.getAircraftOptions,
    createAircraft: api.createAircraft,
    updateAircraft: api.updateAircraft,
    deleteAircraft: api.deleteAircraft,
    getFleetManifest: api.getFleetManifest,
    getAircraftReport: api.getAircraftReport,
    setMaintenanceTask: api.setMaintenanceTask,
    releaseToService: api.releaseToService,
    uploadAircraftPhoto: api.uploadAircraftPhoto,
  }
}

// Catálogos del backend (modelos, bases y motivos). Cambian poco: se reutilizan 10
// minutos (ADR 003). Los comparten el formulario, la tabla, el informe y el manifiesto.
export const useAircraftOptions = (enabled = true) => {
  const { getAircraftOptions } = useAircraftApi()
  return useQuery({
    queryKey: ["aircraft", "options"],
    queryFn: getAircraftOptions,
    staleTime: 10 * 60 * 1000,
    enabled,
  })
}

// Texto de un motivo de mantenimiento según el catálogo. Mientras el catálogo carga (o si
// falla), se muestra el código tal cual, sin bloquear la pantalla.
export const useMaintenanceLabel = () => {
  const { data } = useAircraftOptions()
  return (code: MaintenanceType) =>
    data?.maintenanceTypes.find((type) => type.code === code)?.label ?? code
}
