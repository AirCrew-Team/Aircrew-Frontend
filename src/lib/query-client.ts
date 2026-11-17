import { QueryClient } from "@tanstack/react-query"

// Cliente único de TanStack Query para los datos del servidor (y, mientras no exista la API, los simulados).
export const queryClient = new QueryClient()
