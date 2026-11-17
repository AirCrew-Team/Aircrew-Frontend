import type {
  CertificateFile,
  CertificationDetail,
  CertificationHistoryEntry,
  CertificationState,
  CertificationsListParams,
  CertificationsListResponse,
  CertificationsStats,
  CrewCertification,
  SaveCertificationInput,
} from "@/modules/adminCertifications/types/adminCertifications.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando
// exista la API. Las funciones ya reciben los parámetros que se enviarán al backend.
// Contexto: Delta Air Lines, licencias de la FAA.

// Registros por página: lo enviará el frontend y lo confirmará el backend en la respuesta.
export const CERTIFICATIONS_PAGE_SIZE = 5

// Quién hace los cambios. Con la API lo sabrá el backend por la sesión.
const CURRENT_ADMIN = "Admin AirCrew"

// Con qué se coteja cada certificación al verificarla (va en el historial).
const VERIFICATION_SOURCE: Record<CrewCertification["area"], string> = {
  cabina_mando: "cotejado con Airmen Inquiry (registro público FAA)",
  cabina: "cotejado con el certificado físico del tripulante",
}

// Tripulación con su certificación, en el orden de la referencia: primero lo que
// requiere atención (sin certificado y por verificar), luego lo verificado.
const CREW: CrewCertification[] = [
  {
    id: "AC-6014",
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
    crew.email,
    crew.id,
    crew.licenseNumber ?? "",
  ].some((value) => normalize(value).includes(search))

// Lista paginada. El backend filtrará por búsqueda y estado y devolverá solo la página
// pedida; aquí se hace lo mismo con los datos simulados: filtra y corta de a 5.
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
    file: { name: "licencia-juan-pablo.pdf", url: null },
    history: [{ event: "registrado", by: CURRENT_ADMIN, date: "2026-11-02" }],
  },
  "AC-7302": {
    file: null,
    history: [{ event: "registrado", by: CURRENT_ADMIN, date: "2026-11-05" }],
  },
  "AC-1108": {
    file: { name: "licencia-diego.pdf", url: null },
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
    file: { name: "licencia-andres.pdf", url: null },
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
    file: { name: "cdp-valeria.jpg", url: null },
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

// Ficha de la certificación (ventana del ojo). Con la API será un GET por el ID del
// tripulante; si no existe, la promesa falla igual que fallaría la petición (404).
export const getCertificationDetail = (
  id: string
): Promise<CertificationDetail> => {
  const crew = findCrew(id)
  if (!crew) return Promise.reject(new Error(`Tripulante ${id} no encontrado`))
  const detail = DETAILS[id] ?? { file: null, history: [] }
  return Promise.resolve({
    ...copyCrew(crew),
    file: detail.file ? { ...detail.file } : null,
    history: [...detail.history],
  })
}

// Tripulantes sin certificado: las opciones de «Tripulante» al registrar desde la barra.
export const getUncertifiedCrew = (): Promise<CrewCertification[]> =>
  Promise.resolve(
    CREW.filter((crew) => crew.status === "sin_certificado").map(copyCrew)
  )

// Fecha de hoy en ISO (solo el día), para el historial.
const today = () => new Date().toISOString().slice(0, 10)

// Copia nueva del certificado. En el navegador se abre desde la memoria
// (URL.createObjectURL); con la API, el backend devolverá su dirección.
const toCertificateFile = (file: File): CertificateFile => ({
  name: file.name,
  url:
    typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(file)
      : null,
})

// Registra o edita la certificación de un tripulante (con la API, un PUT de su
// certificación: repetirlo deja el mismo resultado). verified decide el estado y
// agrega al historial quién y cuándo la registró, editó o verificó.
export const saveCertification = (
  id: string,
  input: SaveCertificationInput
): Promise<CrewCertification> =>
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
          note: VERIFICATION_SOURCE[crew.area],
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
      resolve(copyCrew(crew))
    }, 400)
  })

// Elimina la certificación de un tripulante (con la API, un DELETE de su certificación).
// El tripulante sigue en la lista, sin licencia, certificados, copia ni historial:
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
      resolve()
    }, 400)
  })
