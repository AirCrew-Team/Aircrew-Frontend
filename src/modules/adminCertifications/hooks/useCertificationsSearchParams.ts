import { useListSearchParams } from "@/hooks/useListSearchParams"
import { CERTIFICATION_STATES } from "@/modules/adminCertifications/utils/certificationStatus"

// URL de la lista de certificaciones: ?page=, ?q= (búsqueda) y ?status= (filtro por
// estado: verificado, por_verificar o sin_certificado). La barra y la tabla usan este
// hook para leer y cambiar los mismos valores.
export const useCertificationsSearchParams = () =>
  useListSearchParams({
    filterParam: "status",
    filterValues: CERTIFICATION_STATES,
  })
