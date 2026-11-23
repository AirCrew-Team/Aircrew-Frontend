import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type {
  CrewStatus,
  FlightStatus,
} from "@/modules/adminFlights/types/adminFlights.types"
import {
  CREW_STATUS,
  FLIGHT_STATUS,
} from "@/modules/adminFlights/utils/flightStatus"

const badgeClass = cn(
  typography.labelSm,
  "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap"
)

// Estado del vuelo: punto de color (decorativo) y texto.
export const FlightStatusBadge = ({ status }: { status: FlightStatus }) => {
  const { label, badge, dot } = FLIGHT_STATUS[status]
  return (
    <span className={cn(badgeClass, badge)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  )
}

// Avance de la tripulación en Programación.
export const CrewStatusBadge = ({ status }: { status: CrewStatus }) => {
  const { label, badge } = CREW_STATUS[status]
  return <span className={cn(badgeClass, badge)}>{label}</span>
}
