import { queryOptions } from "@tanstack/react-query"

import { getAffectedFlight } from "@/modules/absences/data/absences.data"

// Única definición de la consulta del vuelo para sus tres lecturas (cabecera, F1 y
// formulario). staleTime Infinity: el vuelo no cambia y la cuenta regresiva no debe
// saltar al volver a la pestaña; basta un observador con otro valor para que recargue.
// Va fuera de absences.data.ts para que los tests que simulan ese módulo también la cubran.
export const affectedFlightQuery = queryOptions({
  queryKey: ["absences", "affectedFlight"],
  queryFn: getAffectedFlight,
  staleTime: Infinity,
})
