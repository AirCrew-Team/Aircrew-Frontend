import { useId, useState } from "react"
import { Link } from "react-router"

import {
  AbsenceIcon,
  ArrowRightIcon,
  AvailabilityIcon,
  ChevronDownIcon,
  ClockIcon,
  ConfirmedIcon,
  DepartureIcon,
  FlightIcon,
  SecurityIcon,
  WarningIcon,
} from "@/App/utils/icons"
import { initialsOf } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type {
  CrewMember,
  FlightRef,
} from "@/modules/shiftCrew/types/shiftCrew.types"
import { PATHS } from "@/routes/paths"

interface CrewMemberCardProps {
  member: CrewMember
}

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden"

const linkButtonClass = cn(
  typography.labelLg,
  "inline-flex min-h-11 items-center gap-1 rounded-md text-brand-secondary underline-offset-4 hover:underline active:text-brand-secondary-hover lg:min-h-9",
  focusRing
)

// Etiqueta de estado: siempre con texto (el color solo acompaña).
const STATUS_CHIPS = {
  guardia: {
    label: "De guardia",
    Icon: SecurityIcon,
    className: "bg-brand-neutral text-brand-secondary",
  },
  en_vuelo: {
    label: "En vuelo",
    Icon: FlightIcon,
    className: "bg-brand-neutral text-brand-primary",
  },
  programado: {
    label: "Programado",
    Icon: DepartureIcon,
    className: "bg-brand-neutral text-brand-primary",
  },
  descanso: {
    label: "En descanso",
    Icon: ClockIcon,
    className: "bg-brand-neutral text-brand-primary",
  },
  ausente: {
    label: "Ausente",
    Icon: AbsenceIcon,
    className: "bg-error-container text-on-error-container",
  },
  sin_asignar: {
    label: "Sin asignación",
    Icon: AvailabilityIcon,
    className: "bg-brand-neutral text-brand-primary",
  },
}

// «AV-8805 · BOG a CUN»: la flecha es decorativa y el lector oye « a ».
const route = (flight: FlightRef) => (
  <>
    {flight.flightNumber} · {flight.origin}{" "}
    <ArrowRightIcon aria-hidden="true" className="inline size-3.5 shrink-0" />
    <span className="sr-only">a</span> {flight.destination}
  </>
)

// Línea principal y, salvo en descanso y sin asignación, la secundaria del bloque de contexto.
const contextLines = (member: CrewMember) => {
  switch (member.status) {
    case "guardia":
      return {
        main: member.location,
        secondary:
          member.minutesToRamp === null
            ? "tiempo a rampa sin dato"
            : `a ${member.minutesToRamp} min de rampa`,
      }
    case "en_vuelo":
      return {
        main: route(member.flight),
        secondary: `llega ${member.arrivalUtc}`,
      }
    case "programado":
      return {
        main: route(member.flight),
        secondary: `presentación ${member.reportUtc}`,
      }
    case "descanso":
      return { main: `Descanso hasta ${member.restUntilUtc}`, secondary: null }
    case "ausente":
      return {
        main: member.reason,
        secondary: member.flight?.flightNumber ?? null,
      }
    case "sin_asignar":
      return { main: "Sin vuelo ni guardia en el turno", secondary: null }
  }
}

// T: un tripulante con su estado, su contexto y el detalle desplegable de contacto.
const CrewMemberCard = ({ member }: CrewMemberCardProps) => {
  const titleId = useId()
  const detailId = useId()
  const [open, setOpen] = useState(false)
  const chip = STATUS_CHIPS[member.status]
  const context = contextLines(member)
  const certification = member.expiringCertification

  return (
    <article
      aria-labelledby={titleId}
      className="@container flex min-w-0 flex-col gap-3 rounded-xl bg-card p-4 shadow-sm"
    >
      {/* Por ancho de la tarjeta, no del viewport: con menos de 320 px útiles (móvil y
          md a 2 columnas) la etiqueta baja bajo el nombre; desde ahí va arriba a la derecha. */}
      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 @xs:grid-cols-[auto_1fr_auto]">
        <span
          aria-hidden="true"
          className={cn(
            typography.labelLg,
            "flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-primary text-white"
          )}
        >
          {initialsOf(member.fullName)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h3
            id={titleId}
            className={cn(typography.headlineSm, "text-brand-primary")}
          >
            {member.fullName}
          </h3>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            {member.position}
          </p>
        </div>
        <p
          className={cn(
            typography.labelSm,
            "col-start-2 inline-flex items-center gap-1 justify-self-start rounded-full px-2.5 py-1 whitespace-nowrap @xs:col-start-3 @xs:row-start-1",
            chip.className
          )}
        >
          <chip.Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {chip.label}
        </p>
      </div>

      <div className="flex flex-col gap-0.5 rounded-md bg-muted px-3 py-2">
        <p
          className={cn(
            typography.labelLg,
            "flex flex-wrap items-center gap-x-1 text-foreground"
          )}
        >
          {context.main}
        </p>
        {context.secondary ? (
          <p
            className={cn(
              typography.bodySm,
              "text-muted-foreground tabular-nums"
            )}
          >
            {context.secondary}
          </p>
        ) : null}
      </div>

      {member.status === "guardia" ? (
        member.replacementBlocker === null ? (
          <p
            className={cn(
              typography.labelMd,
              "flex items-start gap-1.5 font-semibold text-brand-secondary"
            )}
          >
            <ConfirmedIcon aria-hidden="true" className="size-4 shrink-0" />
            Disponible para reemplazos
          </p>
        ) : (
          <p
            className={cn(
              typography.labelMd,
              "flex items-start gap-1.5 font-semibold text-muted-foreground"
            )}
          >
            <WarningIcon aria-hidden="true" className="size-4 shrink-0" />
            {`No disponible: ${member.replacementBlocker}`}
          </p>
        )
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4">
        {/* aria-controls solo abierto: cerrado, el detalle no está montado. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? detailId : undefined}
          aria-label={`${open ? "Ocultar detalle" : "Ver detalle"} de ${member.fullName}`}
          onClick={() => setOpen(!open)}
          className={linkButtonClass}
        >
          {open ? "Ocultar detalle" : "Ver detalle"}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 transition-transform motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
        {member.status === "ausente" ? (
          <Link
            to={PATHS.superVisor.ausencias}
            aria-describedby={titleId}
            className={linkButtonClass}
          >
            Ver en Ausencias
            <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        ) : null}
      </div>

      {open ? (
        <dl
          id={detailId}
          className={cn(
            typography.bodySm,
            "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-brand-border pt-2.5"
          )}
        >
          <dt className="text-muted-foreground">Teléfono</dt>
          <dd className="text-right font-semibold text-foreground tabular-nums">
            {member.phone}
          </dd>
          <dt className="text-muted-foreground">Canal de radio</dt>
          <dd className="text-right font-semibold text-foreground">
            {member.radioChannel}
          </dd>
          <dt className="text-muted-foreground">Certificaciones</dt>
          <dd className="text-right font-semibold text-foreground">
            {certification
              ? `${certification.name} vence en ${certification.daysLeft} días`
              : "Al día"}
          </dd>
          {member.status === "guardia" ? (
            <>
              <dt className="text-muted-foreground">Guardia</dt>
              <dd className="text-right font-semibold text-foreground tabular-nums">
                {`Hasta ${member.guardUntilUtc}`}
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </article>
  )
}

export default CrewMemberCard
