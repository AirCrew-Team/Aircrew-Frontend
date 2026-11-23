import { useListSearchParams } from "@/hooks/useListSearchParams"
import { CERTIFICATION_STATES } from "@/modules/adminCertifications/utils/certificationStatus"

// Registros por página: lo envía el frontend y lo confirma el backend en la respuesta.
export const CERTIFICATIONS_PAGE_SIZE = 5

// URL de la lista de certificaciones: ?page=, ?q= (búsqueda) y ?status= (filtro por
// estado: verificado, por_verificar o sin_certificado). La barra y la tabla usan este
// hook para leer y cambiar los mismos valores.
export const useCertificationsSearchParams = () =>
  useListSearchParams({
    filterParam: "status",
    filterValues: CERTIFICATION_STATES,
  })
