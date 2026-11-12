import { useId, useState } from "react"

import {
  CalendarIcon,
  DepartureIcon,
  DownloadIcon,
  LanguageIcon,
  LockIcon,
  LowVisibilityIcon,
  MedicalServiceIcon,
  PositionIcon,
  VerifiedIcon,
  ViewIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { LICENSE_COLUMNS_CLASS } from "@/modules/certifications/components/columns"
import type {
  Certification,
  CertificationKind,
  CertificationStatus,
} from "@/modules/certifications/types/certifications.types"
import {
  formatShortDate,
  getExpiryInfo,
} from "@/modules/certifications/utils/expiry"

const KIND_ICON: Record<CertificationKind, typeof PositionIcon> = {
  license: PositionIcon,
  medical: MedicalServiceIcon,
  typeRating: DepartureIcon,
  language: LanguageIcon,
  lowVisibility: LowVisibilityIcon,
}

const STATUS_LABEL: Record<CertificationStatus, string> = {
  vigente: "Vigente",
  proximo: "Próximo vencimiento",
  vencido: "Vencido",
  vitalicio: "Vitalicio",
}

// Referencia: vigente y vitalicio en secondary-fixed (azul), próximo en gris con borde
// (se distingue sobre la fila resaltada) y vencido en error-container. El punto usa
// el mismo color por estado que el resumen.
const STATUS_CLASS: Record<CertificationStatus, string> = {
  vigente:
    "border-transparent bg-brand-border text-brand-primary before:bg-brand-secondary",
  proximo:
    "border-brand-border-strong bg-brand-neutral text-foreground before:bg-brand-tertiary",
  vencido:
    "border-transparent bg-error-container text-on-error-container before:bg-destructive",
  vitalicio:
    "border-transparent bg-brand-border text-brand-primary before:bg-brand-secondary",
}

// Línea bajo la fecha (spec, D3).
const daysLine = (status: CertificationStatus, days: number | null) => {
  if (status === "vitalicio" || days === null) return "No expira"
  if (status === "vencido") {
    return `Vencido hace ${-days} ${days === -1 ? "día" : "días"}`
  }
  if (status === "proximo") {
    if (days === 0) return "Vence hoy"
    return days === 1 ? "Resta 1 día" : `Restan ${days} días`
  }
  return `${days} días restantes`
}

// Etiqueta de cada campo: visible en la tarjeta apilada; desde lg la sustituye la fila de encabezados.
const fieldLabelClass = cn(
  typography.labelSm,
  "tracking-wider text-muted-foreground uppercase lg:sr-only"
)

interface CertificationItemProps {
  certification: Certification
}

// I: una licencia. El botón despliega su detalle debajo de la fila, dentro del article.
const CertificationItem = ({ certification }: CertificationItemProps) => {
  const detailId = useId()
  const [open, setOpen] = useState(false)
  const { status, days } = getExpiryInfo(certification.expiresAt, new Date())
  const { appointment } = certification
  const KindIcon = KIND_ICON[certification.kind]
  const ToggleIcon = appointment ? CalendarIcon : ViewIcon
  const needsAttention = status === "proximo" || status === "vencido"
  const toggleText = `${open ? "Ocultar" : "Ver"} ${appointment ? "cita agendada" : "certificado"}`
  const details = appointment
    ? [
        {
          label: "Fecha del turno",
          value: `${formatShortDate(appointment.date)} • ${appointment.time}`,
        },
        ...certification.details,
      ]
    : certification.details

  // Por debajo de lg, cada licencia es una tarjeta apilada; desde lg, una fila de la tabla
  // (el ul de CertificationsBrowser pone la tarjeta y los separadores).
  return (
    <article
      className={cn(
        "grid grid-cols-1 gap-4 rounded-xl border border-brand-border/70 p-4 shadow-sm sm:grid-cols-2 sm:p-5 lg:items-center lg:rounded-none lg:border-0 lg:px-6 lg:py-4 lg:shadow-none",
        LICENSE_COLUMNS_CLASS,
        // Fila resaltada (referencia: la médica, surface-container-low/40).
        needsAttention ? "bg-muted lg:bg-muted/40" : "bg-card"
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:col-span-2 lg:col-span-1 lg:items-center">
        {/* Cuadro de 36 px con el padding del propio svg: sin envoltorio en el DOM. */}
        <KindIcon
          aria-hidden="true"
          className="size-9 shrink-0 rounded-sm bg-brand-neutral p-2 text-brand-secondary"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3
            className={cn(
              typography.labelLg,
              "font-bold break-words text-foreground"
            )}
          >
            {certification.name}
          </h3>
          <p
            className={cn(
              typography.labelSm,
              "break-words text-muted-foreground tabular-nums"
            )}
          >
            {certification.code}
          </p>
        </div>
      </div>

      <p className="flex min-w-0 flex-col gap-0.5">
        <span className={fieldLabelClass}>Organismo:</span>{" "}
        <span
          className={cn(
            typography.bodySm,
            "font-medium break-words text-foreground"
          )}
        >
          {certification.issuer}
        </span>{" "}
        <span
          className={cn(typography.bodySm, "break-words text-muted-foreground")}
        >
          <span className="sr-only">Alcance: </span>
          {certification.scope}
        </span>
      </p>

      <p className="flex min-w-0 flex-col gap-0.5">
        <span className={fieldLabelClass}>Vencimiento:</span>{" "}
        <span
          className={cn(
            typography.labelLg,
            "tabular-nums",
            status === "proximo"
              ? "font-bold text-brand-secondary"
              : "text-foreground"
          )}
        >
          {certification.expiresAt
            ? formatShortDate(certification.expiresAt)
            : "Permanente"}
        </span>
        {/* Pausa para el lector entre la fecha y los días; visualmente van en dos líneas. */}
        <span className="sr-only">, </span>
        <span
          className={cn(
            typography.bodySm,
            status === "vencido"
              ? "font-semibold text-destructive"
              : status === "proximo"
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
          )}
        >
          {daysLine(status, days)}
        </span>
      </p>

      <p className="flex min-w-0 flex-col items-start gap-1">
        <span className={fieldLabelClass}>Estado:</span>{" "}
        {/* Punto con ::before (sin elemento ni texto en el DOM). Borde para colores forzados. */}
        <span
          className={cn(
            typography.labelSm,
            "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 before:size-1.5 before:shrink-0 before:rounded-full",
            STATUS_CLASS[status]
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </p>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={fieldLabelClass}>Observación:</span>{" "}
        {appointment ? (
          <>
            <p
              className={cn(
                typography.labelMd,
                "flex items-start gap-1 font-semibold text-brand-secondary"
              )}
            >
              <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
              Turno agendado: {formatShortDate(appointment.date)}
            </p>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              {appointment.time} • {appointment.center}
            </p>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              {appointment.location}
            </p>
          </>
        ) : (
          <p
            className={cn(
              typography.bodySm,
              "flex items-start gap-1.5 text-muted-foreground"
            )}
          >
            <VerifiedIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            {certification.observation}
          </p>
        )}
      </div>

      {/* aria-controls solo abierto: cerrado, el detalle no está montado. */}
      {/* En la columna estrecha de lg el texto se parte en dos líneas, como en la referencia. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        aria-label={`${toggleText} de ${certification.name}`}
        onClick={() => setOpen(!open)}
        className={cn(
          typography.labelLg,
          "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border px-4 py-2 text-center transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden motion-reduce:transition-none sm:col-span-2 sm:justify-self-start lg:col-span-1 lg:min-h-9 lg:w-full lg:justify-self-end lg:px-3 lg:py-1.5 lg:text-xs lg:leading-4",
          needsAttention
            ? "focus-visible:ring-offset-muted"
            : "focus-visible:ring-offset-card",
          appointment
            ? "border-transparent bg-brand-secondary text-white shadow-sm hover:bg-brand-secondary-hover active:bg-brand-primary"
            : "border-transparent bg-brand-neutral text-brand-primary hover:bg-brand-border active:bg-brand-border-strong"
        )}
      >
        <ToggleIcon aria-hidden="true" className="size-4 shrink-0" />
        {toggleText}
      </button>

      {open ? (
        <div
          id={detailId}
          className="flex flex-col gap-4 border-t border-brand-border/70 pt-4 sm:col-span-2 lg:col-span-6"
        >
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {details.map((detail, index) => (
              <div
                key={`${detail.label}-${index}`}
                className="flex min-w-0 flex-col gap-0.5"
              >
                <dt
                  className={cn(
                    typography.labelSm,
                    "tracking-wider text-muted-foreground uppercase"
                  )}
                >
                  {detail.label}
                </dt>
                <dd className={cn(typography.bodyMd, "text-foreground")}>
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
          {appointment ? null : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className={cn(
                  typography.bodySm,
                  "flex min-w-0 items-start gap-1.5 text-muted-foreground"
                )}
              >
                <LockIcon aria-hidden="true" className="size-4 shrink-0" />
                Documento firmado electrónicamente bajo estándar Aerocivil PKI.
              </p>
              {/* aria-disabled: borde e ícono atenuados (exentos de 1.4.11), sin hover. */}
              <button
                type="button"
                aria-disabled="true"
                aria-label="Descargar PDF, próximamente"
                className={cn(
                  typography.labelLg,
                  "inline-flex min-h-11 cursor-not-allowed flex-wrap items-center justify-center gap-x-1.5 rounded-sm border border-brand-border bg-card px-4 py-2 text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden lg:min-h-9",
                  needsAttention
                    ? "focus-visible:ring-offset-muted"
                    : "focus-visible:ring-offset-card"
                )}
              >
                <DownloadIcon
                  aria-hidden="true"
                  className="size-4 opacity-60"
                />
                Descargar PDF{" "}
                <span className={cn(typography.labelSm, "uppercase")}>
                  Próximamente
                </span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </article>
  )
}

export default CertificationItem
