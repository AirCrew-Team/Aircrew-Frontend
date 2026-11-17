import { useEffect, useId, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { AcceptIcon, ArrowRightIcon, WarningIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import DotSeparator from "@/modules/home/components/DotSeparator"
import { getReplacementAssignments } from "@/modules/home/data/home.data"

// Bloque 3: asignaciones de reemplazo aprobadas por el Supervisor. Se ve una sola,
// la primera sin «Enterado»; si no queda ninguna, no se pinta nada.
const ReplacementAssignmentBanner = () => {
  const titleId = useId()
  const detailId = useId()
  const chipRef = useRef<HTMLSpanElement>(null)
  // Solo se mueve el foco tras pulsar «Enterado», nunca al montar.
  const focusAfterAcknowledgeRef = useRef(false)
  const [detailOpen, setDetailOpen] = useState(false)
  // Números de vuelo marcados como «Enterado» (sin persistir hasta que exista la API).
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const {
    data: assignments,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["replacements", "assignments"],
    queryFn: getReplacementAssignments,
  })

  const unacknowledged = (assignments ?? []).filter(
    (item) => !acknowledged.includes(item.flightNumber)
  )
  const assignment = unacknowledged.at(0)
  const pendingCount = unacknowledged.length - 1

  // El chip anuncia el vuelo nuevo; si era la última, el foco va al contenido principal
  // para no quedarse en body.
  useEffect(() => {
    if (!focusAfterAcknowledgeRef.current) return
    focusAfterAcknowledgeRef.current = false
    if (chipRef.current) chipRef.current.focus()
    else document.getElementById("contenido")?.focus()
  }, [assignment?.flightNumber])

  if (!isPending && !isError && !assignment) return null

  return (
    <section
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-xl bg-card p-4 pl-6 shadow-md sm:p-6 sm:pl-7"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2 bg-destructive"
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* El contador va en el distintivo, fuera del h2, para que el nombre del título no cambie. */}
        <div
          className={cn(
            typography.labelSm,
            "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-sm bg-destructive/10 px-3 py-1 font-bold tracking-wider text-destructive uppercase"
          )}
        >
          <WarningIcon aria-hidden="true" className="size-4 shrink-0" />
          <h2 id={titleId}>Asignación de reemplazo</h2>
          {pendingCount > 0 && !isError ? (
            <>
              <DotSeparator />
              <span>{`+${pendingCount} ${pendingCount === 1 ? "pendiente" : "pendientes"}`}</span>
            </>
          ) : null}
        </div>
        {assignment && !isError ? (
          <span
            ref={chipRef}
            tabIndex={-1}
            className={cn(
              typography.labelSm,
              "rounded-sm bg-brand-neutral px-2.5 py-0.5 text-brand-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            )}
          >
            Vuelo {assignment.flightNumber}
          </span>
        ) : null}
      </div>

      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "mt-2 text-muted-foreground")}
        >
          Cargando asignaciones de reemplazo…
        </p>
      ) : isError ? (
        <p
          role="alert"
          className={cn(typography.bodySm, "mt-2 text-destructive")}
        >
          No se pudieron cargar las asignaciones de reemplazo.
        </p>
      ) : assignment ? (
        <>
          <div className="mt-2 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2">
              <p className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={cn(
                    typography.headlineMd,
                    "font-bold text-brand-primary"
                  )}
                >
                  {assignment.origin.code}
                </span>
                <span
                  className={cn(
                    typography.headlineMd,
                    "font-bold text-brand-secondary"
                  )}
                >
                  →
                </span>
                <span
                  className={cn(
                    typography.headlineMd,
                    "font-bold text-brand-primary"
                  )}
                >
                  {assignment.destination.code}
                </span>
                <span
                  className={cn(typography.bodySm, "text-muted-foreground")}
                >
                  ({assignment.origin.name} → {assignment.destination.name})
                </span>
              </p>
              {/* Una sola línea: el lector oye las comas sr-only de DotSeparator. */}
              <p
                className={cn(
                  typography.bodySm,
                  "flex flex-wrap items-center gap-x-2 gap-y-1 text-foreground"
                )}
              >
                <span>
                  {assignment.dayLabel},{" "}
                  <strong className="font-semibold text-brand-primary">
                    {assignment.departureUtc} UTC
                  </strong>{" "}
                  ({assignment.departureLocal} local)
                </span>
                <DotSeparator />
                <span>{assignment.aircraft}</span>
                <DotSeparator />
                <span>{assignment.position}</span>
                <DotSeparator />
                <span>{assignment.estimatedDuration}</span>
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 lg:items-end">
              <Button
                className={cn(
                  typography.labelLg,
                  "h-11 w-full gap-2 rounded-md bg-brand-secondary px-4 text-white shadow-sm hover:bg-brand-secondary-hover focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card active:bg-brand-primary lg:h-10 lg:w-auto lg:px-6"
                )}
                onClick={() => {
                  setAcknowledged((list) => [...list, assignment.flightNumber])
                  setDetailOpen(false)
                  focusAfterAcknowledgeRef.current = true
                  toast.success(
                    `Asignación del vuelo ${assignment.flightNumber} marcada como enterada`
                  )
                }}
              >
                <AcceptIcon aria-hidden="true" className="size-4.5" />
                Enterado
              </Button>
              <Button
                variant="link"
                aria-expanded={detailOpen}
                aria-controls={detailId}
                onClick={() => setDetailOpen((open) => !open)}
                className={cn(
                  typography.labelSm,
                  "h-auto min-h-11 gap-1 self-center px-1 text-center whitespace-normal text-brand-secondary hover:text-brand-secondary-hover focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card lg:min-h-8 lg:self-end"
                )}
              >
                {detailOpen ? "Ocultar detalle" : "Ver detalle completo"}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div
            id={detailId}
            hidden={!detailOpen}
            className="mt-4 rounded-md bg-muted p-4"
          >
            <dl
              className={cn(
                typography.bodySm,
                "grid grid-cols-1 gap-4 text-foreground md:grid-cols-3"
              )}
            >
              <div className="flex flex-col gap-1">
                <dt
                  className={cn(
                    typography.labelSm,
                    "text-muted-foreground uppercase"
                  )}
                >
                  Motivo
                </dt>
                <dd className="font-medium">
                  {`${assignment.reason} Aprobada por ${assignment.approvedBy}. ${assignment.compliance}`}
                </dd>
              </div>
              {assignment.details.map((detail) => (
                <div key={detail.label} className="flex flex-col gap-1">
                  <dt
                    className={cn(
                      typography.labelSm,
                      "text-muted-foreground uppercase"
                    )}
                  >
                    {detail.label}
                  </dt>
                  <dd className="font-medium">{detail.value}</dd>
                  <dd className="text-muted-foreground">{detail.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default ReplacementAssignmentBanner
