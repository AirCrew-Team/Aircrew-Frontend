import { useId } from "react"

import type { Absence } from "@/App/types/absences.types"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import AbsenceStatusChip from "@/modules/absenceTracking/components/AbsenceStatusChip"
import {
  absenceDaysLabel,
  formatDay,
  formatUtcDateTime,
  noDatesLabel,
} from "@/modules/shared/absences/absenceDates"
import { reasonLabel } from "@/modules/shared/absences/absenceReasons"

interface CrewAbsenceCardProps {
  absence: Absence
  onShowDetail: () => void
}

// Una ausencia real (sesión real): tripulante, fechas, cargo y motivo, reporte y el botón
// del detalle. Sin las líneas de la IA ni el historial, que no tienen datos reales.
const CrewAbsenceCard = ({ absence, onShowDetail }: CrewAbsenceCardProps) => {
  const titleId = useId()
  const { start_date: start, end_date: end } = absence
  const name = absence.crew_name ?? "Tripulante sin nombre"

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={titleId}
          className={cn(typography.headlineSm, "min-w-0 text-brand-primary")}
        >
          {name}
        </h3>
        <AbsenceStatusChip status={absence.status} />
      </div>

      <p
        className={cn(
          typography.labelLg,
          "rounded-md bg-muted px-3 py-2 text-foreground tabular-nums"
        )}
      >
        {start && end
          ? `${formatDay(start)} – ${formatDay(end)} · ${absenceDaysLabel(start, end)}`
          : noDatesLabel(absence.flight_number)}
      </p>

      <div
        className={cn(
          typography.bodyMd,
          "flex flex-col gap-0.5 text-muted-foreground"
        )}
      >
        <p>
          <strong className="font-semibold text-foreground">
            {absence.position ?? "—"}
          </strong>{" "}
          · {reasonLabel(absence.reason)}
        </p>
        <p>{`Reportó: ${name} · ${formatUtcDateTime(absence.created_at)}`}</p>
      </div>

      <button
        type="button"
        aria-label={`Ver detalle de ${name}`}
        onClick={onShowDetail}
        className={cn(
          typography.labelLg,
          "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-secondary px-4 py-2 text-center text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-primary motion-reduce:transition-none lg:min-h-9"
        )}
      >
        Ver detalle
      </button>
    </article>
  )
}

export default CrewAbsenceCard
