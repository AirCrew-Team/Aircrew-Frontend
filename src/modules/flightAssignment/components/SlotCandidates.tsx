import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { ChevronDownIcon, WarningIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getSlotCandidates } from "@/modules/shared/flightAssignment/data/flightAssignment.data"
import type { CrewSlot } from "@/modules/shared/flightAssignment/types/flightAssignment.types"

interface SlotCandidatesProps {
  // id del contenedor (aria-controls del botón del puesto).
  id: string
  flightId: string
  slot: CrewSlot
  busy: boolean
  onAssign: (crewId: string) => void
}

// Candidatos del puesto abierto: quienes cumplen las reglas (con «Asignar») y, desplegable,
// quienes no cumplen con su motivo. Solo se monta con el puesto abierto: así la consulta
// ["assignment", "candidates", vuelo, puesto] solo se pide entonces.
const SlotCandidates = ({
  id,
  flightId,
  slot,
  busy,
  onAssign,
}: SlotCandidatesProps) => {
  const ineligibleId = useId()
  const [showIneligible, setShowIneligible] = useState(false)
  const { data, isPending, isError } = useQuery({
    queryKey: ["assignment", "candidates", flightId, slot.id],
    queryFn: () => getSlotCandidates(flightId, slot.id),
  })

  return (
    <div
      id={id}
      className="flex flex-col gap-2 border-t border-brand-border pt-3"
    >
      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando candidatos…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudieron cargar los candidatos.
        </p>
      ) : (
        <>
          <p className={cn(typography.labelMd, "text-muted-foreground")}>
            {data.eligible.length === 0
              ? "Nadie cumple las reglas para este puesto."
              : data.eligible.length === 1
                ? "1 cumple las reglas"
                : `${data.eligible.length} cumplen las reglas`}
          </p>
          {data.eligible.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {data.eligible.map((candidate) => (
                <li
                  key={candidate.crewId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className={cn(typography.labelLg, "text-foreground")}>
                      {candidate.fullName}
                    </p>
                    <p
                      className={cn(typography.bodySm, "text-muted-foreground")}
                    >
                      {candidate.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Asignar a ${candidate.fullName} como ${slot.label}`}
                    data-focus-id={`candidate-${candidate.crewId}`}
                    disabled={busy}
                    onClick={() => onAssign(candidate.crewId)}
                    className={cn(
                      typography.labelLg,
                      "min-h-11 shrink-0 rounded-md bg-brand-secondary px-3 py-1.5 text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-hidden active:bg-brand-primary disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none lg:min-h-9"
                    )}
                  >
                    Asignar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {data.ineligible.length > 0 ? (
            <>
              <button
                type="button"
                aria-expanded={showIneligible}
                aria-controls={showIneligible ? ineligibleId : undefined}
                disabled={busy}
                onClick={() => setShowIneligible((value) => !value)}
                className={cn(
                  typography.labelMd,
                  "-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-md px-2 font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-neutral disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none lg:min-h-9"
                )}
              >
                {`No cumplen las reglas (${data.ineligible.length})`}
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                    showIneligible && "rotate-180"
                  )}
                />
              </button>
              {showIneligible ? (
                <ul id={ineligibleId} className="flex flex-col gap-1.5">
                  {data.ineligible.map((candidate) => (
                    <li
                      key={candidate.crewId}
                      className={cn(
                        typography.bodySm,
                        "flex items-start gap-1.5 text-muted-foreground"
                      )}
                    >
                      <WarningIcon
                        aria-hidden="true"
                        className="mt-px size-3.5 shrink-0"
                      />
                      {`${candidate.fullName} — ${candidate.reason}`}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

export default SlotCandidates
