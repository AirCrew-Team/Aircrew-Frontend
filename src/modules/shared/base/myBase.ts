import { queryOptions } from "@tanstack/react-query"

import { queryClient } from "@/lib/query-client"
import apiClient from "@/service/api-client"

// GET /admin/bases/me: base del usuario con sesión (encabezado de los inicios).
export interface ApiMyBase {
  unit: string
  hq_code: string
  base_name: string
  city: string
  iata: string
  icao: string
  operational_condition: "normal" | "degraded" | "critical"
}

export const myBaseQuery = queryOptions({
  queryKey: ["base", "me"],
  queryFn: async () =>
    (await apiClient.get<ApiMyBase>("/api/admin/bases/me")).data,
  // La base no cambia durante la sesión.
  staleTime: Infinity,
})

// Para las funciones de datos que filtran por base (?base=BOG): usa la caché si ya está.
export const getMyBase = () => queryClient.fetchQuery(myBaseQuery)

// «2026-11-19T17:30:00.000Z» → «17:30» (hora UTC, como la muestran las pantallas).
export const utcClock = (iso: string) => iso.slice(11, 16)
