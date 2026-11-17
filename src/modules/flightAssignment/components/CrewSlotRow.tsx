import { useId } from "react"

import { AiSuggestIcon, ChevronDownIcon } from "@/App/utils/icons"
import { initialsOf } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SlotCandidates from "@/modules/flightAssignment/components/SlotCandidates"
import type { CrewSlot } from "@/modules/shared/flightAssignment/types/flightAssignment.types"

interface CrewSlotRowProps {
  flightId: string
  slot: CrewSlot
  // false con la tripulación confirmada: sin botones.
  editable: boolean
  open: boolean
  // Hay una acción en curso: todos los botones de la ficha quedan deshabilitados.
  busy: boolean
  onToggle: () => void
  onUnassign: () => void
  onAssign: (crewId: string) => void
}

const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 lg:min-h-9"

// Un puesto (li): vacío con «Asignar», o cubierto con la persona, «Cambiar» y «Quitar».
// «Asignar» y «Cambiar» abren los candidatos debajo.
const CrewSlotRow = ({
  flightId,
  slot,
  editable,
  open,
  busy,
  onToggle,
  onUnassign,
  onAssign,
}: CrewSlotRowProps) => {
  const candidatesId = useId()
  const { assignee, label } = slot
  const verb = assignee ? "Cambiar" : "Asignar"

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg p-3",
        assignee
          ? "border border-brand-border"
          : "border-2 border-dashed border-brand-border-strong"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {assignee ? (
            <span
              aria-hidden="true"
              className={cn(
                typography.labelLg,
                "flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-primary text-white"
              )}
            >
              {initialsOf(assignee.fullName)}
            </span>
          ) : null}
          <div className="min-w-0">
            <p
              className={cn(
                typography.labelSm,
                "text-muted-foreground uppercase"
              )}
            >
              {label}
            </p>
            {assignee ? (
              <>
                <p className={cn(typography.labelLg, "text-foreground")}>
                  {assignee.fullName}
                </p>
                <p className={cn(typography.bodySm, "text-muted-foreground")}>
                  {assignee.summary}
                </p>
              </>
            ) : (
              <p className={cn(typography.labelLg, "text-muted-foreground")}>
                Sin asignar
              </p>
            )}
          </div>
        </div>

        {editable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? candidatesId : undefined}
              aria-label={
                open ? `Ocultar candidatos de ${label}` : `${verb} ${label}`
              }
              data-focus-id={
                assignee ? `change-${slot.id}` : `assign-${slot.id}`
              }
              disabled={busy}
              onClick={onToggle}
              className={cn(
                typography.labelLg,
                BUTTON,
                assignee
                  ? "text-brand-secondary hover:bg-muted active:bg-brand-neutral"
                  : "border border-brand-secondary text-brand-secondary hover:bg-brand-neutral active:bg-muted"
              )}
            >
              {open ? "Ocultar candidatos" : verb}
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                  open && "rotate-180"
                )}
              />
            </button>
            {assignee ? (
              <button
                type="button"
                aria-label={`Quitar ${label}`}
                data-focus-id={`quit-${slot.id}`}
                disabled={busy}
                onClick={onUnassign}
                className={cn(
                  typography.labelLg,
                  BUTTON,
                  "text-muted-foreground hover:bg-muted active:bg-brand-neutral"
                )}
              >
                Quitar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {assignee?.source === "ia" ? (
        <div className="flex flex-col items-start gap-1.5 sm:pl-13">
          <p
            className={cn(
              typography.labelSm,
              "inline-flex w-fit items-center gap-1 rounded-full bg-brand-neutral px-2.5 py-1 text-brand-secondary"
            )}
          >
            <AiSuggestIcon aria-hidden="true" className="size-3.5 shrink-0" />
            Sugerido por la IA
          </p>
          {assignee.rationale ? (
            <p
              className={cn(
                typography.bodySm,
                "rounded-md bg-muted px-3 py-2 text-muted-foreground"
              )}
            >
              {assignee.rationale}
            </p>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <SlotCandidates
          id={candidatesId}
          flightId={flightId}
          slot={slot}
          busy={busy}
          onAssign={onAssign}
        />
      ) : null}
    </li>
  )
}

export default CrewSlotRow
