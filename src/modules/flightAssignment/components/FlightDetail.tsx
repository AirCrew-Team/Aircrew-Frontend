import { useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { typography } from "@/App/utils/typography"
import { TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import ConfirmCrewBar from "@/modules/flightAssignment/components/ConfirmCrewBar"
import CrewSlotRow from "@/modules/flightAssignment/components/CrewSlotRow"
import { dayParts } from "@/modules/flightAssignment/components/scheduleDates"
import SuggestCrewCard from "@/modules/flightAssignment/components/SuggestCrewCard"
import {
  assignCrew,
  confirmFlightCrew,
  suggestCrew,
  unassignCrew,
  type UnfilledSlot,
} from "@/modules/shared/flightAssignment/data/flightAssignment.data"
import type { PlannedFlight } from "@/modules/shared/flightAssignment/types/flightAssignment.types"
import { apiErrorMessage } from "@/service/api-error"

// Cada acción guarda el data-focus-id del botón que la lanzó: si falla, el foco vuelve a él.
type Action =
  | { kind: "assign"; slotId: string; crewId: string; trigger: string }
  | { kind: "unassign"; slotId: string; trigger: string }
  | { kind: "suggest"; trigger: string }
  | { kind: "confirm"; trigger: string }

const SAVE_ERROR = "No se pudo guardar el cambio. Intenta de nuevo."
const SUGGEST_ERROR =
  "La IA no pudo sugerir una tripulación. Intenta de nuevo o asigna a mano."

// «1 h 25 min», «10 h 35 min», «2 h» o «55 min».
const durationText = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

interface FlightDetailProps {
  flight: PlannedFlight
  // Fija la selección en este vuelo: tras confirmarlo, el «primero por completar» sería otro.
  onActionStart: () => void
}

// Ficha del vuelo seleccionado (tabpanel): encabezado, datos, tarjeta de la IA, puestos por
// cabina y barra de confirmación. Lanza las acciones y mueve el foco al terminar.
const FlightDetail = ({ flight, onActionStart }: FlightDetailProps) => {
  const queryClient = useQueryClient()
  // Un solo puesto abierto a la vez.
  const [openSlotId, setOpenSlotId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Foco pendiente tras una acción. Si salió bien, espera a que la ficha muestre el vuelo
  // actualizado (staleFlight es el de antes); si falló, va al disparador ya habilitado.
  const pendingFocus = useRef<{
    target: string
    staleFlight: PlannedFlight | null
  } | null>(null)

  const mutation = useMutation({
    mutationFn: (action: Action) => {
      switch (action.kind) {
        case "assign":
          return assignCrew(flight.id, action.slotId, action.crewId)
        case "unassign":
          return unassignCrew(flight.id, action.slotId)
        case "suggest":
          return suggestCrew(flight.id)
        case "confirm":
          return confirmFlightCrew(flight.id)
      }
    },
    onSuccess: (updated, action) => {
      let target = "confirmed"
      if (action.kind === "assign") target = `change-${action.slotId}`
      if (action.kind === "unassign") target = `assign-${action.slotId}`
      if (action.kind === "suggest") {
        const filled = updated.slots.filter(
          (slot) =>
            slot.assignee &&
            flight.slots.some(
              (before) => before.id === slot.id && !before.assignee
            )
        )
        target = `change-${filled.at(0)?.id}`
        // Puestos que ni la IA pudo cubrir (nadie cumple las reglas), con el motivo.
        const unfilled =
          (updated as { unfilled?: UnfilledSlot[] }).unfilled ?? []
        toast.success(
          `La IA sugirió ${filled.length === 1 ? "1 tripulante" : `${filled.length} tripulantes`} para ${flight.flightNumber}`,
          unfilled.length > 0
            ? {
                description: `Sin cubrir: ${unfilled
                  .map((slot) => `${slot.label} (${slot.reason})`)
                  .join("; ")}`,
              }
            : undefined
        )
      }
      if (action.kind === "confirm") {
        toast.success(`Tripulación confirmada para ${flight.flightNumber}`, {
          description: `Se avisó a los ${updated.slots.length} tripulantes.`,
        })
      }
      pendingFocus.current = { target, staleFlight: flight }
      // Cierra el puesto abierto: su lista de candidatos se desmonta con la consulta que se quita.
      setOpenSlotId(null)
      const dayKey = ["assignment", "flights", flight.date]
      // Una recarga del día en curso traería el vuelo de antes y pisaría el actualizado. La
      // cancelación es síncrona, así que setQueryData llega después.
      void queryClient.cancelQueries({ queryKey: dayKey })
      queryClient.setQueryData<PlannedFlight[]>(dayKey, (flights) =>
        flights?.map((item) => (item.id === updated.id ? updated : item))
      )
      void queryClient.invalidateQueries({ queryKey: ["assignment", "days"] })
      // Se quitan (no se invalidan): al reabrir un puesto se ve «Cargando candidatos…» y no la
      // lista vieja, que podría traer a quien acaba de ocupar otro puesto.
      queryClient.removeQueries({ queryKey: ["assignment", "candidates"] })
    },
    onError: (_error, action) => {
      pendingFocus.current = { target: action.trigger, staleFlight: null }
    },
  })

  const busy = mutation.isPending

  // Corre al llegar el vuelo actualizado o al terminar la acción (éxito o fallo). Con una
  // acción en curso no hace nada: los botones están deshabilitados.
  useEffect(() => {
    const pending = pendingFocus.current
    if (busy || !pending || pending.staleFlight === flight) return
    const element = panelRef.current?.querySelector<HTMLElement>(
      `[data-focus-id="${pending.target}"]`
    )
    if (!element) return
    pendingFocus.current = null
    element.focus()
  }, [flight, busy])

  const run = (action: Action) => {
    // Un foco pendiente de la acción anterior ya no vale.
    pendingFocus.current = null
    onActionStart()
    mutation.mutate(action)
  }

  const kind = mutation.variables?.kind
  const editable = flight.status !== "confirmada"
  const total = flight.slots.length
  const empty = flight.slots.filter((slot) => !slot.assignee).length
  const { longWeekday, day, month } = dayParts(flight.date)
  const cabins = [
    {
      title: "Cabina de mando",
      slots: flight.slots.filter(
        (slot) => slot.role !== "jefe_cabina" && slot.role !== "tcp"
      ),
    },
    {
      title: "Cabina de pasajeros",
      slots: flight.slots.filter(
        (slot) => slot.role === "jefe_cabina" || slot.role === "tcp"
      ),
    },
  ]

  return (
    <TabsContent
      value={flight.id}
      className="min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:col-span-2"
    >
      <div ref={panelRef} className="flex flex-col gap-4">
        {/* Encabezado y datos del vuelo. */}
        <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p
                className={cn(
                  typography.labelSm,
                  "tracking-wider text-brand-secondary uppercase"
                )}
              >
                {`${longWeekday.charAt(0).toUpperCase()}${longWeekday.slice(1)} ${day} ${month} · Horas en UTC`}
              </p>
              <h2
                className={cn(
                  typography.headlineMd,
                  "font-bold text-balance text-brand-primary"
                )}
              >
                {`${flight.flightNumber} · ${flight.origin.city} (${flight.origin.code}) → ${flight.destination.city} (${flight.destination.code})`}
              </h2>
              <p className={cn(typography.bodyMd, "text-muted-foreground")}>
                {`Sale ${flight.departureUtc} · Llega ${flight.arrivalUtc}${flight.arrivesNextDay ? " (+1)" : ""} · ${durationText(flight.durationMinutes)} · ${flight.scope === "internacional" ? "Internacional" : "Nacional"}`}
              </p>
            </div>
            <p
              className={cn(
                typography.labelMd,
                "shrink-0 rounded-full bg-brand-neutral px-3 py-1.5 font-semibold whitespace-nowrap text-brand-secondary tabular-nums"
              )}
            >
              {`${total - empty} de ${total} puestos`}
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-muted px-3 py-2">
              <dt className={cn(typography.bodySm, "text-muted-foreground")}>
                Aeronave
              </dt>
              <dd className={cn(typography.labelLg, "text-foreground")}>
                {`${flight.aircraft.model} · ${flight.aircraft.registration}`}
              </dd>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <dt className={cn(typography.bodySm, "text-muted-foreground")}>
                Capacidad
              </dt>
              <dd className={cn(typography.labelLg, "text-foreground")}>
                {`${flight.aircraft.seats} sillas`}
              </dd>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <dt className={cn(typography.bodySm, "text-muted-foreground")}>
                Tripulación mínima
              </dt>
              <dd className={cn(typography.labelLg, "text-foreground")}>
                {`${flight.minimumCrew.pilots} pilotos + ${flight.minimumCrew.cabin} TCP`}
              </dd>
            </div>
          </dl>
        </div>

        {editable && empty > 0 ? (
          <SuggestCrewCard
            emptyCount={empty}
            disabled={busy}
            onSuggest={() => run({ kind: "suggest", trigger: "suggest" })}
          />
        ) : null}

        {/* Estado de la acción: como mucho un status y un alert en la ficha. */}
        {busy && kind === "suggest" ? (
          <p
            role="status"
            className={cn(
              typography.bodyMd,
              "rounded-xl bg-brand-neutral px-4 py-3 text-brand-primary"
            )}
          >
            La IA está buscando…
          </p>
        ) : null}
        {busy && kind === "suggest" ? (
          <p className={cn(typography.bodySm, "-mt-2 px-1 text-muted-foreground")}>
            Puede tardar hasta un minuto.
          </p>
        ) : null}
        {mutation.isError ? (
          <p
            role="alert"
            className={cn(
              typography.bodyMd,
              "rounded-xl bg-error-container px-4 py-3 text-on-error-container"
            )}
          >
            {/* El motivo del backend (p. ej. «No está habilitado en 787.»), si lo hay. */}
            {apiErrorMessage(
              mutation.error,
              kind === "suggest" ? SUGGEST_ERROR : SAVE_ERROR
            )}
          </p>
        ) : null}

        {cabins.map(({ title, slots }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm sm:p-5"
          >
            <h3
              className={cn(
                typography.headlineSm,
                "font-bold text-brand-primary"
              )}
            >
              {title}
            </h3>
            <ul className="flex flex-col gap-3">
              {slots.map((slot) => (
                <CrewSlotRow
                  key={slot.id}
                  flightId={flight.id}
                  slot={slot}
                  editable={editable}
                  open={openSlotId === slot.id}
                  busy={busy}
                  onToggle={() =>
                    setOpenSlotId((current) =>
                      current === slot.id ? null : slot.id
                    )
                  }
                  onUnassign={() =>
                    run({
                      kind: "unassign",
                      slotId: slot.id,
                      trigger: `quit-${slot.id}`,
                    })
                  }
                  onAssign={(crewId) =>
                    run({
                      kind: "assign",
                      slotId: slot.id,
                      crewId,
                      trigger: `candidate-${crewId}`,
                    })
                  }
                />
              ))}
            </ul>
          </div>
        ))}

        {editable ? (
          <ConfirmCrewBar
            emptyCount={empty}
            total={total}
            canConfirm={flight.status === "completa"}
            disabled={busy}
            onConfirm={() => run({ kind: "confirm", trigger: "confirm" })}
          />
        ) : (
          // Estado persistente (sin región viva: el toast ya lo anuncia). Recibe el foco al confirmar.
          <p
            tabIndex={-1}
            data-focus-id="confirmed"
            className={cn(
              typography.labelLg,
              "rounded-xl border-l-4 border-brand-secondary bg-card p-4 pl-3.5 text-brand-primary shadow-sm focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden"
            )}
          >
            {`Tripulación confirmada. Se avisó a los ${total} tripulantes.`}
          </p>
        )}
      </div>
    </TabsContent>
  )
}

export default FlightDetail
