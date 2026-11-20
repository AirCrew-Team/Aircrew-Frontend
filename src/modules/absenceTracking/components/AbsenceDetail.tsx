import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { getAbsenceById } from "@/App/actions/absences/absences.actions"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import AbsenceStatusChip from "@/modules/absenceTracking/components/AbsenceStatusChip"
import AttachmentPreview from "@/modules/absenceTracking/components/AttachmentPreview"
import {
  absenceDaysLabel,
  formatDay,
  formatUtcDateTime,
  noDatesLabel,
} from "@/modules/shared/absences/absenceDates"
import { reasonLabel } from "@/modules/shared/absences/absenceReasons"

interface AbsenceDetailProps {
  id: string
}

interface RowProps {
  term: string
  className?: string
  children: ReactNode
}

const Row = ({ term, className, children }: RowProps) => (
  <div className={cn("flex flex-col gap-0.5", className)}>
    <dt className={cn(typography.labelMd, "text-muted-foreground")}>{term}</dt>
    <dd className={cn(typography.bodyMd, "break-words text-foreground")}>
      {children}
    </dd>
  </div>
)

// Contenido del popup «Ver detalle»: se monta al abrirlo, así el detalle se pide entonces.
const AbsenceDetail = ({ id }: AbsenceDetailProps) => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["absences", "detail", id],
    queryFn: () => getAbsenceById(id),
    // Un 404 (ausencia que ya no existe) no se arregla reintentando.
    retry: false,
  })

  if (isPending) {
    return (
      <p
        role="status"
        className={cn(typography.bodyMd, "text-muted-foreground")}
      >
        Cargando detalle de la ausencia…
      </p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className={cn(typography.bodyMd, "text-destructive")}>
        No se pudo cargar el detalle de la ausencia.
      </p>
    )
  }

  // Tarjeta blanca sobre el fondo del popup, como en los demás detalles: así el bloque
  // «Comprobante» (bg-muted) sigue destacando.
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <p className={cn(typography.headlineSm, "text-brand-primary")}>
            {data.crew_name ?? "Tripulante sin nombre"}
          </p>
          <p className={cn(typography.bodyMd, "text-muted-foreground")}>
            {`${data.employee_code ?? "—"} · ${data.position ?? "—"}`}
          </p>
        </div>
        <AbsenceStatusChip status={data.status} />
      </div>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Row term="Motivo" className="sm:col-span-3">
          {reasonLabel(data.reason)}
        </Row>
        {data.start_date && data.end_date ? (
          <>
            <Row term="Desde">{formatDay(data.start_date)}</Row>
            <Row term="Hasta">{formatDay(data.end_date)}</Row>
            <Row term="Duración">
              {absenceDaysLabel(data.start_date, data.end_date)}
            </Row>
          </>
        ) : (
          <Row term="Fechas" className="sm:col-span-3">
            {noDatesLabel(data.flight_number)}
          </Row>
        )}
        <Row term="Observaciones" className="sm:col-span-3">
          {data.notes || "Sin observaciones"}
        </Row>
        <Row term="Reportada" className="sm:col-span-3">
          {formatUtcDateTime(data.created_at)}
        </Row>
        {data.status === "covered" ? (
          <>
            <Row term="Reemplazo" className="sm:col-span-2">
              {data.replacement_name ?? "—"}
            </Row>
            <Row term="Cubierta">
              {data.covered_at ? formatUtcDateTime(data.covered_at) : "—"}
            </Row>
          </>
        ) : null}
      </dl>

      <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
        <p className={cn(typography.labelMd, "text-muted-foreground")}>
          Comprobante
        </p>
        {data.attachment ? (
          <AttachmentPreview id={id} attachment={data.attachment} />
        ) : (
          <p className={cn(typography.bodyMd, "text-foreground")}>
            Sin comprobante adjunto
          </p>
        )}
      </div>
    </div>
  )
}

export default AbsenceDetail
