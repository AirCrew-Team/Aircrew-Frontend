import { useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { FlightIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import AircraftDialogHeader from "@/modules/aircraft/components/AircraftDialogHeader"
import AircraftPhotoField from "@/modules/aircraft/components/AircraftPhotoField"
import {
  AircraftFieldError,
  createAircraft,
  getAircraftOptions,
  updateAircraft,
} from "@/modules/aircraft/data/aircraft.data"
import {
  aircraftSchema,
  type AircraftFormValues,
} from "@/modules/aircraft/schemas/aircraft.schema"
import type {
  Aircraft,
  AircraftOptions,
  MaintenanceType,
} from "@/modules/aircraft/types/aircraft.types"
import {
  CATEGORY_LABEL,
  MAINTENANCE_LABEL,
  crewText,
} from "@/modules/aircraft/utils/aircraftStatus"

// Campos de texto y listas con el mismo borde, foco y error que los formularios del proyecto.
// text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
const controlClass = cn(
  typography.bodySm,
  "min-h-11 w-full min-w-0 rounded-sm border border-muted-foreground/70 bg-card px-3 py-2 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
)
const cardClass = "min-w-0 rounded-lg bg-card p-4 shadow-xs"
// float-left + w-full: la legend queda dentro de la tarjeta como un título normal; lo
// que sigue la despeja con clear-both.
const legendClass = cn(
  typography.labelSm,
  "float-left mb-3 w-full text-brand-secondary uppercase"
)
const fieldLabelClass = cn(
  typography.labelMd,
  "font-semibold text-brand-primary"
)
const hintClass = cn(typography.bodySm, "text-muted-foreground")
const errorClass = cn(typography.bodySm, "text-destructive")

// Asterisco de obligatorio: visual; el control ya lo dice (aria-required).
const RequiredMark = () => (
  <span aria-hidden="true" className="text-destructive">
    {" "}
    *
  </span>
)

// Valores iniciales: los de la aeronave al editar, o vacíos al registrar.
const toFormValues = (aircraft?: Aircraft): AircraftFormValues => ({
  registration: aircraft?.registration ?? "",
  msn: aircraft?.msn ?? "",
  modelId: aircraft?.modelId ?? "",
  baseCode: aircraft?.baseCode ?? "",
  manufactureYear: aircraft ? String(aircraft.manufactureYear) : "",
  inFleetSince: aircraft?.inFleetSince ?? "",
  condition: aircraft?.status ?? "operativa",
  maintenanceType: aircraft?.maintenanceType ?? "",
  maintenanceNote: aircraft?.maintenanceNote ?? "",
})

interface AircraftFormProps {
  aircraft?: Aircraft
  options: AircraftOptions
  onSaved: () => void
}

// Formulario con los catálogos ya cargados. Se monta al abrir la ventana: cada apertura
// empieza con los valores de la aeronave (o vacía).
const AircraftForm = ({ aircraft, options, onSaved }: AircraftFormProps) => {
  const id = useId()
  const queryClient = useQueryClient()
  const isEdit = Boolean(aircraft)
  // Foto elegida: un archivo nuevo o undefined (dejar la que había). Va fuera de
  // react-hook-form porque es un File, no texto.
  const [photo, setPhoto] = useState<File | undefined>(undefined)
  // La foto es obligatoria: al registrar se avisa si falta al guardar.
  const [photoMissing, setPhotoMissing] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: toFormValues(aircraft),
  })
  // useWatch: valores en vivo de los campos que cambian lo que se muestra.
  const modelId = useWatch({ control, name: "modelId" })
  const condition = useWatch({ control, name: "condition" })
  const model = options.models.find((option) => option.id === modelId)

  // Registrar (con la API, un POST) o editar (un PUT). Las mutaciones no se reintentan
  // solas (ADR 003).
  const mutation = useMutation({
    mutationFn: (values: AircraftFormValues) => {
      const inMaintenance = values.condition === "mantenimiento"
      const input = {
        registration: values.registration,
        msn: values.msn,
        modelId: values.modelId,
        baseCode: values.baseCode,
        manufactureYear: Number(values.manufactureYear),
        inFleetSince: values.inFleetSince,
        condition: values.condition,
        maintenanceType: inMaintenance
          ? (values.maintenanceType as MaintenanceType)
          : null,
        // Sin descripción se envía null.
        maintenanceNote:
          inMaintenance && values.maintenanceNote
            ? values.maintenanceNote
            : null,
        photo,
      }
      return aircraft
        ? updateAircraft(aircraft.id, input)
        : createAircraft(input)
    },
    onSuccess: (saved) => {
      // Refresca las tarjetas, los indicadores y los conteos de los filtros.
      queryClient.invalidateQueries({ queryKey: ["aircraft"] })
      toast.success(isEdit ? "Aeronave actualizada" : "Aeronave registrada", {
        description: isEdit
          ? `Los cambios de ${saved.registration} ya están vigentes.`
          : `${saved.registration} quedó en la flota con base en ${saved.baseName}.`,
      })
      onSaved()
    },
    onError: (error) => {
      // Matrícula repetida: se marca en su campo y se enfoca.
      if (error instanceof AircraftFieldError) {
        setError(error.field, { message: error.message }, { shouldFocus: true })
      }
    },
  })

  const genericError =
    mutation.isError && !(mutation.error instanceof AircraftFieldError)

  // Props comunes de cada campo: obligatorio, inválido y sus textos de ayuda/error.
  const describedBy = (name: keyof AircraftFormValues, hasHint = false) =>
    [hasHint && `${id}-${name}-hint`, errors[name] && `${id}-${name}-error`]
      .filter(Boolean)
      .join(" ") || undefined

  const fieldError = (name: keyof AircraftFormValues) =>
    errors[name]?.message ? (
      <p id={`${id}-${name}-error`} className={errorClass}>
        {errors[name]?.message}
      </p>
    ) : null

  return (
    // noValidate: los mensajes los pone el formulario (en español y accesibles).
    <form
      noValidate
      onSubmit={(event) => {
        // Sin foto al registrar: se marca junto con los demás campos.
        const missing = !isEdit && !photo
        setPhotoMissing(missing)
        handleSubmit((values) => {
          if (!missing) mutation.mutate(values)
        })(event)
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
        {/* Foto de la aeronave (obligatoria): al editar se ve la actual. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>
            Foto de la aeronave
            <RequiredMark />
          </legend>
          <div className="clear-both">
            <AircraftPhotoField
              currentUrl={aircraft?.photoUrl ?? null}
              photo={photo}
              missing={photoMissing}
              onChange={(next) => {
                setPhoto(next)
                setPhotoMissing(false)
              }}
            />
          </div>
        </fieldset>

        {/* Identificación: matrícula, número de serie, año y llegada a la flota. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Identificación</legend>
          {/* Celular: uno debajo del otro. Desde sm: lado a lado. */}
          <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-registration`} className={fieldLabelClass}>
                Matrícula
                <RequiredMark />
              </label>
              <input
                id={`${id}-registration`}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="Ej. N391DN"
                aria-required="true"
                aria-invalid={errors.registration ? true : undefined}
                aria-describedby={describedBy("registration", true)}
                className={cn(controlClass, "font-mono uppercase")}
                {...register("registration")}
              />
              <p id={`${id}-registration-hint`} className={hintClass}>
                Matrícula FAA: empieza por N.
              </p>
              {fieldError("registration")}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-msn`} className={fieldLabelClass}>
                Número de serie (MSN)
                <RequiredMark />
              </label>
              <input
                id={`${id}-msn`}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej. 10342"
                aria-required="true"
                aria-invalid={errors.msn ? true : undefined}
                aria-describedby={describedBy("msn")}
                className={cn(controlClass, "font-mono")}
                {...register("msn")}
              />
              {fieldError("msn")}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor={`${id}-manufactureYear`}
                className={fieldLabelClass}
              >
                Año de fabricación
                <RequiredMark />
              </label>
              <input
                id={`${id}-manufactureYear`}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="Ej. 2021"
                aria-required="true"
                aria-invalid={errors.manufactureYear ? true : undefined}
                aria-describedby={describedBy("manufactureYear")}
                className={controlClass}
                {...register("manufactureYear")}
              />
              {fieldError("manufactureYear")}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-inFleetSince`} className={fieldLabelClass}>
                En la flota desde
                <RequiredMark />
              </label>
              <input
                id={`${id}-inFleetSince`}
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                aria-required="true"
                aria-invalid={errors.inFleetSince ? true : undefined}
                aria-describedby={describedBy("inFleetSince")}
                className={controlClass}
                {...register("inFleetSince")}
              />
              {fieldError("inFleetSince")}
            </div>
          </div>
        </fieldset>

        {/* Configuración técnica: modelo (define capacidad y tripulación) y base. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Configuración técnica</legend>
          <div className="clear-both flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={`${id}-modelId`} className={fieldLabelClass}>
                  Modelo
                  <RequiredMark />
                </label>
                <select
                  id={`${id}-modelId`}
                  aria-required="true"
                  aria-invalid={errors.modelId ? true : undefined}
                  aria-describedby={describedBy("modelId")}
                  className={controlClass}
                  {...register("modelId")}
                >
                  <option value="">Selecciona…</option>
                  {options.models.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {fieldError("modelId")}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={`${id}-baseCode`} className={fieldLabelClass}>
                  Base principal
                  <RequiredMark />
                </label>
                <select
                  id={`${id}-baseCode`}
                  aria-required="true"
                  aria-invalid={errors.baseCode ? true : undefined}
                  aria-describedby={describedBy("baseCode")}
                  className={controlClass}
                  {...register("baseCode")}
                >
                  <option value="">Selecciona…</option>
                  {options.bases.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {fieldError("baseCode")}
              </div>
            </div>
            {/* Lo que define el modelo elegido (se anuncia al cambiar). */}
            <p
              aria-live="polite"
              className={cn(
                typography.bodySm,
                "rounded-md bg-muted px-3 py-2 text-muted-foreground"
              )}
            >
              {model ? (
                <>
                  <span className="font-semibold text-brand-primary">
                    {CATEGORY_LABEL[model.category]}
                  </span>{" "}
                  · {model.capacity} pasajeros · Tripulación mínima:{" "}
                  {crewText(model.minimumCrew)} · Motores: {model.engines}
                </>
              ) : (
                "Elige un modelo para ver su capacidad, tripulación mínima y motores."
              )}
            </p>
          </div>
        </fieldset>

        {/* Estado: operativa o en mantenimiento (con su tipo). */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Estado</legend>
          <div className="clear-both flex flex-col gap-4">
            {/* Opciones como chips: cada una es un radio real (oculto a la vista), así
                funciona con teclado y lector. */}
            <div
              role="radiogroup"
              aria-label="Estado de la aeronave"
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  { value: "operativa", label: "Operativa" },
                  { value: "mantenimiento", label: "En mantenimiento" },
                ] as const
              ).map(({ value, label }) => (
                <label
                  key={value}
                  className={cn(
                    typography.labelMd,
                    "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-brand-border bg-card px-4 font-semibold text-brand-primary transition-colors select-none hover:bg-brand-neutral has-checked:border-brand-primary has-checked:bg-brand-primary has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-brand-tertiary has-focus-visible:ring-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-50 motion-reduce:transition-none lg:min-h-9"
                  )}
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register("condition")}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Motivo y descripción: solo si está en mantenimiento. */}
            {condition === "mantenimiento" ? (
              <div className="flex min-w-0 flex-col gap-1 sm:max-w-sm">
                <label
                  htmlFor={`${id}-maintenanceType`}
                  className={fieldLabelClass}
                >
                  Motivo del mantenimiento
                  <RequiredMark />
                </label>
                <select
                  id={`${id}-maintenanceType`}
                  aria-required="true"
                  aria-invalid={errors.maintenanceType ? true : undefined}
                  aria-describedby={describedBy("maintenanceType")}
                  className={controlClass}
                  {...register("maintenanceType")}
                >
                  <option value="">Selecciona…</option>
                  {(
                    Object.entries(MAINTENANCE_LABEL) as [
                      MaintenanceType,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {fieldError("maintenanceType")}
              </div>
            ) : null}
            {condition === "mantenimiento" ? (
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor={`${id}-maintenanceNote`}
                  className={fieldLabelClass}
                >
                  Descripción del problema{" "}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </label>
                <textarea
                  id={`${id}-maintenanceNote`}
                  rows={3}
                  maxLength={300}
                  placeholder="Ej. Vibración anormal en el motor derecho."
                  aria-invalid={errors.maintenanceNote ? true : undefined}
                  aria-describedby={describedBy("maintenanceNote")}
                  className={cn(controlClass, "resize-y")}
                  {...register("maintenanceNote")}
                />
                {fieldError("maintenanceNote")}
              </div>
            ) : null}
          </div>
        </fieldset>
      </div>

      {/* Pie: error general (si lo hay) y los botones. */}
      <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {genericError ? (
            <p role="alert" className={errorClass}>
              No se pudo guardar la aeronave. Intenta de nuevo.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose
              className={cn(
                typography.labelMd,
                "inline-flex min-h-11 items-center rounded-md px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
              )}
            >
              Cancelar
            </DialogClose>
            {/* Siempre activo: si falta algo, al pulsarlo cada campo muestra su mensaje
                y se enfoca el primero. */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                typography.labelMd,
                "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-70 lg:min-h-9"
              )}
            >
              {mutation.isPending
                ? "Guardando…"
                : isEdit
                  ? "Guardar cambios"
                  : "Registrar aeronave"}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

// Qué abre el formulario: {} para registrar; { aircraft } para editar esa aeronave.
export interface AircraftFormTarget {
  aircraft?: Aircraft
}

interface AircraftFormDialogProps {
  target: AircraftFormTarget | null
  onClose: () => void
}

// Ventana «Registrar aeronave» / «Editar aeronave». Pide los catálogos (modelos y
// bases); cambian poco, así que se reutilizan 10 minutos (ADR 003).
const AircraftFormDialog = ({ target, onClose }: AircraftFormDialogProps) => {
  // Último destino abierto: el formulario sigue visible durante la animación de cierre.
  const [shown, setShown] = useState(target)
  if (target !== null && target !== shown) setShown(target)
  const aircraft = shown?.aircraft

  const options = useQuery({
    queryKey: ["aircraft", "options"],
    queryFn: getAircraftOptions,
    staleTime: 10 * 60 * 1000,
    enabled: shown !== null,
  })

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {/* Sin la X genérica de shadcn: la pone el encabezado, en español y en blanco. */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-2xl"
      >
        <AircraftDialogHeader
          icon={<FlightIcon className="size-5" />}
          title={
            aircraft
              ? `Editar aeronave ${aircraft.registration}`
              : "Registrar aeronave"
          }
          description="Control operacional de flota · Delta Air Lines"
          closeLabel="Cerrar formulario de aeronave"
        />

        {options.isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "p-5 text-muted-foreground")}
          >
            Cargando formulario…
          </p>
        ) : options.isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "p-5 text-destructive")}
          >
            No se pudo cargar el formulario.
          </p>
        ) : (
          <AircraftForm
            // key: si se abre otra aeronave, el formulario empieza de nuevo.
            key={aircraft?.id ?? "nueva"}
            aircraft={aircraft}
            options={options.data}
            onSaved={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AircraftFormDialog
