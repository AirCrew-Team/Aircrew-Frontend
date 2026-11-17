import { useId, type ComponentProps, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import type { FieldErrors, UseFormRegister } from "react-hook-form"

import {
  ContactIcon,
  DurationIcon,
  HomePinIcon,
  MailIcon,
  PhoneIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewProfile } from "@/modules/profile/data/profile.data"
import type { ProfileFormValues } from "@/modules/profile/schemas/profile.schema"

interface ContactFieldProps extends ComponentProps<"input"> {
  label: string
  help: string
  icon: ReactNode
  error?: string
}

// Campo con label, ícono, texto de ayuda y error enlazados con aria-describedby.
const ContactField = ({
  label,
  help,
  icon,
  error,
  required,
  ...inputProps
}: ContactFieldProps) => {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className={cn(typography.labelMd, "font-semibold text-brand-primary")}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {/* Error: borde de 2 px además del color, para que se note también en colores forzados. */}
        <input
          id={id}
          type="text"
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          className={cn(
            typography.bodyMd,
            "min-h-11 w-full min-w-0 truncate rounded-sm border border-muted-foreground/70 bg-card py-2 pr-3 pl-10 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground read-only:cursor-not-allowed read-only:border-brand-border read-only:bg-muted read-only:text-foreground read-only:shadow-none focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none lg:min-h-10"
          )}
          {...inputProps}
        />
      </div>
      <p id={helpId} className={cn(typography.bodySm, "text-muted-foreground")}>
        {help}
      </p>
      {error ? (
        <p
          id={errorId}
          className={cn(typography.bodySm, "font-medium text-destructive")}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface ContactSectionProps {
  userId: string
  isCrew: boolean
  email: string
  register: UseFormRegister<ProfileFormValues>
  errors: FieldErrors<ProfileFormValues>
}

// F1 (común, editable): contacto operativo. El tripulante ve además la estimación al hub.
const ContactSection = ({
  userId,
  isCrew,
  email,
  register,
  errors,
}: ContactSectionProps) => {
  const titleId = useId()
  const crew = useQuery({
    queryKey: ["profile", "crew", userId],
    queryFn: () => getCrewProfile(userId),
    enabled: isCrew,
  })

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="-mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-xl border-b border-brand-neutral bg-background px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-border text-brand-primary">
            <ContactIcon aria-hidden="true" className="size-4.5" />
          </span>
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "min-w-0 font-bold text-brand-primary"
            )}
          >
            1. Información de Contacto Operativo (Editable)
          </h2>
        </div>
        {isCrew ? (
          <p
            className={cn(
              typography.labelSm,
              "shrink-0 rounded-sm bg-brand-border px-2 py-0.5 text-brand-secondary-hover uppercase"
            )}
          >
            Despacho & OCC
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
        <ContactField
          label="Celular de Emergencias / Guardias"
          help="Línea directa registrada para activación de tripulación de reserva."
          icon={<PhoneIcon aria-hidden="true" className="size-4.5" />}
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="+57 300 000 0000"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <ContactField
          label="Correo Corporativo (Solo Lectura)"
          help="Asignado por el departamento de IT Aerolínea."
          icon={<MailIcon aria-hidden="true" className="size-4.5" />}
          readOnly
          value={email}
        />
        <ContactField
          label="Zona de Residencia Registrada"
          help="Utilizado para calcular viáticos de transporte y radio de guardia."
          icon={<HomePinIcon aria-hidden="true" className="size-4.5" />}
          required
          error={errors.residenceZone?.message}
          {...register("residenceZone")}
        />
        {isCrew ? (
          <div className="flex min-w-0 flex-col gap-1">
            {crew.isPending ? (
              <p
                role="status"
                className={cn(typography.bodySm, "text-muted-foreground")}
              >
                Cargando datos de vuelo…
              </p>
            ) : crew.isError ? (
              <p
                role="alert"
                className={cn(typography.bodySm, "text-destructive")}
              >
                No se pudieron cargar los datos de vuelo.
              </p>
            ) : (
              <dl className="flex flex-col gap-1">
                <dt
                  className={cn(
                    typography.labelMd,
                    "font-semibold text-brand-primary"
                  )}
                >
                  Estimación de tiempo al Hub (BOG)
                </dt>
                <dd className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-sm border border-brand-border bg-muted px-3 py-2 lg:min-h-10">
                  <span
                    className={cn(
                      typography.labelLg,
                      "flex items-center gap-2 font-bold text-brand-primary"
                    )}
                  >
                    <DurationIcon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-brand-secondary"
                    />
                    {crew.data.hubEstimate}
                  </span>
                  <span
                    className={cn(
                      typography.labelSm,
                      "rounded-sm bg-brand-border px-2 py-0.5 text-brand-secondary-hover"
                    )}
                  >
                    Dentro de margen guardia (&lt;60m)
                  </span>
                </dd>
              </dl>
            )}
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              Conforme a normatividad de reserva domiciliaria Standby RAC 121.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ContactSection
