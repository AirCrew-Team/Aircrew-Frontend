import { useState, type ReactNode } from "react"

import { FlightIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  CrewStatusBadge,
  FlightStatusBadge,
} from "@/modules/adminFlights/components/FlightBadges"
import FlightDialogHeader from "@/modules/adminFlights/components/FlightDialogHeader"
import type {
  AdminFlight,
  FlightEndpoint,
} from "@/modules/adminFlights/types/adminFlights.types"
import { crewRequirement } from "@/modules/adminFlights/utils/crewRequirement"
import {
  durationMinutes,
  formatDuration,
  formatInZone,
} from "@/modules/adminFlights/utils/flightTime"

const cardClass = "flex flex-col gap-3 rounded-lg bg-card p-4 shadow-xs"
const sectionTitleClass = cn(
  typography.labelSm,
  "text-brand-secondary uppercase"
)
const labelClass = cn(typography.labelSm, "text-muted-foreground uppercase")
const valueClass = cn(typography.labelLg, "font-bold text-brand-primary")

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <dt className={labelClass}>{label}</dt>
    <dd className={valueClass}>{children}</dd>
  </div>
)

// Un extremo: «BOG · Bogotá», «24 nov · 08:00» y la hora UTC.
const Endpoint = ({
  label,
  endpoint,
  iso,
}: {
  label: string
  endpoint: FlightEndpoint
  iso: string
}) => {
  const local = formatInZone(iso, endpoint.timezone)
  const utc = formatInZone(iso, null)
  return (
    <Item label={label}>
      <span className="block">
        {endpoint.code}
        {endpoint.city ? ` · ${endpoint.city}` : ""}
      </span>
      <span className={cn(typography.bodySm, "block font-normal tabular-nums")}>
        {local.day} · {local.time}
        {endpoint.timezone ? ` (${utc.time})` : ""}
      </span>
    </Item>
  )
}

interface FlightDetailDialogProps {
  // Vuelo de la fila; null con la ventana cerrada.
  flight: AdminFlight | null
  onClose: () => void
}

// Ventana del ojo: ficha del vuelo. Usa los datos de la fila (no pide nada). Por ahora
// solo lectura: editar y cancelar llegan en la fase 2.
const FlightDetailDialog = ({ flight, onClose }: FlightDetailDialogProps) => {
  // Último vuelo abierto: la ficha sigue visible durante la animación de cierre.
  const [shown, setShown] = useState(flight)
  if (flight !== null && flight !== shown) setShown(flight)

  const minutes = shown
    ? durationMinutes(shown.departureAt, shown.arrivalAt)
    : 0
  const crew = shown ? crewRequirement(shown.aircraft.seats, minutes) : null

  return (
    <Dialog
      open={flight !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-xl"
      >
        <FlightDialogHeader
          icon={<FlightIcon className="size-5" />}
          title={shown ? `Vuelo ${shown.flightNumber}` : "Vuelo"}
          description={
            shown
              ? `${shown.origin.code} → ${shown.destination.code} · ${shown.scope === "nacional" ? "Nacional" : "Internacional"}`
              : "Programación de vuelos"
          }
          trailing={shown ? <FlightStatusBadge status={shown.status} /> : null}
          closeLabel="Cerrar ficha del vuelo"
        />
        {shown ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
            <section aria-label="Ruta y horario" className={cardClass}>
              <h3 className={sectionTitleClass}>Ruta y horario</h3>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Endpoint
                  label="Salida"
                  endpoint={shown.origin}
                  iso={shown.departureAt}
                />
                <Endpoint
                  label="Llegada"
                  endpoint={shown.destination}
                  iso={shown.arrivalAt}
                />
                <Item label="Duración">{formatDuration(minutes)}</Item>
                <Item label="Puerta">{shown.gate ?? "Sin asignar"}</Item>
              </dl>
            </section>
            <section aria-label="Aeronave" className={cardClass}>
              <h3 className={sectionTitleClass}>Aeronave</h3>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Modelo">{shown.aircraft.name}</Item>
                <Item label="Matrícula">
                  <span className="font-mono">
                    {shown.aircraft.registration}
                  </span>
                </Item>
                <Item label="Sillas">{shown.aircraft.seats}</Item>
              </dl>
            </section>
            <section aria-label="Tripulación" className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={sectionTitleClass}>Tripulación</h3>
                <CrewStatusBadge status={shown.crewStatus} />
              </div>
              <p className={cn(typography.bodyMd, "text-brand-primary")}>
                {shown.requiredSlots} puestos: {crew?.text}.
              </p>
              <p className={cn(typography.bodySm, "text-muted-foreground")}>
                La asigna el supervisor en Programación.
              </p>
            </section>
          </div>
        ) : null}
        <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
          <DialogClose
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 items-center rounded-md px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
            )}
          >
            Cerrar
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FlightDetailDialog
