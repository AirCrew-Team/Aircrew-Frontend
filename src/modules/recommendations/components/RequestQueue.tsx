import { useId, type RefObject } from "react"

import { RecalculatingIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { ReplacementRequest } from "@/modules/recommendations/types/recommendations.types"

interface RequestQueueProps {
  // Solicitudes que siguen en la cola, ordenadas por urgencia.
  requests: ReplacementRequest[]
  recalculatingIds: string[]
  selectedId?: string
  // Se engancha al tab seleccionado para devolverle el foco tras una acción.
  selectedTabRef: RefObject<HTMLButtonElement | null>
}

// Cola de solicitudes pendientes: un tab vertical por solicitud (va dentro de Tabs).
const RequestQueue = ({
  requests,
  recalculatingIds,
  selectedId,
  selectedTabRef,
}: RequestQueueProps) => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 shadow-sm sm:p-5"
    >
      <h2
        id={titleId}
        className={cn(typography.headlineMd, "text-brand-primary")}
      >
        Pendientes ({requests.length})
      </h2>
      <TabsList
        aria-labelledby={titleId}
        className="flex h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0"
      >
        {requests.map((request) => {
          const recalculating = recalculatingIds.includes(request.id)
          return (
            <TabsTrigger
              key={request.id}
              value={request.id}
              ref={request.id === selectedId ? selectedTabRef : undefined}
              className={cn(
                typography.bodySm,
                // Inactiva en muted-foreground; la activa con borde y fondo de marca.
                // En colores forzados el fondo desaparece: la activa se subraya.
                "h-auto min-h-11 w-full flex-none flex-col items-start justify-start gap-0.5 rounded-md border border-brand-border bg-card px-3 py-2.5 text-left whitespace-normal text-muted-foreground transition-colors not-data-active:hover:bg-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none data-active:border-brand-secondary data-active:bg-brand-neutral data-active:text-foreground forced-colors:data-active:underline forced-colors:data-active:decoration-2 forced-colors:data-active:underline-offset-4"
              )}
            >
              <span
                className={cn(
                  typography.labelLg,
                  "font-bold text-brand-primary"
                )}
              >
                {request.flightNumber}
              </span>{" "}
              <span>
                {request.origin.code} → {request.destination.code}
              </span>{" "}
              <span>{request.position}</span>{" "}
              <span className="font-semibold text-foreground">
                Sale en {request.timeToDeparture}
              </span>
              {recalculating ? (
                <>
                  {" "}
                  <span
                    className={cn(
                      typography.labelSm,
                      "mt-1 inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-brand-secondary"
                    )}
                  >
                    <RecalculatingIcon
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Recalculando sugerencias
                  </span>
                </>
              ) : null}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </section>
  )
}

export default RequestQueue
