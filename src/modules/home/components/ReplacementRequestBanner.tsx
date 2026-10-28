import { useId, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  AcceptIcon,
  ArrowRightIcon,
  ClockIcon,
  CloseIcon,
  DurationIcon,
  FlightIcon,
  PositionIcon,
  ReasonIcon,
  WarningIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getUrgentReplacementRequest } from "@/modules/home/data/home.data"
import type { ReplacementRequest } from "@/modules/home/types/home.types"

type Decision = "accepted" | "rejected"

// Textos de la referencia para cada diálogo de confirmación.
const DECISIONS: {
  decision: Decision
  trigger: string
  Icon: typeof AcceptIcon
  variant: "default" | "destructive"
  title: string
  confirm: string
  result: string
  describe: (request: ReplacementRequest) => string
}[] = [
  {
    decision: "accepted",
    trigger: "Aceptar",
    Icon: AcceptIcon,
    variant: "default",
    title: "Confirmar Aceptación de Reemplazo",
    confirm: "Confirmar Asignación",
    result: "Aceptaste",
    describe: (request) =>
      `¿Confirmas tu disposición inmediata para operar el vuelo ${request.flightNumber} ${request.origin.code} → ${request.destination.code} a las ${request.departureUtc} UTC? Esta acción notificará al despacho OCC y te cargará el itinerario en el EFB.`,
  },
  {
    decision: "rejected",
    trigger: "Rechazar",
    Icon: CloseIcon,
    variant: "destructive",
    title: "Rechazar Solicitud de Contingencia",
    confirm: "Confirmar Rechazo",
    result: "Rechazaste",
    describe: (request) =>
      `¿Deseas rechazar la solicitud de relevo para el vuelo ${request.flightNumber}? Se contactará automáticamente al siguiente oficial disponible en la lista de reserva.`,
  },
]

// Bloque 3: solicitud de reemplazo urgente. No se pinta si no hay solicitud.
const ReplacementRequestBanner = () => {
  const titleId = useId()
  const detailId = useId()
  const resultRef = useRef<HTMLParagraphElement>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [openDialog, setOpenDialog] = useState<Decision | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const {
    data: request,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["replacements", "urgent"],
    queryFn: getUrgentReplacementRequest,
  })

  if (request === null) return null

  const resolved = DECISIONS.find((item) => item.decision === decision)

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
        <h2
          className={cn(
            typography.labelSm,
            "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-sm bg-destructive/10 px-3 py-1 font-bold tracking-wider text-destructive uppercase"
          )}
        >
          <WarningIcon aria-hidden="true" className="size-4 shrink-0" />
          <span id={titleId}>Solicitud de reemplazo urgente</span>
          {request ? <span>• {request.timeRemaining} restantes</span> : null}
        </h2>
        {request ? (
          <span
            className={cn(
              typography.labelSm,
              "rounded-sm bg-brand-neutral px-2.5 py-0.5 text-brand-primary"
            )}
          >
            Vuelo {request.flightNumber}
          </span>
        ) : null}
      </div>

      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "mt-2 text-muted-foreground")}
        >
          Cargando solicitud de reemplazo…
        </p>
      ) : isError ? (
        <p
          role="alert"
          className={cn(typography.bodySm, "mt-2 text-destructive")}
        >
          No se pudo cargar la solicitud de reemplazo.
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className={cn(
                "flex flex-1 flex-col gap-2",
                resolved && "opacity-80"
              )}
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      typography.headlineMd,
                      "font-bold text-brand-primary"
                    )}
                  >
                    {request.origin.code}
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-brand-secondary"
                  />
                  <span
                    className={cn(
                      typography.headlineMd,
                      "font-bold text-brand-primary"
                    )}
                  >
                    {request.destination.code}
                  </span>
                  <span
                    className={cn(typography.bodySm, "text-muted-foreground")}
                  >
                    ({request.origin.name} → {request.destination.name})
                  </span>
                </p>
                <p
                  className={cn(
                    typography.labelMd,
                    "flex items-center gap-1.5 rounded-sm bg-brand-neutral px-2.5 py-1 text-foreground"
                  )}
                >
                  <ClockIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand-secondary"
                  />
                  <span>
                    STD:{" "}
                    <strong className="font-semibold text-brand-primary">
                      {request.departureUtc} UTC
                    </strong>{" "}
                    ({request.departureLocal} Local)
                  </span>
                </p>
              </div>

              <ul
                className={cn(
                  typography.bodySm,
                  "grid grid-cols-1 gap-x-4 gap-y-2 pt-1 text-foreground sm:grid-cols-2 md:grid-cols-3"
                )}
              >
                <li className="flex items-center gap-1.5">
                  <FlightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span>
                    Equipo: <strong>{request.aircraft}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-1.5">
                  <PositionIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span>
                    Posición: <strong>{request.position}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-1.5">
                  <DurationIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span>
                    Duración est.: <strong>{request.estimatedDuration}</strong>
                  </span>
                </li>
              </ul>

              <p
                className={cn(
                  typography.bodySm,
                  "mt-1 flex items-start gap-2 rounded-md bg-muted p-2 text-muted-foreground"
                )}
              >
                <ReasonIcon
                  aria-hidden="true"
                  className="size-4.5 shrink-0 text-muted-foreground"
                />
                <span>
                  <strong className="text-foreground">
                    Motivo de asignación:
                  </strong>{" "}
                  {request.reason} Solicitado y validado en sistema por{" "}
                  <span className="font-medium text-brand-primary">
                    {request.requestedBy}
                  </span>
                  . {request.compliance}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 lg:items-end">
              <div className="flex w-full items-center gap-2 lg:w-auto">
                {DECISIONS.map((item) => (
                  <AlertDialog
                    key={item.decision}
                    open={openDialog === item.decision}
                    onOpenChange={(open) =>
                      setOpenDialog(open ? item.decision : null)
                    }
                  >
                    <AlertDialogTrigger
                      disabled={decision !== null}
                      render={
                        <Button
                          variant={item.variant}
                          className={cn(
                            typography.labelLg,
                            "h-11 flex-1 gap-2 rounded-md px-4 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card lg:h-10 lg:flex-initial",
                            item.decision === "accepted"
                              ? "bg-brand-secondary text-white shadow-sm hover:bg-brand-secondary-hover active:bg-brand-primary lg:px-6"
                              : "bg-card text-destructive hover:bg-destructive/10"
                          )}
                        />
                      }
                    >
                      <item.Icon aria-hidden="true" className="size-4.5" />
                      {item.trigger}
                    </AlertDialogTrigger>
                    {/* Al confirmar, los botones quedan deshabilitados: el foco pasa al mensaje del resultado. */}
                    <AlertDialogContent
                      finalFocus={decision ? resultRef : true}
                    >
                      <AlertDialogHeader>
                        <AlertDialogTitle>{item.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {item.describe(request)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          className={cn(
                            typography.labelMd,
                            "h-11 rounded-md px-4 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-popover lg:h-9"
                          )}
                        >
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant={item.variant}
                          className={cn(
                            typography.labelMd,
                            "h-11 rounded-md px-4 text-white focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-popover lg:h-9",
                            item.decision === "accepted"
                              ? "bg-brand-secondary hover:bg-brand-secondary-hover"
                              : "bg-destructive hover:bg-destructive/90"
                          )}
                          onClick={() => {
                            setDecision(item.decision)
                            setOpenDialog(null)
                          }}
                        >
                          {item.confirm}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ))}
              </div>
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
                {detailOpen
                  ? "Ocultar Detalle de la Solicitud"
                  : "Ver Detalle Completo de la Solicitud"}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </div>
          </div>

          <p
            ref={resultRef}
            role="status"
            tabIndex={-1}
            className={cn(
              typography.labelLg,
              "mt-2 text-brand-primary empty:hidden focus-visible:outline-hidden"
            )}
          >
            {resolved
              ? `${resolved.result} la solicitud del vuelo ${request.flightNumber}`
              : null}
          </p>

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
              {request.details.map((detail) => (
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
      )}
    </section>
  )
}

export default ReplacementRequestBanner
