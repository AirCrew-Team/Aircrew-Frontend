import { useId, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"
import PhoneInput from "react-phone-number-input/mobile"
import flags from "react-phone-number-input/flags"
import es from "react-phone-number-input/locale/es"
import "react-phone-number-input/style.css"

import {
  UserCreationUnavailableError,
  UserFieldError,
  UserRequestError,
} from "@/App/actions/users/users.actions"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import {
  createUserSchema,
  type CreateUserFormValues,
} from "@/modules/users/schemas/createUser.schema"
import type {
  CreateUserInput,
  CrewUser,
  UserCatalogs,
  UserRoleGroup,
  UserShift,
  UserStatus,
} from "@/modules/users/types/users.types"
import { SHIFT_OPTIONS } from "@/modules/users/utils/userLabels"

// Opciones del rol: el valor es el del filtro (?role=); la acción lo traduce al backend.
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
  // Ayuda bajo el control, enlazada con aria-describedby (`${id}-hint`).
  hint?: string
  // Clases extra del contenedor, ej. "sm:col-span-2" para ocupar toda la fila.
  className?: string
  children: ReactNode
}

// Etiqueta, control, ayuda y error. El control enlaza la ayuda y el error con
// aria-describedby (`${id}-hint`, `${id}-error`).
const Field = ({
  id,
  label,
  required,
  error,
  hint,
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
    {hint ? (
      <p
        id={`${id}-hint`}
        className={cn(typography.bodySm, "text-muted-foreground")}
      >
        {hint}
      </p>
    ) : null}
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
  shift: "",
  // El supervisor empieza disponible, como en el backend.
  status: "disponible",
}

// Texto del aviso general (errores que no son de un campo).
const genericErrorText = (error: unknown) => {
  if (error instanceof UserRequestError) return error.message
  if (error instanceof UserCreationUnavailableError) return error.message
  return "No se pudo guardar el usuario. Intenta de nuevo."
}

interface UserFormProps {
  catalogs: UserCatalogs
  // Valores iniciales: sin ellos el formulario empieza vacío (alta); para editar, los
  // datos del usuario.
  defaultValues?: CreateUserFormValues
  // Roles que se pueden elegir. Alta: los tres. Edición de un tripulante: solo el suyo
  // (su rol no se puede cambiar); de un supervisor o administrador: esos dos.
  roleOptions?: UserRoleGroup[]
  // Texto del botón y mientras se guarda, ej. «Crear usuario» / «Creando usuario…».
  submitLabel: string
  pendingLabel: string
  // Petición al backend (crear o editar).
  onSave: (input: CreateUserInput) => Promise<CrewUser>
  // Qué hacer al guardar bien (aviso y cerrar la ventana).
  onSaved: (user: CrewUser) => void
}

// Formulario de usuario, compartido por «Añadir usuario» y «Editar usuario».
// Se monta al abrir la ventana y se desmonta al cerrarla, así cada apertura empieza
// con sus valores iniciales.
const UserForm = ({
  catalogs,
  defaultValues = EMPTY_USER_FORM,
  roleOptions = ROLE_OPTIONS.map((option) => option.value),
  submitLabel,
  pendingLabel,
  onSave,
  onSaved,
}: UserFormProps) => {
  const id = useId()
  const queryClient = useQueryClient()
  // Con un solo rol posible (tripulante en edición), la lista queda con esa opción.
  const roleLocked = roleOptions.length === 1

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
  // El rol cambia qué campos se muestran.
  const roleGroup = useWatch({ control, name: "roleGroup" }) as
    UserRoleGroup | ""
  const isCrew = roleGroup === "tripulacion"
  const isSupervisor = roleGroup === "supervisor"
  // Un cargo guardado que no está en el catálogo se ofrece igual, para no obligar a
  // cambiarlo al editar.
  const crewPositions =
    defaultValues.roleTitle &&
    !catalogs.crewPositions.includes(defaultValues.roleTitle)
      ? [defaultValues.roleTitle, ...catalogs.crewPositions]
      : catalogs.crewPositions
  // Supervisor guardado sin estado operativo: la lista ofrece «Sin estado» y no se exige.
  const withoutStatus = defaultValues.status === ""

  // Envío al backend (crear o editar, según la ventana). Las mutaciones no se reintentan
  // solas (ADR 003): si falla, el usuario decide si vuelve a intentar.
  const mutation = useMutation({
    // Envuelta: mutationFn también recibe el contexto de TanStack, que onSave no espera.
    mutationFn: (input: CreateUserInput) => onSave(input),
    onSuccess: (user) => {
      // Refresca la tabla, los indicadores, los conteos de los filtros y la ficha
      // (todo lo que empieza por ["users", …]).
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onSaved(user)
    },
    onError: (error) => {
      // 409 por correo repetido: se muestra debajo del correo y se enfoca.
      if (error instanceof UserFieldError) {
        setError(error.field, { message: error.message }, { shouldFocus: true })
      }
    },
  })

  // Solo se llama si el formulario pasó las validaciones. Cada rol envía solo sus
  // campos: los ocultos pueden conservar lo escrito antes de cambiar de rol.
  const onSubmit = (values: CreateUserFormValues) => {
    // Evita un segundo envío mientras el primero está en curso (el backend no usa
    // Idempotency-Key: el botón deshabilitado basta).
    if (mutation.isPending) return
    const role = values.roleGroup as UserRoleGroup
    mutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      // El campo ya entrega el celular en formato internacional (E.164), sin espacios.
      phone: values.phone,
      roleGroup: role,
      roleTitle: role === "tripulacion" ? values.roleTitle : "",
      base: role === "administrador" ? "" : values.base,
      shift: role === "supervisor" ? (values.shift as UserShift) : "",
      status: role === "supervisor" ? (values.status as UserStatus | "") : "",
    })
  }

  // Props comunes de accesibilidad de cada control.
  const a11y = (
    name: keyof CreateUserFormValues,
    required = true,
    hint = false
  ) => ({
    id: `${id}-${name}`,
    "aria-required": required || undefined,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby":
      [hint && `${id}-${name}-hint`, errors[name] && `${id}-${name}-error`]
        .filter(Boolean)
        .join(" ") || undefined,
  })
  // Error que no corresponde a un campo (ej. servicio caído): se avisa junto al botón.
  const genericError =
    mutation.isError && !(mutation.error instanceof UserFieldError)
      ? genericErrorText(mutation.error)
      : null

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

          {/* Datos operativos: rol y, según el rol, cargo, base y turno. Administrador:
              solo el rol. */}
          <fieldset className="min-w-0 rounded-lg bg-card p-4 shadow-xs">
            <legend className={cn(legendClass, "float-left w-full")}>
              Datos operativos
            </legend>
            <div className="clear-both grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id={`${id}-roleGroup`}
                label="Rol"
                required
                error={errors.roleGroup?.message}
                hint={
                  roleLocked
                    ? "El rol de un tripulante no se puede cambiar."
                    : undefined
                }
              >
                {/* Bloqueado = una sola opción (sin «Selecciona…»), no `disabled`: así el
                    valor sigue en el formulario y pasa la validación. */}
                <select
                  {...a11y("roleGroup", true, roleLocked)}
                  className={controlClass}
                  {...register("roleGroup", {
                    // Al cambiar de rol, el cargo y el turno elegidos ya no aplican.
                    onChange: () => {
                      setValue("roleTitle", "")
                      setValue("shift", "")
                    },
                  })}
                >
                  {roleLocked ? null : <option value="">Selecciona…</option>}
                  {ROLE_OPTIONS.filter((option) =>
                    roleOptions.includes(option.value)
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              {/* Cargo: solo Tripulación. El código lo asigna el backend (AC-0001…). */}
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
                    {...register("roleTitle")}
                  >
                    <option value="">Selecciona…</option>
                    {crewPositions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {/* Base: Tripulación y Supervisor. */}
              {isCrew || isSupervisor ? (
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
              ) : null}
              {/* Turno: aparece (y es obligatorio) solo al elegir Supervisor. */}
              {isSupervisor ? (
                <Field
                  id={`${id}-shift`}
                  label="Turno"
                  required
                  error={errors.shift?.message}
                >
                  <select
                    {...a11y("shift")}
                    className={controlClass}
                    {...register("shift")}
                  >
                    <option value="">Selecciona…</option>
                    {SHIFT_OPTIONS.map((shift) => (
                      <option key={shift.value} value={shift.value}>
                        {shift.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {/* Estado operativo (D14): solo Supervisor, con el catálogo del backend.
                  Siempre tiene uno elegido, así que no lleva «Selecciona…». Un
                  supervisor guardado sin estado se abre con «Sin estado», que no se
                  envía. */}
              {isSupervisor ? (
                <Field
                  id={`${id}-status`}
                  label="Estado operativo"
                  required={!withoutStatus}
                  error={errors.status?.message}
                >
                  <select
                    {...a11y("status", !withoutStatus)}
                    className={controlClass}
                    {...register("status")}
                  >
                    {withoutStatus ? (
                      <option value="">Sin estado</option>
                    ) : null}
                    {catalogs.supervisorStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          </fieldset>
        </div>
      </div>

      {/* Pie: error general (si lo hay) y el botón de guardar. */}
      <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {genericError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              {genericError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-70 lg:min-h-9"
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
