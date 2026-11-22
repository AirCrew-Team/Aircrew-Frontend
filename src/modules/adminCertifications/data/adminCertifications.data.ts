import type {
  CertificateFile,
  CertificationCatalog,
  CertificationDetail,
  CertificationHistoryEntry,
  CertificationState,
  CertificationsListParams,
  CertificationsListResponse,
  CertificationsStats,
  CrewCertification,
  SaveCertificationInput,
} from "@/modules/adminCertifications/types/adminCertifications.types"

// Datos de ejemplo para las cuentas demo y el selector «Rol (dev)»: misma forma y mismas
// firmas que App/actions/certifications (la sesión real). Ver useCertificationsApi.
// Contexto: Delta Air Lines, licencias de la FAA.

// Quién hace los cambios. Con la API lo sabe el backend por la sesión.
const CURRENT_ADMIN = "Admin AirCrew"

// Con qué se coteja cada certificación al verificarla (va en el historial).
const VERIFICATION_SOURCE: Record<
  NonNullable<CrewCertification["area"]>,
  string
> = {
  cabina_mando: "cotejado con Airmen Inquiry (registro público FAA)",
  cabina: "cotejado con el certificado físico del tripulante",
}

// Catálogo de certificados: el mismo que devuelve GET /certifications/options.
const PILOT_CERTIFICATES = ["PPL", "CPL", "ATP", "IR", "ME"]
const PURSER_CERTIFICATES = ["CDP", "LID", "CONF", "ADU"]

const CATALOG: CertificationCatalog = {
  certificates: [
    { code: "PPL", name: "Private Pilot (PPL)", short: "PPL" },
    { code: "CPL", name: "Commercial Pilot (CPL)", short: "CPL" },
    { code: "ATP", name: "Airline Transport Pilot (ATP)", short: "ATP" },
    { code: "IR", name: "Instrument Rating (IR)", short: "IR" },
    { code: "ME", name: "Multi-Engine (ME)", short: "ME" },
    {
      code: "CDP",
      name: "Certificate of Demonstrated Proficiency (CDP)",
      short: "CDP",
    },
    { code: "LID", name: "Liderazgo", short: "Liderazgo" },
    { code: "CONF", name: "Manejo de conflictos", short: "Conflictos" },
    { code: "ADU", name: "Aduanas / Inmigración", short: "Aduanas" },
  ],
  byPosition: {
    Comandante: { area: "cabina_mando", certificates: PILOT_CERTIFICATES },
    Copiloto: { area: "cabina_mando", certificates: PILOT_CERTIFICATES },
    "Auxiliar de Vuelo": { area: "cabina", certificates: ["CDP"] },
    "Sobrecargo Principal": {
      area: "cabina",
      certificates: PURSER_CERTIFICATES,
    },
    Sobrecargo: { area: "cabina", certificates: PURSER_CERTIFICATES },
  },
  pilotLicenses: ["ATP", "CPL", "PPL"],
  cabinLicense: "CDP",
}

export const getCertificationOptions = (): Promise<CertificationCatalog> =>
  Promise.resolve(structuredClone(CATALOG))

// Tripulación con su certificación, en el orden de la referencia: primero lo que
// requiere atención (sin certificado y por verificar), luego lo verificado.
const CREW: CrewCertification[] = [
  {
    id: "AC-6014",
    code: "AC-6014",
    firstName: "Laura",
    lastName: "Benítez",
    email: "l.benitez@aircrew-ops.com",
    roleTitle: "Sobrecargo",
    area: "cabina",
    base: "SEA",
    licenseNumber: null,
    certificates: [],
    status: "sin_certificado",
  },
  {
    id: "AC-4455",
    code: "AC-4455",
    firstName: "Daniel",
    lastName: "Herrera",
    email: "d.herrera@aircrew-ops.com",
    roleTitle: "Copiloto",
    area: "cabina_mando",
    base: "JFK",
    licenseNumber: null,
    certificates: [],
    status: "sin_certificado",
  },
  {
    id: "AC-2287",
    code: "AC-2287",
    firstName: "Juan Pablo",
    lastName: "Navarro",
    email: "jp.navarro@aircrew-ops.com",
    roleTitle: "Copiloto",
    area: "cabina_mando",
    base: "MSP",
    licenseNumber: "3904418",
    certificates: ["ATP", "ME"],
    status: "por_verificar",
  },
  {
    id: "AC-7302",
    code: "AC-7302",
    firstName: "Sofía",
    lastName: "Restrepo",
    email: "s.restrepo@aircrew-ops.com",
    roleTitle: "Sobrecargo Principal",
    area: "cabina",
    base: "ATL",
    licenseNumber: "4818266",
    certificates: ["CDP"],
    status: "por_verificar",
  },
  {
    id: "AC-1108",
    code: "AC-1108",
    firstName: "Diego",
    lastName: "Salcedo",
    email: "d.salcedo@aircrew-ops.com",
    roleTitle: "Comandante",
    area: "cabina_mando",
    base: "ATL",
    licenseNumber: "2775981",
    certificates: ["ATP", "IR", "ME"],
    status: "verificado",
  },
  {
    id: "AC-3871",
    code: "AC-3871",
    firstName: "Andrés",
    lastName: "Mejía",
    email: "a.mejia@aircrew-ops.com",
    roleTitle: "Comandante",
    area: "cabina_mando",
    base: "JFK",
    licenseNumber: "2418593",
    certificates: ["ATP", "IR", "ME"],
    status: "verificado",
  },
  {
    id: "AC-5520",
    code: "AC-5520",
    firstName: "Valeria",
    lastName: "Ortiz",
    email: "v.ortiz@aircrew-ops.com",
    roleTitle: "Auxiliar de Vuelo",
    area: "cabina",
    base: "SEA",
    licenseNumber: "5127730",
    certificates: ["CDP"],
    status: "verificado",
  },
  {
    id: "AC-8120",
    code: "AC-8120",
    firstName: "Camila",
    lastName: "Ortega",
    email: "c.ortega@aircrew-ops.com",
    roleTitle: "Auxiliar de Vuelo",
    area: "cabina",
    base: "MSP",
    licenseNumber: "4993172",
    certificates: ["CDP"],
    status: "verificado",
  },
]

// Sin mayúsculas ni tildes: «benitez» encuentra «Benítez».
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

// Campos en los que busca el texto: nombre, correo, ID y número de licencia.
const matchesSearch = (crew: CrewCertification, search: string) =>
  [
    `${crew.firstName} ${crew.lastName}`,
    crew.email ?? "",
    crew.code ?? "",
    crew.licenseNumber ?? "",
  ].some((value) => normalize(value).includes(search))

// Lista paginada: igual que el backend, filtra por búsqueda y estado y devuelve solo la
// página pedida.
export const getCertifications = (
  params: CertificationsListParams
): Promise<CertificationsListResponse> => {
  const search = normalize(params.search.trim())
  const matches = CREW.filter(
    (crew) =>
      (!params.status || crew.status === params.status) &&
      (!search || matchesSearch(crew, search))
  )
  const start = (params.page - 1) * params.pageSize

  return Promise.resolve({
    items: matches.slice(start, start + params.pageSize).map(copyCrew),
    page: params.page,
    pageSize: params.pageSize,
    total: matches.length,
  })
}

// Indicadores: total de tripulantes y cuántos hay en cada estado.
export const getCertificationsStats = (): Promise<CertificationsStats> => {
  const count = (status: CertificationState) =>
    CREW.filter((crew) => crew.status === status).length
  return Promise.resolve({
    total: CREW.length,
    byStatus: {
      verificado: count("verificado"),
      por_verificar: count("por_verificar"),
      sin_certificado: count("sin_certificado"),
    },
  })
}

// Copia del certificado e historial de cada tripulante con certificación. Los que no
// tienen certificado no aparecen: su ficha sale sin copia y sin historial.
const DETAILS: Record<
  string,
  { file: CertificateFile | null; history: CertificationHistoryEntry[] }
> = {
  "AC-2287": {
    file: {
      name: "licencia-juan-pablo.pdf",
      mimeType: "application/pdf",
      sizeBytes: 248_310,
    },
    history: [{ event: "registrado", by: CURRENT_ADMIN, date: "2026-11-02" }],
  },
  "AC-7302": {
    file: null,
    history: [{ event: "registrado", by: CURRENT_ADMIN, date: "2026-11-05" }],
  },
  "AC-1108": {
    file: {
      name: "licencia-diego.pdf",
      mimeType: "application/pdf",
      sizeBytes: 248_310,
    },
    history: [
      {
        event: "verificado",
        by: CURRENT_ADMIN,
        date: "2026-08-20",
        note: VERIFICATION_SOURCE.cabina_mando,
      },
      { event: "registrado", by: CURRENT_ADMIN, date: "2026-08-20" },
    ],
  },
  "AC-3871": {
    file: {
      name: "licencia-andres.pdf",
      mimeType: "application/pdf",
      sizeBytes: 248_310,
    },
    history: [
      {
        event: "verificado",
        by: CURRENT_ADMIN,
        date: "2026-07-14",
        note: VERIFICATION_SOURCE.cabina_mando,
      },
      { event: "registrado", by: CURRENT_ADMIN, date: "2026-07-12" },
    ],
  },
  "AC-5520": {
    file: {
      name: "cdp-valeria.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 612_904,
    },
    history: [
      {
        event: "verificado",
        by: CURRENT_ADMIN,
        date: "2026-06-03",
        note: VERIFICATION_SOURCE.cabina,
      },
      { event: "registrado", by: CURRENT_ADMIN, date: "2026-06-03" },
    ],
  },
  "AC-8120": {
    file: null,
    history: [
      {
        event: "verificado",
        by: CURRENT_ADMIN,
        date: "2026-09-18",
        note: VERIFICATION_SOURCE.cabina,
      },
      { event: "registrado", by: CURRENT_ADMIN, date: "2026-09-17" },
    ],
  },
}

const findCrew = (id: string) => CREW.find((candidate) => candidate.id === id)

// Copia de un tripulante: las funciones devuelven copias, como lo haría el backend
// (datos nuevos en cada respuesta). Si devolvieran el mismo objeto que luego se
// modifica, TanStack Query vería la respuesta igual a la anterior y no repintaría.
const copyCrew = (crew: CrewCertification): CrewCertification => ({
  ...crew,
  certificates: [...crew.certificates],
})

// Archivos adjuntados en esta sesión (demo): se abren tal cual se subieron.
const UPLOADED_FILES = new Map<string, Blob>()

const detailOf = (crew: CrewCertification): CertificationDetail => {
  const detail = DETAILS[crew.id] ?? { file: null, history: [] }
  return {
    ...copyCrew(crew),
    file: detail.file ? { ...detail.file } : null,
    history: detail.history.map((entry) => ({ ...entry })),
  }
}

// Ficha de la certificación (ventana del ojo). Si el tripulante no existe, la promesa
// falla igual que la petición (404).
export const getCertificationDetail = (
  id: string
): Promise<CertificationDetail> => {
  const crew = findCrew(id)
  if (!crew) return Promise.reject(new Error(`Tripulante ${id} no encontrado`))
  return Promise.resolve(detailOf(crew))
}

// Copia del certificado: la que se subió en esta sesión o, en los datos de ejemplo, un
// texto que lo explica (no hay un PDF real detrás).
export const downloadCertificateFile = (id: string): Promise<Blob> => {
  const file = DETAILS[id]?.file
  if (!file) {
    return Promise.reject(new Error(`${id} no tiene copia del certificado`))
  }
  return Promise.resolve(
    UPLOADED_FILES.get(id) ??
      new Blob([`Copia de ejemplo: ${file.name} (datos demo).`], {
        type: "text/plain",
      })
  )
}

// Tripulantes sin certificado: las opciones de «Tripulante» al registrar desde la barra.
export const getUncertifiedCrew = (): Promise<CrewCertification[]> =>
  Promise.resolve(
    CREW.filter((crew) => crew.status === "sin_certificado").map(copyCrew)
  )

// Fecha de hoy en ISO (solo el día), para el historial.
const today = () => new Date().toISOString().slice(0, 10)

const toCertificateFile = (file: File): CertificateFile => ({
  name: file.name,
  mimeType: file.type,
  sizeBytes: file.size,
})

// Registra o edita la certificación de un tripulante (igual que el PUT: repetirlo deja
// el mismo resultado). verified decide el estado y agrega al historial quién y cuándo
// la registró, editó o verificó. Responde con la ficha completa.
export const saveCertification = (
  id: string,
  input: SaveCertificationInput
): Promise<CertificationDetail> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const crew = findCrew(id)
      if (!crew) return reject(new Error(`Tripulante ${id} no encontrado`))

      const previous = DETAILS[id] ?? { file: null, history: [] }
      const wasRegistered = crew.status !== "sin_certificado"
      const wasVerified = crew.status === "verificado"
      const date = today()
      const newEntries: CertificationHistoryEntry[] = []
      if (input.verified && !wasVerified) {
        newEntries.push({
          event: "verificado",
          by: CURRENT_ADMIN,
          date,
          note: crew.area ? VERIFICATION_SOURCE[crew.area] : null,
        })
      }
      newEntries.push({
        event: wasRegistered ? "actualizado" : "registrado",
        by: CURRENT_ADMIN,
        date,
      })

      Object.assign(crew, {
        licenseNumber: input.licenseNumber,
        certificates: input.certificates,
        status: input.verified ? "verificado" : "por_verificar",
      })
      DETAILS[id] = {
        // undefined: se deja la copia que había; null: se quita.
        file:
          input.file === undefined
            ? previous.file
            : input.file
              ? toCertificateFile(input.file)
              : null,
        history: [...newEntries, ...previous.history],
      }
      if (input.file) UPLOADED_FILES.set(id, input.file)
      if (input.file === null) UPLOADED_FILES.delete(id)
      resolve(detailOf(crew))
    }, 400)
  })

// Elimina la certificación de un tripulante (igual que el DELETE). El tripulante sigue en la lista, sin licencia, certificados, copia ni historial:
// queda «Sin certificado».
export const deleteCertification = (id: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const crew = findCrew(id)
      if (!crew) return reject(new Error(`Tripulante ${id} no encontrado`))
      Object.assign(crew, {
        licenseNumber: null,
        certificates: [],
        status: "sin_certificado",
      })
      delete DETAILS[id]
      UPLOADED_FILES.delete(id)
      resolve()
    }, 400)
  })
