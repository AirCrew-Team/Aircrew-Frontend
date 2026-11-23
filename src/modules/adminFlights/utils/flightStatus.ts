import type {
  CrewStatus,
  FlightStatus,
} from "@/modules/adminFlights/types/adminFlights.types"

// Texto y colores de cada estado del vuelo. Como en Certificaciones, el sistema de
// diseño no tiene verde ni ámbar: se usa la paleta de Tailwind en tonos con buen
// contraste.
export const FLIGHT_STATUS: Record<
  FlightStatus,
  { label: string; badge: string; dot: string }
> = {
  programado: {
    label: "Programado",
    badge: "bg-brand-neutral text-brand-secondary",
    dot: "bg-brand-secondary",
  },
  retrasado: {
    label: "Retrasado",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  en_vuelo: {
    label: "En vuelo",
    badge: "bg-sky-100 text-sky-800",
    dot: "bg-sky-600",
  },
  completado: {
    label: "Completado",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-600",
  },
  cancelado: {
    label: "Cancelado",
    badge: "bg-error-container text-on-error-container",
    dot: "bg-destructive",
  },
}

// Valores válidos de ?status= y el orden de los filtros.
export const FLIGHT_STATUSES: FlightStatus[] = [
  "programado",
  "retrasado",
  "en_vuelo",
  "completado",
  "cancelado",
]

// Filtros de la barra (sin valor: «Todos»), en plural.
export const STATUS_FILTERS: { value?: FlightStatus; label: string }[] = [
  { label: "Todos" },
  { value: "programado", label: "Programados" },
  { value: "retrasado", label: "Retrasados" },
  { value: "en_vuelo", label: "En vuelo" },
  { value: "completado", label: "Completados" },
  { value: "cancelado", label: "Cancelados" },
]

// Avance de la tripulación en Programación (lo hace el supervisor).
export const CREW_STATUS: Record<CrewStatus, { label: string; badge: string }> =
  {
    sin_asignar: {
      label: "Sin asignar",
      badge: "bg-amber-100 text-amber-800",
    },
    incompleta: {
      label: "Incompleta",
      badge: "bg-amber-100 text-amber-800",
    },
    completa: {
      label: "Completa",
      badge: "bg-brand-neutral text-brand-secondary",
    },
    confirmada: {
      label: "Confirmada",
      badge: "bg-emerald-100 text-emerald-800",
    },
  }
