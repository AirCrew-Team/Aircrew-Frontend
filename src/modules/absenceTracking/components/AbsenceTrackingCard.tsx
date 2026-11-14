import { useId, useState } from "react"
import { Link } from "react-router"

import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  ConfirmedIcon,
  CriticalAlertIcon,
  RecalculatingIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { TrackedAbsence } from "@/modules/absenceTracking/types/absenceTracking.types"
import { PATHS } from "@/routes/paths"

interface AbsenceTrackingCardProps {
  absence: TrackedAbsence
}

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden"

// Iniciales del nombre y del último apellido (ej. «Laura Gómez» → «LG»), como en CandidateCard.
const initialsOf = (fullName: string) => {
  const words = fullName.split(" ")
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""}`
}

// Etiqueta de estado: siempre con texto (el color solo acompaña).
const statusChip = (absence: TrackedAbsence) => {
  switch (absence.status) {
    case "por_aprobar":
      if (absence.suggestions === "buscando") {
        return {
          label: "La IA está buscando",
          Icon: RecalculatingIcon,
          className: "bg-brand-neutral text-brand-secondary",
        }
      }
      if (absence.suggestions === "sin_candidatos") {
        return {
          label: "Sin candidatos",
          Icon: CriticalAlertIcon,
          className: "bg-error-container text-on-error-container",
        }
      }
      return {
        label: `Sale en ${absence.timeToDeparture}`,
        Icon: ClockIcon,
        className: "bg-brand-neutral text-brand-primary",
      }
    case "esperando_confirmacion":
      return {
        label: `Plazo hasta ${absence.deadlineUtc}`,
        Icon: ClockIcon,
        className: "bg-brand-neutral text-brand-secondary",
      }
    case "cubierta":
      return {
        label: `Confirmó ${absence.confirmedAtUtc}`,
        Icon: ConfirmedIcon,
        className: "bg-brand-neutral text-brand-primary",
      }
  }
}

// Una ausencia: vuelo, ruta, cargo y motivo, reporte, estado del reemplazo y su historial.
const AbsenceTrackingCard = ({ absence }: AbsenceTrackingCardProps) => {
  const titleId = useId()
  const historyId = useId()
  const [open, setOpen] = useState(false)
  const chip = statusChip(absence)
  // «Buscando» no tiene aún nada que revisar: ni resumen de la IA ni enlace.
  const hasSuggestionsResult =
    absence.status === "por_aprobar" && absence.suggestions !== "buscando"

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={titleId}
          className={cn(typography.headlineSm, "text-brand-primary")}
        >
          {absence.flightNumber}
        </h3>
        <p
          className={cn(
            typography.labelSm,
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
            chip.className
          )}
        >
          <chip.Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {chip.label}
        </p>
      </div>

      <p
        className={cn(
          typography.labelLg,
          "flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-md bg-muted px-3 py-2 text-foreground"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {absence.origin}{" "}
          <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">a</span> {absence.destination}
        </span>{" "}
        <span className="font-normal text-muted-foreground tabular-nums">
          STD {absence.departureUtc}
        </span>
      </p>

      <div
        className={cn(
          typography.bodyMd,
          "flex flex-col gap-0.5 text-muted-foreground"
        )}
      >
        <p>
          <strong className="font-semibold text-foreground">
            {absence.position}
          </strong>{" "}
          · {absence.reason}
        </p>
        <p>
          Reportó: {absence.reportedBy} · {absence.reportedAtUtc}
        </p>
      </div>

      {absence.status === "por_aprobar" &&
      absence.suggestions !== "buscando" ? (
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          {absence.suggestions === "listas"
            ? `La IA propuso ${absence.candidateCount} ${absence.candidateCount === 1 ? "candidato" : "candidatos"}`
            : "Ningún tripulante cumple los requisitos."}
        </p>
      ) : null}

      {absence.status !== "por_aprobar" ? (
        <>
          <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
            <span
              aria-hidden="true"
              className={cn(
                typography.labelMd,
                "flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-primary font-semibold text-white"
              )}
            >
              {initialsOf(absence.replacement.fullName)}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className={cn(typography.labelLg, "text-foreground")}>
                {absence.replacement.fullName}
              </p>
              <p className={cn(typography.bodySm, "text-muted-foreground")}>
                {absence.position} · {absence.replacement.option}.ª opción
              </p>
            </div>
          </div>
          <p
            className={cn(
              typography.bodySm,
              "flex flex-wrap justify-between gap-x-2 text-muted-foreground"
            )}
          >
            <span>Aprobó:</span>{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {absence.approval.by} · {absence.approval.atUtc}
            </span>
          </p>
        </>
      ) : null}

      {hasSuggestionsResult ? (
        <Link
          to={PATHS.superVisor.solicitudesReemplazo}
          aria-describedby={titleId}
          className={cn(
            typography.labelLg,
            "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-secondary px-4 py-2 text-center text-white transition-colors hover:bg-brand-secondary-hover active:bg-brand-primary motion-reduce:transition-none lg:min-h-9",
            focusRing
          )}
        >
          Revisar en Recomendaciones
        </Link>
      ) : null}

      {/* aria-controls solo abierto: cerrado, el historial no está montado. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? historyId : undefined}
        aria-label={`${open ? "Ocultar historial" : "Ver historial"} de ${absence.flightNumber}`}
        onClick={() => setOpen(!open)}
        className={cn(
          typography.labelLg,
          "inline-flex min-h-11 items-center gap-1 self-start rounded-md text-brand-secondary underline-offset-4 hover:underline active:text-brand-secondary-hover lg:min-h-9",
          focusRing
        )}
      >
        {open ? "Ocultar historial" : "Ver historial"}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transition-transform motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <ol
          id={historyId}
          role="list"
          aria-label={`Historial de ${absence.flightNumber}`}
          className={cn(
            typography.bodySm,
            "ml-1.5 flex flex-col gap-2 border-l-2 border-brand-border pl-4 text-foreground"
          )}
        >
          {absence.timeline.map((event, index) => (
            <li key={`${event.atUtc}-${index}`} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  // Centrado sobre el borde: pl-4 + border-l-2 dejan su eje a 17 px del li.
                  "absolute top-0.5 -left-5.5 size-2.5 rounded-full",
                  event.missed ? "bg-destructive" : "bg-brand-secondary"
                )}
              />
              <time
                dateTime={event.atUtc}
                className="mr-1.5 text-muted-foreground tabular-nums"
              >
                {event.atUtc}
              </time>{" "}
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  )
}

export default AbsenceTrackingCard
