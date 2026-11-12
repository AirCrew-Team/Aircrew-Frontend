import { useId } from "react"

import {
  CommuteIcon,
  ConfirmedIcon,
  LocationIcon,
  PhoneIcon,
  RadioChannelIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import ConfirmAssignmentDialog from "@/modules/recommendations/components/ConfirmAssignmentDialog"
import type {
  Candidate,
  ReplacementRequest,
} from "@/modules/recommendations/types/recommendations.types"

interface CandidateCardProps {
  candidate: Candidate
  request: ReplacementRequest
  chosen: boolean
  onChoose: () => void
  onAssign: () => void
}

const focusRing =
  "focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card"

// Iniciales del nombre y del último apellido (ej. «Juan Pablo Navarro» → «JN»).
const initialsOf = (fullName: string) => {
  const words = fullName.split(" ")
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""}`
}

// Tarjeta de un candidato. El elegido se despliega con la llegada, el contacto
// y «Confirmar asignación»; los demás solo muestran «Elegir».
const CandidateCard = ({
  candidate,
  request,
  chosen,
  onChoose,
  onAssign,
}: CandidateCardProps) => {
  const titleId = useId()

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-sm sm:p-5",
        chosen ? "border-brand-secondary" : "border-transparent"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              typography.labelLg,
              "flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-primary text-white"
            )}
          >
            {initialsOf(candidate.fullName)}
          </span>
          <div className="flex min-w-0 flex-col">
            <h3
              id={titleId}
              className={cn(typography.headlineSm, "text-brand-primary")}
            >
              {candidate.fullName}
            </h3>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              {candidate.rank} · Base {candidate.base}
            </p>
          </div>
        </div>
        <p
          className={cn(
            typography.labelSm,
            "rounded-full bg-brand-neutral px-2.5 py-1 text-brand-secondary"
          )}
        >
          <span className="sr-only">Afinidad </span>
          {candidate.affinity}% {candidate.affinityLabel}
        </p>
      </div>

      <ul
        className={cn(
          typography.bodySm,
          "grid grid-cols-1 gap-2 rounded-md bg-muted px-3 py-2.5 text-foreground sm:grid-cols-3"
        )}
      >
        {candidate.checks.map((check) => (
          <li key={check} className="flex items-center gap-2">
            <ConfirmedIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            {check}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            typography.bodySm,
            "flex min-w-0 items-center gap-2 text-muted-foreground"
          )}
        >
          <LocationIcon aria-hidden="true" className="size-4 shrink-0" />
          <span>
            {candidate.location} ·{" "}
            <strong className="font-semibold text-foreground">
              {candidate.minutesToRamp} min
            </strong>{" "}
            a rampa
          </span>
        </p>
        <Button
          aria-pressed={chosen}
          onClick={onChoose}
          className={cn(
            typography.labelLg,
            "h-11 gap-2 rounded-md px-4 lg:h-9",
            chosen
              ? "bg-brand-secondary text-white hover:bg-brand-secondary"
              : "bg-brand-neutral text-brand-primary hover:bg-brand-border",
            focusRing
          )}
        >
          {chosen ? "Elegido" : "Elegir"}
          {chosen ? (
            <ConfirmedIcon aria-hidden="true" className="size-4" />
          ) : null}
        </Button>
      </div>

      {chosen ? (
        <div className="flex flex-col gap-4 border-t border-brand-border pt-4">
          <dl
            className={cn(
              typography.bodySm,
              "grid grid-cols-1 gap-3 text-foreground sm:grid-cols-3"
            )}
          >
            <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2.5">
              <dt
                className={cn(
                  typography.labelSm,
                  "flex items-center gap-1.5 text-muted-foreground uppercase"
                )}
              >
                <CommuteIcon aria-hidden="true" className="size-4 shrink-0" />
                Llegada estimada a rampa
              </dt>
              <dd className={cn(typography.headlineSm, "text-brand-secondary")}>
                {candidate.minutesToRamp} min
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2.5">
              <dt
                className={cn(
                  typography.labelSm,
                  "flex items-center gap-1.5 text-muted-foreground uppercase"
                )}
              >
                <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
                Celular directo
              </dt>
              <dd>
                {/* El nombre accesible dice a quién se llama; incluye el número visible. */}
                <a
                  href={`tel:${candidate.phone.replace(/\s/g, "")}`}
                  aria-label={`Llamar a ${candidate.fullName}, ${candidate.phone}`}
                  className={cn(
                    typography.labelLg,
                    "inline-flex min-h-11 items-center rounded-sm text-brand-secondary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-6"
                  )}
                >
                  {candidate.phone}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2.5">
              <dt
                className={cn(
                  typography.labelSm,
                  "flex items-center gap-1.5 text-muted-foreground uppercase"
                )}
              >
                <RadioChannelIcon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
                Canal Standby
              </dt>
              <dd className={cn(typography.labelLg, "text-brand-primary")}>
                {candidate.radioChannel}
              </dd>
            </div>
          </dl>
          <ConfirmAssignmentDialog
            candidateName={candidate.fullName}
            position={request.position}
            flightNumber={request.flightNumber}
            onAssign={onAssign}
          />
        </div>
      ) : null}
    </article>
  )
}

export default CandidateCard
