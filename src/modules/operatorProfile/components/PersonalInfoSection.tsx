import { useId, type ReactNode } from "react"
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form"
import PhoneInput from "react-phone-number-input/mobile"
import flags from "react-phone-number-input/flags"
import es from "react-phone-number-input/locale/es"
import "react-phone-number-input/style.css"

import {
  BaseIcon,
  ContactIcon,
  MailIcon,
  PositionIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import {
  controlClass,
  errorClass,
  fieldLabelClass,
  sectionClass,
} from "@/modules/operatorProfile/components/formStyles"
import SectionTitle from "@/modules/operatorProfile/components/SectionTitle"
import type { OperatorProfileFormValues } from "@/modules/operatorProfile/schemas/operatorProfile.schema"
import type {
  OperatorProfile,
  ResidenceOption,
} from "@/modules/operatorProfile/types/operatorProfile.types"

interface PersonalInfoSectionProps {
  profile: OperatorProfile
  residences: ResidenceOption[]
  control: Control<OperatorProfileFormValues>
  register: UseFormRegister<OperatorProfileFormValues>
  errors: FieldErrors<OperatorProfileFormValues>
}

// Asterisco de obligatorio: visual; el control ya lo dice (aria-required).
const RequiredMark = () => (
  <span aria-hidden="true" className="text-destructive">
    {" "}
    *
  </span>
)

// 1. Información Personal: nombre, correo, celular, residencia y el campo de solo
// lectura que cambia por rol (Cargo / Departamento o Área y Flota Supervisada).
const PersonalInfoSection = ({
  profile,
  residences,
  control,
  register,
  errors,
}: PersonalInfoSectionProps) => {
  const id = useId()

  // Props comunes de accesibilidad de cada control.
  const a11y = (name: keyof OperatorProfileFormValues) => ({
    id: `${id}-${name}`,
    "aria-required": true,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  })
  // Mensaje de error del campo, enlazado por aria-describedby.
  const error = (name: keyof OperatorProfileFormValues) => {
    const message = errors[name]?.message
    return typeof message === "string" ? (
      <p id={`${id}-${name}-error`} className={errorClass}>
        {message}
      </p>
    ) : null
  }

  // Campo con ícono a la izquierda (decorativo).
  const withIcon = (Icon: typeof MailIcon, field: ReactNode) => (
    <div className="relative">
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      {field}
    </div>
  )

  return (
    <section aria-labelledby={`${id}-title`} className={sectionClass}>
      <SectionTitle
        id={`${id}-title`}
        icon={ContactIcon}
        title="1. Información Personal"
        description="Datos principales de contacto para el equipo de despacho y cabina."
      />
      {/* Móvil: una columna. Desde sm: dos columnas; el campo de solo lectura, a todo el ancho. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-fullName`} className={fieldLabelClass}>
            Nombre Completo
            <RequiredMark />
          </label>
          {withIcon(
            PositionIcon,
            <input
              {...a11y("fullName")}
              autoComplete="name"
              className={cn(controlClass, "pl-9")}
              {...register("fullName")}
            />
          )}
          {error("fullName")}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-email`} className={fieldLabelClass}>
            Correo Corporativo
            <RequiredMark />
          </label>
          {withIcon(
            MailIcon,
            <input
              {...a11y("email")}
              type="email"
              autoComplete="email"
              className={cn(controlClass, "pl-9")}
              {...register("email")}
            />
          )}
          {error("email")}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-phone`} className={fieldLabelClass}>
            {profile.phoneLabel}
            <RequiredMark />
          </label>
          {/* react-phone-number-input (versión «mobile», la misma de Usuarios): país con
              bandera y el número formateado. Su valor es el celular en E.164. */}
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                // ref al campo del número: si hay error, el formulario lo enfoca.
                ref={field.ref}
                value={field.value || undefined}
                onChange={(value) => field.onChange(value ?? "")}
                onBlur={field.onBlur}
                defaultCountry="US"
                // El número guardado se muestra en formato local («(404) 555-0119»).
                initialValueFormat="national"
                labels={es}
                // Banderas incluidas en el paquete: no se piden a internet.
                flags={flags}
                addInternationalOption={false}
                countryOptionsOrder={["US", "|", "..."]}
                countrySelectProps={{ "aria-label": "País del celular" }}
                {...a11y("phone")}
                autoComplete="tel"
                numberInputProps={{ className: controlClass }}
                className={cn(
                  "flex min-w-0 items-center gap-2",
                  // Caja del país con el mismo borde y alto que los demás campos.
                  "[&_.PhoneInputCountry]:m-0 [&_.PhoneInputCountry]:min-h-11 [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:gap-1.5 [&_.PhoneInputCountry]:rounded-sm [&_.PhoneInputCountry]:border [&_.PhoneInputCountry]:border-muted-foreground/70 [&_.PhoneInputCountry]:bg-card [&_.PhoneInputCountry]:px-3 [&_.PhoneInputCountry]:shadow-xs lg:[&_.PhoneInputCountry]:min-h-10",
                  "[&_.PhoneInputCountry:has(select:focus-visible)]:border-brand-tertiary [&_.PhoneInputCountry:has(select:focus-visible)]:ring-2 [&_.PhoneInputCountry:has(select:focus-visible)]:ring-brand-tertiary"
                )}
              />
            )}
          />
          {error("phone")}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-residence`} className={fieldLabelClass}>
            País o Residencia Principal
            <RequiredMark />
          </label>
          {withIcon(
            BaseIcon,
            <select
              {...a11y("residence")}
              className={cn(controlClass, "pl-9")}
              {...register("residence")}
            >
              <option value="">Selecciona…</option>
              {residences.map((residence) => (
                <option key={residence.code} value={residence.code}>
                  {residence.label}
                </option>
              ))}
            </select>
          )}
          {error("residence")}
        </div>

        {/* Campo de solo lectura (lo asigna la institución) con la nota de a quién pedir cambios. */}
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <label htmlFor={`${id}-readonly`} className={fieldLabelClass}>
            {profile.readOnlyField.label}
          </label>
          {withIcon(
            PositionIcon,
            <input
              id={`${id}-readonly`}
              readOnly
              value={profile.readOnlyField.value}
              aria-describedby={`${id}-readonly-note`}
              className={cn(
                controlClass,
                "cursor-default border-brand-border bg-muted pl-9 text-foreground shadow-none"
              )}
            />
          )}
          <p
            id={`${id}-readonly-note`}
            className={cn(typography.bodySm, "font-medium text-brand-primary")}
          >
            {profile.readOnlyField.note}
          </p>
        </div>
      </div>
    </section>
  )
}

export default PersonalInfoSection
