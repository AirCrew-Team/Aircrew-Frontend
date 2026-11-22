import { useQuery } from "@tanstack/react-query"

import * as realApi from "@/App/actions/certifications/certifications.actions"
import * as demoApi from "@/modules/adminCertifications/data/adminCertifications.data"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Funciones de datos de la pantalla Certificaciones. Las cuentas demo y el selector
// «Rol (dev)» usan los datos de ejemplo (no llaman al backend); la sesión real, el
// servicio crew. Las dos fuentes tienen las mismas firmas y devuelven los mismos tipos.
export const useCertificationsApi = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  const api = isDemo ? demoApi : realApi
  return {
    getCertificationOptions: api.getCertificationOptions,
    getCertificationsStats: api.getCertificationsStats,
    getCertifications: api.getCertifications,
    getUncertifiedCrew: api.getUncertifiedCrew,
    getCertificationDetail: api.getCertificationDetail,
    downloadCertificateFile: api.downloadCertificateFile,
    saveCertification: api.saveCertification,
    deleteCertification: api.deleteCertification,
  }
}

// Catálogo de certificados (nombres, etiquetas cortas y los de cada cargo). Lo comparten
// la tabla, la ficha y el formulario; casi no cambia, así que se pide una vez.
export const useCertificationCatalog = () => {
  const { getCertificationOptions } = useCertificationsApi()
  return useQuery({
    queryKey: ["certifications", "options"],
    queryFn: getCertificationOptions,
    staleTime: Infinity,
  })
}
