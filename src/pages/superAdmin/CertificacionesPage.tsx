import CertificationsAdminHeader from "@/modules/adminCertifications/components/CertificationsAdminHeader"
import CertificationsStats from "@/modules/adminCertifications/components/CertificationsStats"
import CertificationsTable from "@/modules/adminCertifications/components/CertificationsTable"
import CertificationsToolbar from "@/modules/adminCertifications/components/CertificationsToolbar"

// Certificaciones del super admin (/admin/certificaciones). Como toda página, solo
// ordena los módulos. La página, la búsqueda y el filtro viven en la URL
// (?page=, ?q=, ?status=).
const CertificacionesPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1 y 2. Encabezado e indicadores, como en Usuarios: apilados hasta pantallas
          grandes (xl), donde las tarjetas van al lado del texto. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <CertificationsAdminHeader />
        <CertificationsStats />
      </div>

      {/* 3. Buscador, filtros por estado y registro de certificado. */}
      <CertificationsToolbar />

      {/* 4. Tabla de certificaciones con su paginación. */}
      <CertificationsTable />
    </div>
  )
}

export default CertificacionesPage
