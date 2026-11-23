import FlightsHeader from "@/modules/adminFlights/components/FlightsHeader"
import FlightsStats from "@/modules/adminFlights/components/FlightsStats"
import FlightsTable from "@/modules/adminFlights/components/FlightsTable"
import FlightsToolbar from "@/modules/adminFlights/components/FlightsToolbar"

// Vuelos del super admin (/admin/vuelos). Como toda página, solo ordena los módulos.
// La página, la búsqueda y el filtro viven en la URL (?page=, ?q=, ?status=).
const VuelosPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1 y 2. Encabezado e indicadores, como en Aeronaves. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <FlightsHeader />
        <FlightsStats />
      </div>

      {/* 3. Buscador, filtros por estado y «Crear vuelo». */}
      <FlightsToolbar />

      {/* 4. Tabla de vuelos con su paginación (5 por página). */}
      <FlightsTable />
    </div>
  )
}

export default VuelosPage
