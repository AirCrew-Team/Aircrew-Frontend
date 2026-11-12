import { useId, useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"
import PhoneInput from "react-phone-number-input/mobile"
import flags from "react-phone-number-input/flags"
import es from "react-phone-number-input/locale/es"
import "react-phone-number-input/style.css"

import { ConfirmedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { UserFieldError } from "@/modules/users/data/users.data"
import {
  createUserSchema,
  type CreateUserFormValues,
} from "@/modules/users/schemas/createUser.schema"
import type {
  CreateUserInput,
  CrewUser,
  UserCatalogs,
  UserRoleGroup,
} from "@/modules/users/types/users.types"

// Opciones del rol: el valor es el que se envía al backend y el que va en ?role=.
const ROLE_OPTIONS: { value: UserRoleGroup; label: string }[] = [
  { value: "tripulacion", label: "Tripulación" },
  { value: "supervisor", label: "Supervisor" },
  { value: "administrador", label: "Administrador" },
]

// Campos de texto y listas con el mismo borde, foco y error que los formularios del proyecto.
// text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
const controlClass = cn(
  typography.bodySm,
  "min-h-11 w-full min-w-0 rounded-sm border border-muted-foreground/70 bg-card px-3 py-2 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
)
// float-left + w-full: la legend queda dentro de la tarjeta como un título normal (sin
// esto el navegador la dibuja sobre el borde); la cuadrícula que sigue la despeja con clear-both.
const legendClass = cn(
  typography.labelSm,
  "mb-3 text-brand-secondary uppercase"
)

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  // Clases extra del contenedor, ej. "sm:col-span-2" para ocupar toda la fila.
  className?: string
  children: ReactNode
}

// Etiqueta, control y error. El control enlaza el error con aria-describedby (`${id}-error`).
const Field = ({
  id,
  label,
  required,
  error,
  className,
  children,
}: FieldProps) => (
  <div className={cn("flex min-w-0 flex-col gap-1", className)}>
    <label
      htmlFor={id}
      className={cn(typography.labelMd, "font-semibold text-brand-primary")}
    >
      {label}
      {required ? (
        // El asterisco es visual; el control ya dice que es obligatorio (aria-required).
        <span aria-hidden="true" className="text-destructive">
          {" "}
          *
        </span>
      ) : null}
    </label>
    {children}
    {error ? (
      <p
        id={`${id}-error`}
        className={cn(typography.bodySm, "text-destructive")}
      >
        {error}
      </p>
    ) : null}
  </div>
)

// Valores de un formulario vacío (alta). El país del celular empieza en EE. UU.
// (defaultCountry del campo), porque Delta opera desde allí.
const EMPTY_USER_FORM: CreateUserFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleGroup: "",
  roleTitle: "",
  base: "",
  licenseNumber: "",
  certificates: [],
}

interface UserFormProps {
  catalogs: UserCatalogs
  // Valores iniciales: sin ellos el formulario empieza vacío (alta); para editar, los
  // datos del usuario.
  defaultValues?: CreateUserFormValues
  // Texto del botón y mientras se guarda, ej. «Crear usuario» / «Creando usuario…».
  submitLabel: string
  pendingLabel: string
  // Petición al backend (crear o editar). Recibe la clave de idempotencia, que solo
  // usa el alta (POST); la edición (PUT) no la necesita.
  onSave: (input: CreateUserInput, idempotencyKey: string) => Promise<CrewUser>
  // Qué hacer al guardar bien (aviso y cerrar la ventana).
  onSaved: (user: CrewUser) => void
}

// Formulario de usuario, compartido por «Añadir usuario» y «Editar usuario».
// Se monta al abrir la ventana y se desmonta al cerrarla, así cada apertura empieza
// con sus valores iniciales y con su propia clave de idempotencia.
const UserForm = ({
  catalogs,
  defaultValues = EMPTY_USER_FORM,
  submitLabel,
  pendingLabel,
  onSave,
  onSaved,
}: UserFormProps) => {
  const id = useId()
  const queryClient = useQueryClient()
  // Una clave por intento de alta (ADR 003): si el mismo envío llega dos veces, el
  // backend crea un solo usuario. Se renueva si hay que corregir datos y reenviar.
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID()
  )

  // react-hook-form con las reglas de createUser.schema.ts (zod). defaultValues solo se
  // leen al montar: por eso la ventana monta el formulario cuando ya tiene los datos.
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues,
  })
  // useWatch: valores en vivo de los campos que cambian lo que se muestra.
  const roleGroup = useWatch({ control, name: "roleGroup" }) as
    UserRoleGroup | ""
  // Cargo, licencia y certificados: solo Tripulación (Supervisor y Administrador no
  // tienen horas de vuelo ni licencia).
  const isCrew = roleGroup === "tripulacion"
  // Los certificados que se ofrecen dependen del cargo elegido.
  const roleTitle = useWatch({ control, name: "roleTitle" })
  const certificateOptions = catalogs.certificatesByTitle[roleTitle] ?? []
  // La licencia se muestra cuando ya hay cargo: sin él no hay certificados que ofrecer.
  const showLicense = isCrew && certificateOptions.length > 0

  // Envío al backend (crear o editar, según la ventana). Las mutaciones no se reintentan
  // solas (ADR 003): si falla, el usuario decide si vuelve a intentar.
  const mutation = useMutation({
    mutationFn: (input: CreateUserInput) => onSave(input, idempotencyKey),
    onSuccess: (user) => {
      // Refresca la tabla, los indicadores, los conteos de los filtros y la ficha
      // (todo lo que empieza por ["users", …]).
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onSaved(user)
    },
    onError: (error) => {
      // Error de un campo del formulario (ej. correo repetido): se muestra en ese campo
      // y se enfoca. Si el campo no está en el formulario, queda el aviso general.
      if (
        error instanceof UserFieldError &&
        error.field in createUserSchema.shape
      ) {
        setError(
          error.field as keyof CreateUserFormValues,
          { message: error.message },
          { shouldFocus: true }
        )
        setIdempotencyKey(crypto.randomUUID())
      }
    },
  })

  // Solo se llama si el formulario pasó las validaciones. Convierte los valores del
  // formulario en los datos que espera el backend (CreateUserInput).
  const onSubmit = (values: CreateUserFormValues) => {
    // Evita un segundo envío mientras el primero está en curso.
    if (mutation.isPending) return
    const role = values.roleGroup as UserRoleGroup
    mutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      // El campo ya entrega el celular en formato internacional (E.164), sin espacios:
      // indicativo + número, ej. «+14045550123». Así lo recibe el backend.
      phone: values.phone,
      roleGroup: role,
      // Supervisor y Administrador no tienen cargo: se envía el nombre del rol.
      roleTitle:
        role === "tripulacion"
          ? values.roleTitle
          : (ROLE_OPTIONS.find((option) => option.value === role)?.label ??
            role),
      base: values.base,
      // Los campos ocultos pueden conservar lo escrito antes de cambiar de rol:
      // solo se envía la licencia si es Tripulación.
      license:
        role === "tripulacion"
          ? { number: values.licenseNumber, certificates: values.certificates }
          : undefined,
    })
  }

  // Props comunes de accesibilidad de cada control.
  const a11y = (name: keyof CreateUserFormValues, required = true) => ({
    id: `${id}-${name}`,
    "aria-required": required || undefined,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  })
  // Error que no corresponde a un campo (ej. servicio caído): se avisa junto al botón.
  const genericError =
    mutation.isError &&
    !(
      mutation.error instanceof UserFieldError &&
      mutation.error.field in createUserSchema.shape
    )

  return (
    // noValidate: los mensajes los pone el formulario (en español y accesibles), no el
    // navegador. handleSubmit valida con zod y, si todo está bien, llama a onSubmit.
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Cuerpo con su propio desplazamiento: el encabezado y el pie quedan fijos. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {/* Los campos siguen editables durante el envío: si el backend marca un campo
            (ej. correo repetido), se puede enfocar enseguida. El botón sí se bloquea. */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Datos personales: nombres y apellidos en dos columnas; correo y celular a
              todo el ancho. Cada grupo es un fieldset: el lector anuncia su título. */}
          <fieldset className="min-w-0 rounded-lg bg-card p-4 shadow-xs">
            <legend className={cn(legendClass, "float-left w-full")}>
              Datos personales
            </legend>
            <div className="clear-both grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id={`${id}-firstName`}
                label="Nombres"
                required
                error={errors.firstName?.message}
              >
                <input
                  {...a11y("firstName")}
                  autoComplete="given-name"
                  className={controlClass}
                  {...register("firstName")}
                />
              </Field>
              <Field
                id={`${id}-lastName`}
                label="Apellidos"
                required
                error={errors.lastName?.message}
              >
                <input
                  {...a11y("lastName")}
                  autoComplete="family-name"
                  className={controlClass}
                  {...register("lastName")}
                />
              </Field>
              {/* Correo y celular ocupan toda la fila: el celular lleva indicativo + número
                  y en media columna quedaba apretado. */}
              <Field
                className="sm:col-span-2"
                id={`${id}-email`}
                label="Correo"
                required
                error={errors.email?.message}
              >
                <input
                  {...a11y("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@aircrew-ops.com"
                  className={controlClass}
                  {...register("email")}
                />
              </Field>
              <Field
                className="sm:col-span-2"
                id={`${id}-phone`}
                label="Celular"
                required
                error={errors.phone?.message}
              >
                {/* react-phone-number-input (versión «mobile»): selector de país con
                    bandera y el número, que se formatea mientras se escribe. Todos los
                    países con nombres en español, EE. UU. primero y por defecto.
                    Controller lo conecta con react-hook-form; su valor es el celular en
                    E.164 («+14045550123») o vacío. */}
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
                      // Al editar, el número guardado se muestra en formato local de su
                      // país («(404) 555-0142»), igual que cuando se escribe.
                      initialValueFormat="national"
                      labels={es}
                      // Banderas como SVG incluidos en el paquete: no se piden a internet.
                      flags={flags}
                      addInternationalOption={false}
                      countryOptionsOrder={["US", "|", "..."]}
                      countrySelectProps={{ "aria-label": "País del celular" }}
                      // Al número: id, aria (error y obligatorio) y el mismo estilo de los
                      // demás campos.
                      {...a11y("phone")}
                      autoComplete="tel"
                      placeholder="Número de celular"
                      numberInputProps={{ className: controlClass }}
                      className={cn(
                        "flex min-w-0 items-center gap-2",
                        // Caja del país con el mismo borde y alto que los demás campos;
                        // el anillo de foco aparece al enfocar su lista con el teclado.
                        "[&_.PhoneInputCountry]:m-0 [&_.PhoneInputCountry]:min-h-11 [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:gap-1.5 [&_.PhoneInputCountry]:rounded-sm [&_.PhoneInputCountry]:border [&_.PhoneInputCountry]:border-muted-foreground/70 [&_.PhoneInputCountry]:bg-card [&_.PhoneInputCountry]:px-3 [&_.PhoneInputCountry]:shadow-xs lg:[&_.PhoneInputCountry]:min-h-10",
                        "[&_.PhoneInputCountry:has(select:focus-visible)]:border-brand-tertiary [&_.PhoneInputCountry:has(select:focus-visible)]:ring-2 [&_.PhoneInputCountry:has(select:focus-visible)]:ring-brand-tertiary"
                      )}
                    />
                  )}
                />
              </Field>
            </div>
          </fieldset>

          {/* Datos operativos: rol, cargo (solo Tripulación) y base. Con cargo son
              tres columnas; sin él, dos. */}
          <fieldset className="min-w-0 rounded-lg bg-card p-4 shadow-xs">
            <legend className={cn(legendClass, "float-left w-full")}>
              Datos operativos
            </legend>
            <div
              className={cn(
                "clear-both grid grid-cols-1 gap-3",
                isCrew ? "sm:grid-cols-3" : "sm:grid-cols-2"
              )}
            >
              <Field
                id={`${id}-roleGroup`}
                label="Rol"
                required
                error={errors.roleGroup?.message}
              >
                <select
                  {...a11y("roleGroup")}
                  className={controlClass}
                  {...register("roleGroup", {
                    // Al cambiar de rol, el cargo elegido ya no aplica.
                    onChange: () => setValue("roleTitle", ""),
                  })}
                >
                  <option value="">Selecciona…</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              {/* Cargo: solo Tripulación (Comandante, Copiloto, Auxiliar de Vuelo…). */}
              {isCrew ? (
                <Field
                  id={`${id}-roleTitle`}
                  label="Cargo"
                  required
                  error={errors.roleTitle?.message}
                >
                  <select
                    {...a11y("roleTitle")}
                    className={controlClass}
                    {...register("roleTitle", {
                      // Al cambiar de cargo, los certificados marcados ya no aplican.
                      onChange: () => setValue("certificates", []),
                    })}
                  >
                    <option value="">Selecciona…</option>
                    {catalogs.crewTitles.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field
                id={`${id}-base`}
                label="Base"
                required
                error={errors.base?.message}
              >
                <select
                  {...a11y("base")}
                  className={controlClass}
                  {...register("base")}
                >
                  <option value="">Selecciona…</option>
                  {catalogs.bases.map((base) => (
                    <option key={base.code} value={base.code}>
                      {base.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Licencia: solo Tripulación, y aparece al elegir el cargo (los certificados
              dependen de él). Supervisor y Administrador no tienen licencia. */}
          {showLicense ? (
            <fieldset className="min-w-0 rounded-lg bg-card p-4 shadow-xs">
              <legend className={cn(legendClass, "float-left w-full")}>
                Licencia
              </legend>
              {/* Móvil: uno debajo del otro. Desde sm: número a la izquierda (angosto)
                  y certificados a la derecha (ancho), alineados arriba. */}
              <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-start">
                <Field
                  id={`${id}-licenseNumber`}
                  label="Número de licencia"
                  required
                  error={errors.licenseNumber?.message}
                >
                  <input
                    {...a11y("licenseNumber")}
                    placeholder="Ej. FAA ATP #1108-US"
                    className={controlClass}
                    {...register("licenseNumber")}
                  />
                </Field>

                {/* Certificados del cargo como chips: un tripulante tiene varios
                    (ej. ATP + IR + ME). Cada chip es una casilla real (oculta a la vista),
                    así funciona con teclado y lector de pantalla. */}
                <fieldset
                  aria-invalid={errors.certificates ? true : undefined}
                  aria-describedby={
                    errors.certificates ? `${id}-certificates-error` : undefined
                  }
                  className="min-w-0"
                >
                  {/* float + clear-both: la legend se comporta como la etiqueta de al lado. */}
                  <legend
                    className={cn(
                      typography.labelMd,
                      "float-left mb-1 w-full font-semibold text-brand-primary"
                    )}
                  >
                    Certificados
                    <span aria-hidden="true" className="text-destructive">
                      {" "}
                      *
                    </span>
                  </legend>
                  <div className="clear-both flex flex-col gap-1">
                    <div className="flex flex-wrap gap-2">
                      {certificateOptions.map((certificate) => (
                        <label
                          key={certificate}
                          className={cn(
                            typography.labelMd,
                            "group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-brand-border bg-card px-3.5 font-semibold text-brand-primary transition-colors select-none hover:bg-brand-neutral has-checked:border-brand-primary has-checked:bg-brand-primary has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-card motion-reduce:transition-none lg:min-h-8"
                          )}
                        >
                          <input
                            type="checkbox"
                            value={certificate}
                            className="sr-only"
                            {...register("certificates")}
                          />
                          {/* El ✓ solo se ve marcado; el estado ya lo anuncia la casilla. */}
                          <ConfirmedIcon
                            aria-hidden="true"
                            className="hidden size-4 shrink-0 group-has-checked:block"
                          />
                          {certificate}
                        </label>
                      ))}
                    </div>
                    {errors.certificates ? (
                      <p
                        id={`${id}-certificates-error`}
                        className={cn(typography.bodySm, "text-destructive")}
                      >
                        {errors.certificates.message}
                      </p>
                    ) : null}
                  </div>
                </fieldset>
              </div>
            </fieldset>
          ) : null}
        </div>
      </div>

      {/* Pie: error general (si lo hay) y el botón de crear. */}
      <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {genericError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudo guardar el usuario. Intenta de nuevo.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-70 lg:min-h-9"
            )}
          >
            {mutation.isPending ? pendingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

export default UserForm
