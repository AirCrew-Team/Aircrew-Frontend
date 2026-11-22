// Contrato de certificaciones del servicio crew (feature/certifications-superAdmin del
// backend) que simulan los tests de la sesión real. Todo es solo del super_admin:
// - GET    /api/crew/certifications/options → { certificates, by_position, pilot_licenses, cabin_license }
// - GET    /api/crew/certifications/stats → { total, by_status }
// - GET    /api/crew/certifications?page=&page_size=&search=&status= → { items, page, page_size, total }
// - GET    /api/crew/certifications/uncertified → [item]
// - GET    /api/crew/certifications/:userId → ficha (item + file + history)
// - GET    /api/crew/certifications/:userId/file → el binario de la copia
// - PUT    /api/crew/certifications/:userId → la ficha guardada
// - DELETE /api/crew/certifications/:userId → 204
// Errores planos { error: "texto" } (errorHandler de shared).
import { http, HttpResponse } from "msw"

import { API_URL } from "./authApi"

export const CERTIFICATIONS_URL = `${API_URL}/api/crew/certifications`
export const certificationUrl = (id: string) => `${CERTIFICATIONS_URL}/${id}`

export const CREW_UUIDS = {
  uncertified: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  verified: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  pending: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  unknown: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const

export const API_CERTIFICATION_ITEMS = {
  uncertified: {
    user_id: CREW_UUIDS.uncertified,
    employee_code: "AC-0003",
    name: "Daniel Herrera",
    email: "d.herrera@delta.com",
    position: "Copiloto",
    area: "flight_deck",
    base: "JFK",
    license_number: null,
    certificates: [],
    status: "uncertified",
    updated_at: null,
  },
  verified: {
    user_id: CREW_UUIDS.verified,
    employee_code: "AC-0001",
    name: "Diego Salcedo Pérez",
    email: "d.salcedo@delta.com",
    position: "Comandante",
    area: "flight_deck",
    base: "ATL",
    license_number: "2775981",
    certificates: ["ATP", "IR", "ME"],
    status: "verified",
    updated_at: "2026-11-02T15:00:00.000Z",
  },
  pending: {
    user_id: CREW_UUIDS.pending,
    employee_code: "AC-0004",
    name: "Sofía Restrepo",
    email: "s.restrepo@delta.com",
    position: "Sobrecargo",
    area: "cabin",
    base: null,
    license_number: "4818266",
    certificates: ["CDP"],
    status: "pending_verification",
    updated_at: "2026-11-05T15:00:00.000Z",
  },
  // Admin no respondió (sin nombre ni correo) y su cargo no está en el catálogo.
  unknown: {
    user_id: CREW_UUIDS.unknown,
    employee_code: null,
    name: null,
    email: null,
    position: "Instructor",
    area: null,
    base: "SEA",
    license_number: null,
    certificates: [],
    status: "uncertified",
    updated_at: null,
  },
}

export const API_VERIFIED_DETAIL = {
  ...API_CERTIFICATION_ITEMS.verified,
  file: {
    file_name: "licencia-diego.pdf",
    mime_type: "application/pdf",
    size_bytes: 245_760,
  },
  history: [
    {
      event: "verified",
      by_user_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      by: "Ana Torres",
      note: "cotejado con Airmen Inquiry (registro público FAA)",
      created_at: "2026-08-20T15:00:00.000Z",
    },
    {
      event: "registered",
      by_user_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      // El super_admin que lo registró ya no existe.
      by: null,
      note: null,
      created_at: "2026-08-19T15:00:00.000Z",
    },
  ],
}

export const API_PENDING_DETAIL = {
  ...API_CERTIFICATION_ITEMS.pending,
  file: {
    file_name: "cdp-sofia.jpg",
    mime_type: "image/jpeg",
    size_bytes: 1_572_864,
  },
  history: [
    {
      event: "registered",
      by_user_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      by: "Ana Torres",
      note: null,
      created_at: "2026-11-05T15:00:00.000Z",
    },
  ],
}

// Ficha de alguien sin certificado: sin copia ni historial.
export const uncertifiedDetail = (
  item:
    | typeof API_CERTIFICATION_ITEMS.uncertified
    | typeof API_CERTIFICATION_ITEMS.unknown
) => ({ ...item, file: null, history: [] })

// Nombres distintos a los datos demo a propósito: así se ve que la pantalla usa el
// catálogo del backend y no una lista propia.
export const API_CERTIFICATION_OPTIONS = {
  certificates: [
    { code: "PPL", name: "Private Pilot (PPL)", short: "PPL" },
    { code: "CPL", name: "Commercial Pilot (CPL)", short: "CPL" },
    { code: "ATP", name: "Airline Transport Pilot (ATP)", short: "ATP" },
    { code: "IR", name: "Instrument Rating (IR) · catálogo", short: "IR-cat" },
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
  by_position: {
    Comandante: {
      area: "flight_deck",
      certificates: ["PPL", "CPL", "ATP", "IR", "ME"],
    },
    Copiloto: {
      area: "flight_deck",
      certificates: ["PPL", "CPL", "ATP", "IR", "ME"],
    },
    "Auxiliar de Vuelo": { area: "cabin", certificates: ["CDP"] },
    "Sobrecargo Principal": {
      area: "cabin",
      certificates: ["CDP", "LID", "CONF", "ADU"],
    },
    Sobrecargo: { area: "cabin", certificates: ["CDP", "LID", "CONF", "ADU"] },
  },
  pilot_licenses: ["ATP", "CPL", "PPL"],
  cabin_license: "CDP",
}

export const API_CERTIFICATION_STATS = {
  total: 4,
  by_status: { verified: 1, pending_verification: 1, uncertified: 2 },
}

export const apiError = (message: string, status: number) =>
  HttpResponse.json({ error: message }, { status })

// Catálogo, indicadores, lista, sin certificado y ficha de cada tripulante.
// `listRequests` guarda las URL pedidas a la lista, para revisar los parámetros.
export const certificationsHandlers = () => {
  const listRequests: URL[] = []
  const items = Object.values(API_CERTIFICATION_ITEMS)
  return {
    listRequests,
    handlers: [
      http.get(`${CERTIFICATIONS_URL}/options`, () =>
        HttpResponse.json(API_CERTIFICATION_OPTIONS)
      ),
      http.get(`${CERTIFICATIONS_URL}/stats`, () =>
        HttpResponse.json(API_CERTIFICATION_STATS)
      ),
      http.get(`${CERTIFICATIONS_URL}/uncertified`, () =>
        HttpResponse.json(items.filter((item) => item.status === "uncertified"))
      ),
      http.get(CERTIFICATIONS_URL, ({ request }) => {
        const url = new URL(request.url)
        listRequests.push(url)
        const status = url.searchParams.get("status")
        const filtered = status
          ? items.filter((item) => item.status === status)
          : items
        return HttpResponse.json({
          items: filtered,
          page: Number(url.searchParams.get("page") ?? 1),
          page_size: Number(url.searchParams.get("page_size") ?? 5),
          total: filtered.length,
        })
      }),
      http.get(certificationUrl(CREW_UUIDS.verified), () =>
        HttpResponse.json(API_VERIFIED_DETAIL)
      ),
      http.get(certificationUrl(CREW_UUIDS.pending), () =>
        HttpResponse.json(API_PENDING_DETAIL)
      ),
      http.get(certificationUrl(CREW_UUIDS.uncertified), () =>
        HttpResponse.json(
          uncertifiedDetail(API_CERTIFICATION_ITEMS.uncertified)
        )
      ),
      http.get(certificationUrl(CREW_UUIDS.unknown), () =>
        HttpResponse.json(uncertifiedDetail(API_CERTIFICATION_ITEMS.unknown))
      ),
    ],
  }
}
