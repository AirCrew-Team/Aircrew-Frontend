import AircraftHeader from "@/modules/aircraft/components/AircraftHeader"
import AircraftStats from "@/modules/aircraft/components/AircraftStats"
import AircraftTable from "@/modules/aircraft/components/AircraftTable"
import AircraftToolbar from "@/modules/aircraft/components/AircraftToolbar"

// Aeronaves del super admin (/admin/aeronaves). Como toda página, solo ordena los
// módulos. La página, la búsqueda y el filtro viven en la URL (?page=, ?q=, ?status=).
const AeronavesPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1 y 2. Encabezado e indicadores, como en Usuarios: apilados hasta pantallas
          grandes (xl), donde las tarjetas van al lado del texto. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <AircraftHeader />
        <AircraftStats />
      </div>

      {/* 3. Buscador, filtros por estado, exportar manifiesto y registro de aeronave. */}
      <AircraftToolbar />

      {/* 4. Tabla de la flota con su paginación (5 por página). */}
      <AircraftTable />
    </div>
  )
}

export default AeronavesPage
