import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import { AvailabilityIcon, InfoIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewStatus } from "@/modules/home/data/home.data"
import type { Availability } from "@/modules/home/types/home.types"

const LABELS: Record<Availability, string> = {
  disponible: "Disponible",
  vacaciones: "Vacaciones",
  incapacitado: "Incapacitado",
}

// Bloque 2: estado de asignación de solo lectura. Lo asigna OCC; el tripulante no lo cambia.
const AssignmentStatus = () => {
  const titleId = useId()
  const { data, isPending, isError } = useQuery({
    queryKey: ["crew", "status"],
    queryFn: getCrewStatus,
  })

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p
          className={cn(
            typography.labelLg,
            "flex items-center gap-2 text-foreground"
          )}
        >
          <AvailabilityIcon
            aria-hidden="true"
            className="size-5 shrink-0 text-brand-secondary"
          />
          <span id={titleId}>Estado de asignación</span>
        </p>
        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "text-muted-foreground")}
          >
            Cargando estado de asignación…
          </p>
        ) : isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            No se pudo cargar el estado de asignación.
          </p>
        ) : (
          <p
            className={cn(
              typography.labelMd,
              "flex w-fit items-center gap-1.5 rounded-sm bg-brand-neutral px-3 py-1.5 whitespace-nowrap text-brand-primary"
            )}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-brand-secondary"
            />
            {LABELS[data.availability]}
          </p>
        )}
      </div>
      <p
        className={cn(
          typography.bodySm,
          "flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-muted-foreground"
        )}
      >
        <InfoIcon
          aria-hidden="true"
          className="size-4.5 shrink-0 text-brand-secondary"
        />
        Lo asigna OCC Despacho y determina tus asignaciones y relevos de
        contingencia.
      </p>
    </section>
  )
}

export default AssignmentStatus
