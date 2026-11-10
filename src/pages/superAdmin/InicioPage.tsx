import AdminWelcomeHeader from "@/modules/adminHome/components/AdminWelcomeHeader"
import AirportStatusHero from "@/modules/adminHome/components/AirportStatusHero"
import CertificationsOverviewCard from "@/modules/adminHome/components/CertificationsOverviewCard"
import FleetCard from "@/modules/adminHome/components/FleetCard"
import OpsDeckFooter from "@/modules/adminHome/components/OpsDeckFooter"
import StandbySummary from "@/modules/adminHome/components/StandbySummary"
import UsersCard from "@/modules/adminHome/components/UsersCard"

// Inicio del super admin (/admin). Como toda página, solo ordena los módulos:
// cada sección pide sus propios datos y maneja su carga y su error.
const InicioPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Bienvenida, sede y reloj maestro UTC. */}
      <AdminWelcomeHeader />

      {/* 2. Estado de la base principal sobre la foto. */}
      <AirportStatusHero />

      {/* 3. Accesos a los módulos del admin.
          Móvil: 1 columna. Tablet: 2 columnas, y la última tarjeta ocupa la fila
          completa para no quedar sola a media pantalla. Escritorio: 3 columnas. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 md:[&>:last-child]:col-span-2 lg:[&>:last-child]:col-span-1">
        <UsersCard />
        <FleetCard />
        <CertificationsOverviewCard />
      </div>

      {/* 4. Guardia del turno y confirmación de la dotación. */}
      <StandbySummary />

      {/* 5. Pie con la identificación de la consola y la versión. */}
      <OpsDeckFooter />
    </div>
  )
}

export default InicioPage
