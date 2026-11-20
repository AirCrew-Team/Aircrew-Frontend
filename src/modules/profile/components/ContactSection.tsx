import { useId, type ComponentProps, type ReactNode } from "react"
import type { FieldErrors, UseFormRegister } from "react-hook-form"

import {
  ContactIcon,
  HomePinIcon,
  MailIcon,
  PhoneIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import SectionCard from "@/modules/profile/components/SectionCard"
import type { ProfileFormValues } from "@/modules/profile/schemas/profile.schema"

interface ContactFieldProps extends ComponentProps<"input"> {
  label: string
  help: string
  icon: ReactNode
  optional?: boolean
  error?: string
}

// Campo con label, ícono, texto de ayuda y error enlazados con aria-describedby.
const ContactField = ({
  label,
  help,
  icon,
  optional,
  error,
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
        {optional ? (
          <span className="font-normal text-muted-foreground"> (opcional)</span>
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          className={cn(
            typography.bodyMd,
            "min-h-11 w-full min-w-0 truncate rounded-sm border border-muted-foreground/70 bg-card py-2 pr-3 pl-10 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground read-only:cursor-not-allowed read-only:border-brand-border read-only:bg-muted read-only:text-foreground read-only:shadow-none focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-muted disabled:shadow-none aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
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
  // Correo de la cuenta; vacío en las cuentas demo.
  email: string
  // Ciudades del <datalist> de la residencia; undefined mientras llega el catálogo, si
  // falla o en las cuentas demo (el <datalist> queda sin opciones).
  cities: string[] | undefined
  // El catálogo falló: la ayuda de la residencia lo dice.
  citiesFailed: boolean
  register: UseFormRegister<ProfileFormValues>
  errors: FieldErrors<ProfileFormValues>
  // Cuentas demo: campos deshabilitados.
  disabled: boolean
}

// Contacto (común, editable salvo el correo): celular y residencia, opcionales. La
// residencia sugiere las ciudades del catálogo con un <datalist> del navegador.
const ContactSection = ({
  email,
  cities,
  citiesFailed,
  register,
  errors,
  disabled,
}: ContactSectionProps) => {
  const citiesId = useId()

  return (
    <SectionCard
      title="1. Contacto"
      icon={<ContactIcon aria-hidden="true" className="size-4.5" />}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
        <ContactField
          label="Celular"
          help="Con indicativo si quieres, por ejemplo +57 300 000 0000."
          icon={<PhoneIcon aria-hidden="true" className="size-4.5" />}
          optional
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone", { disabled })}
        />
        <ContactField
          label="Correo"
          help="Lo cambia un administrador desde Usuarios."
          icon={<MailIcon aria-hidden="true" className="size-4.5" />}
          readOnly
          value={email}
        />
        <ContactField
          label="Ciudad de residencia"
          help={
            citiesFailed
              ? "No se pudo cargar la lista de ciudades."
              : "Escribe para buscar y elige una ciudad de EE. UU., por ejemplo Miami, FL."
          }
          icon={<HomePinIcon aria-hidden="true" className="size-4.5" />}
          optional
          list={citiesId}
          // Sin autocompletado del navegador: solo valen las ciudades de la lista.
          autoComplete="off"
          error={errors.residence?.message}
          {...register("residence", { disabled })}
        />
        {/* Opciones sin texto: el valor ya es lo que se muestra y se guarda. */}
        <datalist id={citiesId}>
          {cities?.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>
    </SectionCard>
  )
}

export default ContactSection
