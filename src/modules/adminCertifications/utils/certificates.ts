import type { CertificationCatalog } from "@/modules/adminCertifications/types/adminCertifications.types"

// Lecturas del catálogo de certificados, que viene del backend
// (GET /certifications/options). Sin catálogo (cargando o con error), los códigos se
// muestran tal cual.

type Catalog = CertificationCatalog | undefined

const findCertificate = (catalog: Catalog, code: string) =>
  catalog?.certificates.find((certificate) => certificate.code === code)

// Nombre completo o, si el código no está en el catálogo, el código tal cual.
export const certificateName = (catalog: Catalog, code: string) =>
  findCertificate(catalog, code)?.name ?? code

// Texto corto de la etiqueta de la tabla, ej. «ATP» o «Liderazgo».
export const certificateShort = (catalog: Catalog, code: string) =>
  findCertificate(catalog, code)?.short ?? code

// Certificados que se pueden registrar para un cargo, en el orden del catálogo.
export const certificateOptionsFor = (catalog: Catalog, roleTitle: string) =>
  catalog?.byPosition[roleTitle]?.certificates ?? []

// «Tipo» de la ficha: la licencia principal (ATP antes que CPL antes que PPL, o el CDP).
export const primaryCertificate = (catalog: Catalog, codes: string[]) =>
  catalog
    ? [...catalog.pilotLicenses, catalog.cabinLicense].find((code) =>
        codes.includes(code)
      )
    : undefined

// «Habilitaciones» de la ficha: el resto de los certificados (IR, ME, Liderazgo…).
export const ratings = (catalog: Catalog, codes: string[]) => {
  const primary = primaryCertificate(catalog, codes)
  return codes.filter((code) => code !== primary)
}
