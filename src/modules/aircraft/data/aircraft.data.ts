import {
  AircraftFieldError,
  AircraftRequestError,
} from "@/App/actions/aircraft/aircraft.actions"
import fleetPhoto from "@/App/utils/images/Airplane.png"
import type {
  Aircraft,
  AircraftBase,
  AircraftListParams,
  AircraftListResponse,
  AircraftModel,
  AircraftOptions,
  AircraftStats,
  AircraftStatus,
  MaintenanceType,
  SaveAircraftInput,
  AircraftReport,
  MaintenanceHistoryEntry,
  MaintenanceRecord,
  MaintenanceTypeOption,
} from "@/App/types/aircraft.types"

export { AircraftFieldError, AircraftRequestError }

// Datos de ejemplo de las cuentas demo y del selector «Rol (dev)»: no llaman al backend.
// Tienen la misma forma y el mismo comportamiento que App/actions/aircraft (catálogos con
// motivos y tareas, foto aparte, 409 al volver a servicio desde «Editar»). La sesión real
// usa las acciones; el módulo elige con useAircraftApi.
// Contexto: flota de Delta Air Lines, matrículas FAA (N…) y bases en EE. UU.

// Aeronaves por página: lo enviará el frontend y lo confirmará el backend en la respuesta.
export const AIRCRAFT_PAGE_SIZE = 5

// Catálogo de modelos de la flota (con la API, un GET del catálogo).
const MODELS: AircraftModel[] = [
  {
    id: "a321neo",
    name: "Airbus A321neo",
    category: "narrow_body",
    capacity: 194,
    minimumCrew: { pilots: 2, cabin: 4 },
    engines: "2 × Pratt & Whitney PW1100G",
  },
  {
    id: "b739",
    name: "Boeing 737-900ER",
    category: "narrow_body",
    capacity: 180,
    minimumCrew: { pilots: 2, cabin: 4 },
    engines: "2 × CFM International CFM56-7B",
  },
  {
    id: "a220",
    name: "Airbus A220-300",
    category: "narrow_body",
    capacity: 130,
    minimumCrew: { pilots: 2, cabin: 3 },
    engines: "2 × Pratt & Whitney PW1500G",
  },
  {
    id: "a330neo",
    name: "Airbus A330-900neo",
    category: "wide_body",
    capacity: 281,
    minimumCrew: { pilots: 2, cabin: 8 },
    engines: "2 × Rolls-Royce Trent 7000",
  },
  {
    id: "a350",
    name: "Airbus A350-900",
    category: "wide_body",
    capacity: 306,
    minimumCrew: { pilots: 2, cabin: 9 },
    engines: "2 × Rolls-Royce Trent XWB",
  },
  {
    id: "b764",
    name: "Boeing 767-400ER",
    category: "wide_body",
    capacity: 238,
    minimumCrew: { pilots: 2, cabin: 7 },
    engines: "2 × General Electric CF6-80C2",
  },
  {
    id: "e175",
    name: "Embraer E175",
    category: "regional",
    capacity: 76,
    minimumCrew: { pilots: 2, cabin: 2 },
    engines: "2 × General Electric CF34-8E",
  },
]

// Bases de Delta en EE. UU. (con la API, un GET del catálogo).
const BASES: AircraftBase[] = [
  { code: "ATL", name: "Atlanta (ATL)" },
  { code: "BOS", name: "Boston (BOS)" },
  { code: "DTW", name: "Detroit (DTW)" },
  { code: "LAX", name: "Los Ángeles (LAX)" },
  { code: "MSP", name: "Minneapolis (MSP)" },
  { code: "JFK", name: "Nueva York (JFK)" },
  { code: "SLC", name: "Salt Lake City (SLC)" },
  { code: "SEA", name: "Seattle (SEA)" },
]

// Lo que se guarda de cada aeronave; el modelo y la base se completan al responder.
interface StoredAircraft {
  id: string
  registration: string
  msn: string
  modelId: string
  baseCode: string
  manufactureYear: number
  inFleetSince: string
  flightHours: number
  cycles: number
  status: AircraftStatus
  maintenanceType: MaintenanceType | null
  maintenanceNote: string | null
  photoUrl?: string | null
}

// Año de fabricación, llegada a la flota, horas de vuelo y ciclos acumulados.
type Usage = [number, string, number, number]

// Aeronave operativa, o en mantenimiento si se indica el motivo (y su descripción).
const unit = (
  id: string,
  registration: string,
  msn: string,
  modelId: string,
  baseCode: string,
  [manufactureYear, inFleetSince, flightHours, cycles]: Usage,
  maintenance?: { type: MaintenanceType; note: string }
): StoredAircraft => ({
  id,
  registration,
  msn,
  modelId,
  baseCode,
  manufactureYear,
  inFleetSince,
  flightHours,
  cycles,
  status: maintenance ? "mantenimiento" : "operativa",
  maintenanceType: maintenance?.type ?? null,
  maintenanceNote: maintenance?.note ?? null,
  // Foto de ejemplo (la misma para toda la flota). Con la API, la dirección de la foto
  // de cada aeronave.
  photoUrl: fleetPhoto,
})

// Flota de 18 aeronaves (la misma cifra del Inicio del admin): 15 operativas y 3 en
// mantenimiento.
const FLEET: StoredAircraft[] = [
  unit("ac-01", "N391DN", "10342", "a321neo", "ATL", [
    2021,
    "2021-06-14",
    14820,
    6210,
  ]),
  unit("ac-02", "N411DX", "1957", "a330neo", "ATL", [
    2019,
    "2019-10-02",
    31450,
    4380,
  ]),
  unit(
    "ac-03",
    "N271SY",
    "17000812",
    "e175",
    "MSP",
    [2017, "2017-08-21", 28930, 21540],
    {
      type: "motor",
      note: "Vibración anormal en el motor derecho reportada después del último aterrizaje.",
    }
  ),
  unit("ac-04", "N827DN", "31942", "b739", "SLC", [
    2015,
    "2015-03-30",
    38210,
    17650,
  ]),
  unit("ac-05", "N503DN", "0287", "a350", "DTW", [
    2018,
    "2018-05-11",
    33780,
    4120,
  ]),
  unit("ac-06", "N122DU", "55042", "a220", "BOS", [
    2020,
    "2020-11-09",
    12640,
    7930,
  ]),
  unit("ac-07", "N843DN", "31951", "b739", "MSP", [
    2016,
    "2016-02-18",
    35470,
    16120,
  ]),
  unit("ac-08", "N394DN", "10398", "a321neo", "JFK", [
    2022,
    "2022-01-25",
    10930,
    4570,
  ]),
  unit("ac-09", "N838MH", "29711", "b764", "JFK", [
    2001,
    "2001-09-12",
    88640,
    19870,
  ]),
  unit("ac-10", "N412DX", "1983", "a330neo", "LAX", [
    2020,
    "2020-03-16",
    27310,
    3850,
  ]),
  unit("ac-11", "N264SY", "17000790", "e175", "DTW", [
    2016,
    "2016-07-05",
    31280,
    23460,
  ]),
  unit("ac-12", "N131DU", "55109", "a220", "SEA", [
    2021,
    "2021-04-19",
    9870,
    6240,
  ]),
  unit("ac-13", "N398DN", "10455", "a321neo", "ATL", [
    2022,
    "2022-08-03",
    8460,
    3520,
  ]),
  unit("ac-14", "N509DN", "0311", "a350", "ATL", [
    2019,
    "2019-12-04",
    28940,
    3610,
  ]),
  unit("ac-15", "N851DN", "31987", "b739", "DTW", [
    2017,
    "2017-06-27",
    32150,
    14980,
  ]),
  unit(
    "ac-16",
    "N396DN",
    "10421",
    "a321neo",
    "ATL",
    [2021, "2021-09-08", 13250, 5480],
    {
      type: "ala",
      note: "Golpe en la punta del ala izquierda con un vehículo de plataforma.",
    }
  ),
  unit(
    "ac-17",
    "N125DU",
    "55077",
    "a220",
    "MSP",
    [2020, "2020-02-14", 14370, 9050],
    {
      type: "tren_aterrizaje",
      note: "Desgaste fuera de lo normal en las llantas y frenos del tren principal.",
    }
  ),
  unit("ac-18", "N270SY", "17000805", "e175", "LAX", [
    2018,
    "2018-04-23",
    24690,
    18320,
  ]),
]

const findModel = (id: string) => MODELS.find((model) => model.id === id)
const findBase = (code: string) => BASES.find((base) => base.code === code)

// Aeronave con los datos de su modelo y su base, como la devolverá el backend. Siempre
// es un objeto nuevo: si se devolviera el mismo que luego se modifica, TanStack Query
// vería la respuesta igual a la anterior y no repintaría.
const toAircraft = (stored: StoredAircraft): Aircraft => {
  const model = findModel(stored.modelId) as AircraftModel
  return {
    ...stored,
    modelName: model.name,
    category: model.category,
    capacity: model.capacity,
    minimumCrew: { ...model.minimumCrew },
    engines: model.engines,
    baseName: findBase(stored.baseCode)?.name ?? stored.baseCode,
    photoUrl: stored.photoUrl ?? null,
  }
}

// Sin mayúsculas ni tildes: «airbus» encuentra «Airbus».
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

// Campos en los que busca el texto: matrícula, modelo, número de serie y base.
const matchesSearch = (aircraft: Aircraft, search: string) =>
  [
    aircraft.registration,
    aircraft.modelName,
    aircraft.msn,
    aircraft.baseName,
  ].some((value) => normalize(value).includes(search))

const matchesFilter = (
  aircraft: Aircraft,
  filter: AircraftListParams["status"]
) => !filter || aircraft.status === filter

// Lista paginada (con la API, un GET con ?page=, ?pageSize=, ?q= y ?status=). El
// backend filtrará y devolverá solo la página pedida; aquí se hace lo mismo en memoria.
export const getAircraft = (
  params: AircraftListParams
): Promise<AircraftListResponse> => {
  const search = normalize(params.search.trim())
  const matches = FLEET.map(toAircraft).filter(
    (aircraft) =>
      matchesFilter(aircraft, params.status) &&
      (!search || matchesSearch(aircraft, search))
  )
  const start = (params.page - 1) * params.pageSize

  return Promise.resolve({
    items: matches.slice(start, start + params.pageSize),
    page: params.page,
    pageSize: params.pageSize,
    total: matches.length,
  })
}

// Indicadores de la flota (con la API, un GET de los indicadores).
export const getAircraftStats = (): Promise<AircraftStats> => {
  const count = (status: AircraftStatus) =>
    FLEET.filter((aircraft) => aircraft.status === status).length

  const operating = FLEET.filter((aircraft) => aircraft.status === "operativa")

  return Promise.resolve({
    total: FLEET.length,
    operational: count("operativa"),
    maintenance: count("mantenimiento"),
    totalSeats: FLEET.reduce(
      (sum, aircraft) => sum + (findModel(aircraft.modelId)?.capacity ?? 0),
      0
    ),
    // Modelos de las operativas, sin repetir y ordenados (como el backend).
    modelsInService: [
      ...new Set(
        operating.map((aircraft) => findModel(aircraft.modelId)?.name ?? "")
      ),
    ].sort(),
  })
}

// Catálogos del formulario: modelos, bases y motivos con sus tareas.
export const getAircraftOptions = (): Promise<AircraftOptions> =>
  Promise.resolve({
    models: MODELS.map((model) => ({
      ...model,
      minimumCrew: { ...model.minimumCrew },
    })),
    bases: BASES.map((base) => ({ ...base })),
    maintenanceTypes: MAINTENANCE_TYPES.map((type) => ({
      ...type,
      tasks: [...type.tasks],
    })),
  })

// La matrícula es única en la flota.
const registrationTaken = (registration: string, exceptId?: string) =>
  FLEET.some(
    (aircraft) =>
      aircraft.registration === registration && aircraft.id !== exceptId
  )

const DUPLICATE_REGISTRATION = "Ya existe una aeronave con esa matrícula."

let nextId = FLEET.length + 1

// Registra una aeronave (POST). Queda primera en la lista, sin foto: la foto se sube
// aparte con uploadAircraftPhoto.
export const createAircraft = (input: SaveAircraftInput): Promise<Aircraft> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      if (registrationTaken(input.registration)) {
        return reject(
          new AircraftFieldError("registration", DUPLICATE_REGISTRATION)
        )
      }
      const stored: StoredAircraft = {
        id: `ac-${String(nextId++).padStart(2, "0")}`,
        registration: input.registration,
        msn: input.msn,
        modelId: input.modelId,
        baseCode: input.baseCode,
        manufactureYear: input.manufactureYear,
        inFleetSince: input.inFleetSince,
        // Aeronave recién registrada: el uso acumulado lo irá sumando el backend.
        flightHours: 0,
        cycles: 0,
        status: input.condition,
        maintenanceType:
          input.condition === "mantenimiento" ? input.maintenanceType : null,
        maintenanceNote:
          input.condition === "mantenimiento" ? input.maintenanceNote : null,
        photoUrl: null,
      }
      FLEET.unshift(stored)
      resolve(toAircraft(stored))
    }, 400)
  })

// Edita una aeronave (PUT; repetirlo da el mismo resultado). Como el backend, una
// aeronave en mantenimiento no vuelve a «operativa» por aquí: solo con «Liberar a servicio».
export const updateAircraft = (
  id: string,
  input: SaveAircraftInput
): Promise<Aircraft> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const stored = FLEET.find((aircraft) => aircraft.id === id)
      if (!stored) return reject(new Error(`Aeronave ${id} no encontrada`))
      if (registrationTaken(input.registration, id)) {
        return reject(
          new AircraftFieldError("registration", DUPLICATE_REGISTRATION)
        )
      }
      if (
        stored.status === "mantenimiento" &&
        input.condition === "operativa"
      ) {
        return reject(
          new AircraftRequestError(
            "La aeronave está en mantenimiento: completa las tareas y usa «Liberar a servicio»."
          )
        )
      }
      const status = input.condition
      Object.assign(stored, {
        registration: input.registration,
        msn: input.msn,
        modelId: input.modelId,
        baseCode: input.baseCode,
        manufactureYear: input.manufactureYear,
        inFleetSince: input.inFleetSince,
        status,
        maintenanceType:
          status === "mantenimiento" ? input.maintenanceType : null,
        maintenanceNote:
          status === "mantenimiento" ? input.maintenanceNote : null,
      })
      resolve(toAircraft(stored))
    }, 400)
  })

// Foto de la aeronave (PUT .../photo), después de guardarla. En el navegador se muestra
// desde la memoria; en el backend, desde su dirección.
export const uploadAircraftPhoto = (id: string, file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const stored = FLEET.find((aircraft) => aircraft.id === id)
      if (!stored) return reject(new Error(`Aeronave ${id} no encontrada`))
      stored.photoUrl = URL.createObjectURL(file)
      resolve()
    }, 200)
  })

// Todas las aeronaves para el manifiesto (con la API, un GET del manifiesto o el
// backend generará el archivo).
export const getFleetManifest = (): Promise<Aircraft[]> =>
  Promise.resolve(FLEET.map(toAircraft))

// --- Informe y mantenimiento ---

// Motivos de mantenimiento con sus tareas, en el orden en que se hacen. Mismos códigos,
// textos y tareas que el catálogo del backend (GET /aircraft/options).
const MAINTENANCE_TYPES: MaintenanceTypeOption[] = [
  {
    code: "motor",
    label: "Problemas con el motor",
    tasks: [
      "Inspección visual del motor y sus soportes",
      "Revisión interna con cámara (boroscopio)",
      "Cambio de las piezas dañadas",
      "Prueba del motor en tierra",
      "Vuelo de prueba y liberación a servicio",
    ],
  },
  {
    code: "ala",
    label: "Daño en el ala",
    tasks: [
      "Evaluación del daño en el ala",
      "Reparación de la estructura",
      "Pintura y sellado",
      "Prueba de flaps y alerones",
    ],
  },
  {
    code: "tren_aterrizaje",
    label: "Tren de aterrizaje",
    tasks: [
      "Inspección del tren de aterrizaje",
      "Cambio de llantas y frenos",
      "Lubricación y ajuste",
      "Prueba de subida y bajada del tren",
    ],
  },
  {
    code: "fuselaje",
    label: "Daño en el fuselaje",
    tasks: [
      "Evaluación del daño en el fuselaje",
      "Reparación de la estructura",
      "Prueba de presurización de la cabina",
      "Pintura y liberación a servicio",
    ],
  },
  {
    code: "electrico",
    label: "Falla eléctrica",
    tasks: [
      "Diagnóstico del sistema eléctrico",
      "Cambio de cableado o componentes",
      "Prueba de instrumentos de cabina",
      "Liberación a servicio",
    ],
  },
  {
    code: "hidraulico",
    label: "Falla hidráulica",
    tasks: [
      "Detección de la fuga o la falla",
      "Cambio de mangueras o bombas",
      "Recarga del líquido hidráulico",
      "Prueba de los mandos del avión",
    ],
  },
  {
    code: "revision_programada",
    label: "Revisión programada",
    tasks: [
      "Inspección general del avión",
      "Revisión de motores",
      "Revisión de equipos de emergencia",
      "Pruebas finales y liberación a servicio",
    ],
  },
]

const MAINTENANCE_TASKS = Object.fromEntries(
  MAINTENANCE_TYPES.map((type) => [type.code, type.tasks])
) as Record<MaintenanceType, string[]>

// Orden abierta de cada aeronave en hangar: qué tareas van hechas.
interface StoredWorkOrder {
  orderNumber: string
  type: MaintenanceType
  hangar: string
  openedOn: string
  done: boolean[]
}

// Tareas hechas: las primeras `count` de la lista del motivo.
const firstDone = (type: MaintenanceType, count: number) =>
  MAINTENANCE_TASKS[type].map((_, index) => index < count)

const WORK_ORDERS = new Map<string, StoredWorkOrder>([
  [
    "ac-03",
    {
      orderNumber: "OT-2026-0412",
      type: "motor",
      hangar: "Hangar MRO 3 · MSP",
      openedOn: "2026-11-02",
      done: firstDone("motor", 2),
    },
  ],
  [
    "ac-16",
    {
      orderNumber: "OT-2026-0431",
      type: "ala",
      hangar: "Hangar 1 · ATL",
      openedOn: "2026-11-13",
      done: firstDone("ala", 3),
    },
  ],
  [
    "ac-17",
    {
      orderNumber: "OT-2026-0435",
      type: "tren_aterrizaje",
      hangar: "Hangar 2 · MSP",
      openedOn: "2026-11-14",
      done: firstDone("tren_aterrizaje", 1),
    },
  ],
])

// Reparaciones ya terminadas de cada aeronave (las más recientes primero).
const HISTORY = new Map<string, MaintenanceHistoryEntry[]>([
  [
    "ac-01",
    [
      {
        orderNumber: "OT-2026-0118",
        type: "revision_programada",
        description: "Revisión general anual sin novedades.",
        hangar: "Hangar 1 · ATL",
        openedOn: "2026-03-02",
        closedOn: "2026-03-09",
      },
    ],
  ],
  [
    "ac-03",
    [
      {
        orderNumber: "OT-2025-0977",
        type: "electrico",
        description: "Falla intermitente en la pantalla del copiloto.",
        hangar: "Hangar 2 · MSP",
        openedOn: "2025-12-10",
        closedOn: "2025-12-12",
      },
      {
        orderNumber: "OT-2025-0402",
        type: "revision_programada",
        description: "Revisión general anual.",
        hangar: "Hangar MRO 3 · MSP",
        openedOn: "2025-06-03",
        closedOn: "2025-06-15",
      },
    ],
  ],
  [
    "ac-09",
    [
      {
        orderNumber: "OT-2026-0655",
        type: "hidraulico",
        description: "Fuga de líquido hidráulico en el tren delantero.",
        hangar: "Hangar 4 · JFK",
        openedOn: "2026-07-18",
        closedOn: "2026-07-21",
      },
    ],
  ],
])

let nextOrder = 436

const today = () => new Date().toISOString().slice(0, 10)

// Orden abierta de una aeronave en hangar. Si entró a hangar desde el formulario (o
// cambió el motivo), se abre una orden nueva sin tareas hechas.
const openOrderOf = (stored: StoredAircraft) => {
  const type = stored.maintenanceType as MaintenanceType
  let order = WORK_ORDERS.get(stored.id)
  if (!order || order.type !== type) {
    order = {
      orderNumber: `OT-2026-${String(nextOrder++).padStart(4, "0")}`,
      type,
      hangar: `Hangar 1 · ${stored.baseCode}`,
      openedOn: today(),
      done: firstDone(type, 0),
    }
    WORK_ORDERS.set(stored.id, order)
  }
  return order
}

const toMaintenance = (
  stored: StoredAircraft,
  order: StoredWorkOrder
): MaintenanceRecord => ({
  orderNumber: order.orderNumber,
  type: order.type,
  description: stored.maintenanceNote,
  hangar: order.hangar,
  openedOn: order.openedOn,
  tasks: MAINTENANCE_TASKS[order.type].map((name, index) => ({
    name,
    done: order.done[index] ?? false,
  })),
})

const inMaintenance = (stored: StoredAircraft | undefined) =>
  stored?.status === "mantenimiento" && stored.maintenanceType !== null

// Informe de una aeronave (con la API, un GET del informe): todos sus datos, su
// mantenimiento en curso (si está en hangar) y sus reparaciones anteriores.
export const getAircraftReport = (
  aircraftId: string
): Promise<AircraftReport> => {
  const stored = FLEET.find((aircraft) => aircraft.id === aircraftId)
  if (!stored) {
    return Promise.reject(new Error(`Aeronave ${aircraftId} no encontrada`))
  }
  return Promise.resolve({
    aircraft: toAircraft(stored),
    maintenance: inMaintenance(stored)
      ? toMaintenance(stored, openOrderOf(stored))
      : null,
    history: (HISTORY.get(stored.id) ?? []).map((entry) => ({ ...entry })),
  })
}

// Marca o desmarca una tarea del mantenimiento (con la API, un PATCH de la tarea).
export const setMaintenanceTask = (
  aircraftId: string,
  taskIndex: number,
  done: boolean
): Promise<MaintenanceRecord> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const stored = FLEET.find((aircraft) => aircraft.id === aircraftId)
      if (!stored || !inMaintenance(stored)) {
        return reject(new Error("La aeronave no está en mantenimiento."))
      }
      const order = openOrderOf(stored)
      order.done[taskIndex] = done
      resolve(toMaintenance(stored, order))
    }, 200)
  })

// Libera la aeronave a servicio (con la API, un POST): solo con todas las tareas
// hechas. Queda operativa y la reparación pasa al historial.
export const releaseToService = (aircraftId: string): Promise<Aircraft> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const stored = FLEET.find((aircraft) => aircraft.id === aircraftId)
      if (!stored || !inMaintenance(stored)) {
        return reject(new Error("La aeronave no está en mantenimiento."))
      }
      const order = openOrderOf(stored)
      if (!order.done.every(Boolean)) {
        return reject(new Error("Faltan tareas por completar."))
      }
      HISTORY.set(stored.id, [
        {
          orderNumber: order.orderNumber,
          type: order.type,
          description: stored.maintenanceNote,
          hangar: order.hangar,
          openedOn: order.openedOn,
          closedOn: today(),
        },
        ...(HISTORY.get(stored.id) ?? []),
      ])
      WORK_ORDERS.delete(stored.id)
      Object.assign(stored, {
        status: "operativa",
        maintenanceType: null,
        maintenanceNote: null,
      })
      resolve(toAircraft(stored))
    }, 400)
  })

// Elimina una aeronave de la flota (con la API, un DELETE). Se borran también su
// mantenimiento en curso y su historial.
export const deleteAircraft = (aircraftId: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // Simula la latencia de la red.
    setTimeout(() => {
      const index = FLEET.findIndex((aircraft) => aircraft.id === aircraftId)
      if (index === -1) {
        return reject(new Error(`Aeronave ${aircraftId} no encontrada`))
      }
      FLEET.splice(index, 1)
      WORK_ORDERS.delete(aircraftId)
      HISTORY.delete(aircraftId)
      resolve()
    }, 400)
  })
