// Catálogo de certificados FAA de la tripulación. Con la API vendrá de un catálogo del
// backend; mientras tanto vive aquí, en un solo lugar, para la tabla, la ficha, el
// formulario y la validación.

interface CertificateInfo {
  // Nombre completo, ej. "Airline Transport Pilot (ATP)".
  name: string
  // Texto corto para las etiquetas de la tabla, ej. "ATP".
  short: string
}

export const CERTIFICATES: Record<string, CertificateInfo> = {
  PPL: { name: "Private Pilot (PPL)", short: "PPL" },
  CPL: { name: "Commercial Pilot (CPL)", short: "CPL" },
  ATP: { name: "Airline Transport Pilot (ATP)", short: "ATP" },
  IR: { name: "Instrument Rating (IR)", short: "IR" },
  ME: { name: "Multi-Engine (ME)", short: "ME" },
  CDP: { name: "Certificate of Demonstrated Proficiency (CDP)", short: "CDP" },
  LID: { name: "Liderazgo", short: "Liderazgo" },
  CONF: { name: "Manejo de conflictos", short: "Conflictos" },
  ADU: { name: "Aduanas / Inmigración", short: "Aduanas" },
}

// Licencias de piloto, de mayor a menor: IR y ME son habilitaciones que van sobre una de
// ellas, así que un piloto necesita al menos una.
export const PILOT_LICENSES = ["ATP", "CPL", "PPL"]

// El CDP es el certificado obligatorio de la tripulación de cabina.
export const CABIN_LICENSE = "CDP"

const PILOT_CERTIFICATES = ["PPL", "CPL", "ATP", "IR", "ME"]
const PURSER_CERTIFICATES = ["CDP", "LID", "CONF", "ADU"]

// Certificados que se pueden registrar para cada cargo de tripulación.
const CERTIFICATES_BY_TITLE: Record<string, string[]> = {
  Comandante: PILOT_CERTIFICATES,
  Copiloto: PILOT_CERTIFICATES,
  "Auxiliar de Vuelo": ["CDP"],
  "Sobrecargo Principal": PURSER_CERTIFICATES,
  Sobrecargo: PURSER_CERTIFICATES,
}

export const certificateOptionsFor = (roleTitle: string) =>
  CERTIFICATES_BY_TITLE[roleTitle] ?? []

// Nombre completo o, si el código no está en el catálogo, el código tal cual.
export const certificateName = (code: string) =>
  CERTIFICATES[code]?.name ?? code

// «Tipo» de la ficha: la licencia principal (ATP antes que CPL antes que PPL, o el CDP).
export const primaryCertificate = (codes: string[]) =>
  [...PILOT_LICENSES, CABIN_LICENSE].find((code) => codes.includes(code))

// «Habilitaciones» de la ficha: el resto de los certificados (IR, ME, Liderazgo…).
export const ratings = (codes: string[]) => {
  const primary = primaryCertificate(codes)
  return codes.filter((code) => code !== primary)
}
