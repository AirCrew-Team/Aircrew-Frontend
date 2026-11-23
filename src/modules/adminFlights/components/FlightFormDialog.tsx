import { useId, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { FlightRequestError } from "@/App/actions/flights/flightsAdmin.actions"
import { FlightIcon, SyncIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import FlightDialogHeader from "@/modules/adminFlights/components/FlightDialogHeader"
import {
  useFlightsAdminApi,
  useFlightsCatalog,
} from "@/modules/adminFlights/hooks/useFlightsAdminApi"
import {
  flightInstants,
  flightSchemaFor,
  type FlightFormValues,
} from "@/modules/adminFlights/schemas/flight.schema"
import type {
  Airport,
  FlightsCatalog,
} from "@/modules/adminFlights/types/adminFlights.types"
import { crewRequirement } from "@/modules/adminFlights/utils/crewRequirement"
import { estimatedMinutes } from "@/modules/adminFlights/utils/flightEstimate"
import {
  formatDuration,
  formatInZone,
  utcToZoned,
  zonedToUtc,
} from "@/modules/adminFlights/utils/flightTime"

// Campos con el mismo borde, foco y error que los formularios del proyecto.
// text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
const controlClass = cn(
  typography.bodySm,
  "min-h-11 w-full min-w-0 rounded-sm border border-muted-foreground/70 bg-card px-3 py-2 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
)
const cardClass = "min-w-0 rounded-lg bg-card p-4 shadow-xs"
// float-left + w-full: la legend queda dentro de la tarjeta como un título normal.
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
const infoClass = cn(
  typography.bodySm,
  "rounded-md bg-muted px-3 py-2 text-muted-foreground"
)

const RequiredMark = () => (
  <span aria-hidden="true" className="text-destructive">
    {" "}
    *
  </span>
)

const EMPTY_VALUES: FlightFormValues = {
  flightNumber: "",
  gate: "",
  origin: "",
  destination: "",
  departureDate: "",
  departureTime: "",
  arrivalDate: "",
  arrivalTime: "",
  aircraftId: "",
}

// «BOG · Bogotá (El Dorado)».
const airportLabel = (airport: Airport) =>
  `${airport.code} · ${airport.city} (${airport.name})`

// Llegada estimada: la salida (en la hora del origen) más la duración estimada de la
// ruta, en la fecha y la hora del destino. null si falta algo o si algún aeropuerto no
// tiene coordenadas.
const estimateArrival = (
  values: Pick<
    FlightFormValues,
    "origin" | "destination" | "departureDate" | "departureTime"
  >,
  airports: Airport[]
) => {
  const origin = airports.find((airport) => airport.code === values.origin)
  const destination = airports.find(
    (airport) => airport.code === values.destination
  )
  if (!origin || !destination || origin.code === destination.code) return null
  const minutes = estimatedMinutes(origin, destination)
  const departure = zonedToUtc(
    values.departureDate,
    values.departureTime,
    origin.timezone
  )
  if (minutes === null || !departure) return null
  const arrival = new Date(departure.getTime() + minutes * 60_000)
  const local = formatInZone(arrival.toISOString(), destination.timezone)
  return {
    ...utcToZoned(arrival, destination.timezone),
    minutes,
    // «10 abr · 10:25», para el botón «Usar la llegada estimada».
    label: `${local.day} · ${local.time}`,
  }
}

// Opciones de aeropuerto: primero las bases de la tripulación, luego el resto.
const AirportOptions = ({ airports }: { airports: Airport[] }) => {
  const bases = airports.filter((airport) => airport.isBase)
  const others = airports.filter((airport) => !airport.isBase)
  return (
    <>
      <option value="">Selecciona…</option>
      <optgroup label="Bases">
        {bases.map((airport) => (
          <option key={airport.code} value={airport.code}>
            {airportLabel(airport)}
          </option>
        ))}
      </optgroup>
      {others.length > 0 ? (
        <optgroup label="Otros destinos">
          {others.map((airport) => (
            <option key={airport.code} value={airport.code}>
              {airportLabel(airport)}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  )
}

interface FlightFormProps {
  catalog: FlightsCatalog
  onSaved: () => void
}

const FlightForm = ({ catalog, onSaved }: FlightFormProps) => {
  const id = useId()
  const queryClient = useQueryClient()
  const { createFlight } = useFlightsAdminApi()
  const schema = useMemo(
    () => flightSchemaFor(catalog.airports),
    [catalog.airports]
  )

  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<FlightFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  })
  const values = useWatch({ control }) as FlightFormValues
  const cityOf = (code: string) =>
    catalog.airports.find((airport) => airport.code === code)?.city
  const aircraft = catalog.aircraft.find(
    (option) => option.id === values.aircraftId
  )
  const { departure, arrival } = flightInstants(values, catalog.airports)
  const minutes =
    departure && arrival
      ? Math.round((arrival.getTime() - departure.getTime()) / 60_000)
      : null
  const validDuration = minutes !== null && minutes > 0

  // Llegada propuesta: la salida más la duración estimada de la ruta, en la hora y el
  // día del destino. Se llena sola hasta que el admin la cambia a mano.
  const [arrivalManual, setArrivalManual] = useState(false)
  const estimate = estimateArrival(values, catalog.airports)

  const applyArrival = (next: ReturnType<typeof estimateArrival>) => {
    if (!next) return
    const options = { shouldValidate: isSubmitted }
    setValue("arrivalDate", next.date, options)
    setValue("arrivalTime", next.time, options)
  }

  // Tras cambiar la ruta o la salida: propone la llegada si el admin no la escribió.
  // Sin coordenadas no hay estimación: al menos se propone el mismo día de la salida.
  const proposeArrival = () => {
    if (arrivalManual) return
    const current = getValues()
    const next = estimateArrival(current, catalog.airports)
    if (next) applyArrival(next)
    else if (current.departureDate && !current.arrivalDate) {
      setValue("arrivalDate", current.departureDate)
    }
  }

  // «Usar la llegada estimada»: vuelve a la propuesta y la sigue actualizando.
  const restoreEstimatedArrival = () => {
    setArrivalManual(false)
    applyArrival(estimateArrival(getValues(), catalog.airports))
  }

  // Crear (POST). El vuelo nace «Programado» y sin tripulación.
  const mutation = useMutation({
    mutationFn: (form: FlightFormValues) => {
      const instants = flightInstants(form, catalog.airports)
      return createFlight({
        flightNumber: form.flightNumber.trim().toUpperCase(),
        aircraftId: form.aircraftId,
        origin: form.origin,
        destination: form.destination,
        departureAt: (instants.departure as Date).toISOString(),
        arrivalAt: (instants.arrival as Date).toISOString(),
        gate: form.gate.trim() ? form.gate.trim().toUpperCase() : null,
      })
    },
    onSuccess: (flight) => {
      // Refresca la tabla, los indicadores y los conteos de los filtros.
      queryClient.invalidateQueries({ queryKey: ["adminFlights"] })
      toast.success(`Vuelo ${flight.flightNumber} creado`, {
        description:
          "Ya aparece en Programación para que el supervisor asigne la tripulación.",
      })
      onSaved()
    },
    onError: (error) => {
      // El backend dice qué campo falló (número repetido, aeronave ocupada…): el
      // mensaje va debajo de ese campo y se enfoca.
      if (error instanceof FlightRequestError && error.field) {
        setError(error.field, { message: error.message }, { shouldFocus: true })
      }
    },
  })

  // Error que no es de un campo: el texto del backend o el aviso general.
  const genericError =
    mutation.isError &&
    !(mutation.error instanceof FlightRequestError && mutation.error.field)
      ? mutation.error instanceof FlightRequestError
        ? mutation.error.message
        : "No se pudo crear el vuelo. Intenta de nuevo."
      : null

  const describedBy = (name: keyof FlightFormValues, hint?: boolean) =>
    [hint && `${id}-${name}-hint`, errors[name] && `${id}-${name}-error`]
      .filter(Boolean)
      .join(" ") || undefined

  const fieldError = (name: keyof FlightFormValues) =>
    errors[name]?.message ? (
      <p id={`${id}-${name}-error`} className={errorClass}>
        {errors[name]?.message}
      </p>
    ) : null

  // Props comunes de un campo obligatorio.
  const requiredField = (name: keyof FlightFormValues, hint?: boolean) => ({
    id: `${id}-${name}`,
    "aria-required": true,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(name, hint),
  })

  // Intercambia origen y destino (vuelo de regreso).
  const swapRoute = () => {
    const { origin, destination } = getValues()
    setValue("origin", destination)
    setValue("destination", origin)
    proposeArrival()
  }

  return (
    // noValidate: los mensajes los pone el formulario (en español y accesibles).
    <form
      noValidate
      onSubmit={handleSubmit((form) => mutation.mutate(form))}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
        {/* Vuelo: número y puerta. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Vuelo</legend>
          <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-flightNumber`} className={fieldLabelClass}>
                Número de vuelo
                <RequiredMark />
              </label>
              <input
                {...requiredField("flightNumber", true)}
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={6}
                placeholder="Ej. DL1234"
                className={cn(controlClass, "font-mono uppercase")}
                {...register("flightNumber")}
              />
              <p id={`${id}-flightNumber-hint`} className={hintClass}>
                Código de la aerolínea y de 1 a 4 números.
              </p>
              {fieldError("flightNumber")}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-gate`} className={fieldLabelClass}>
                Puerta{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              <input
                id={`${id}-gate`}
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={5}
                placeholder="Ej. A12"
                aria-invalid={errors.gate ? true : undefined}
                aria-describedby={describedBy("gate")}
                className={cn(controlClass, "font-mono uppercase")}
                {...register("gate")}
              />
              {fieldError("gate")}
            </div>
          </div>
        </fieldset>

        {/* Ruta: origen y destino del catálogo, con botón para intercambiarlos. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Ruta</legend>
          <div className="clear-both grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-origin`} className={fieldLabelClass}>
                Origen
                <RequiredMark />
              </label>
              <select
                {...requiredField("origin")}
                className={controlClass}
                {...register("origin", { onChange: proposeArrival })}
              >
                <AirportOptions airports={catalog.airports} />
              </select>
              {fieldError("origin")}
            </div>
            <button
              type="button"
              onClick={swapRoute}
              aria-label="Intercambiar origen y destino"
              title="Intercambiar origen y destino"
              className="inline-flex size-11 items-center justify-center self-center rounded-md text-brand-secondary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden max-sm:justify-self-center sm:mt-6 lg:size-9"
            >
              <SyncIcon
                aria-hidden="true"
                className="size-4 max-sm:rotate-90"
              />
            </button>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-destination`} className={fieldLabelClass}>
                Destino
                <RequiredMark />
              </label>
              <select
                {...requiredField("destination")}
                className={controlClass}
                {...register("destination", { onChange: proposeArrival })}
              >
                <AirportOptions airports={catalog.airports} />
              </select>
              {fieldError("destination")}
            </div>
          </div>
        </fieldset>

        {/* Horario: cada hora en la del aeropuerto correspondiente. */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Horario</legend>
          <div className="clear-both flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor={`${id}-departureDate`}
                  className={fieldLabelClass}
                >
                  Fecha de salida
                  <RequiredMark />
                </label>
                <input
                  {...requiredField("departureDate")}
                  type="date"
                  className={controlClass}
                  {...register("departureDate", { onChange: proposeArrival })}
                />
                {fieldError("departureDate")}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor={`${id}-departureTime`}
                  className={fieldLabelClass}
                >
                  Hora de salida
                  <RequiredMark />
                </label>
                <input
                  {...requiredField("departureTime", true)}
                  type="time"
                  className={controlClass}
                  {...register("departureTime", { onChange: proposeArrival })}
                />
                <p id={`${id}-departureTime-hint`} className={hintClass}>
                  {values.origin
                    ? `Hora local de ${cityOf(values.origin)}.`
                    : "Hora local del origen."}
                </p>
                {fieldError("departureTime")}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor={`${id}-arrivalDate`}
                  className={fieldLabelClass}
                >
                  Fecha de llegada
                  <RequiredMark />
                </label>
                <input
                  {...requiredField("arrivalDate")}
                  type="date"
                  className={controlClass}
                  {...register("arrivalDate", {
                    // Escrita a mano: ya no se reemplaza con la estimada.
                    onChange: () => setArrivalManual(true),
                  })}
                />
                {fieldError("arrivalDate")}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor={`${id}-arrivalTime`}
                  className={fieldLabelClass}
                >
                  Hora de llegada
                  <RequiredMark />
                </label>
                <input
                  {...requiredField("arrivalTime", true)}
                  type="time"
                  className={controlClass}
                  {...register("arrivalTime", {
                    onChange: () => setArrivalManual(true),
                  })}
                />
                <p id={`${id}-arrivalTime-hint`} className={hintClass}>
                  {values.destination
                    ? `Hora local de ${cityOf(values.destination)}.`
                    : "Hora local del destino."}
                </p>
                {fieldError("arrivalTime")}
              </div>
            </div>
            {/* Duración (se anuncia al cambiar) y, si la llegada se escribió a mano,
                la opción de volver a la estimada. */}
            <div
              aria-live="polite"
              className={cn(
                infoClass,
                "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              )}
            >
              <p>
                {validDuration ? (
                  <>
                    Duración:{" "}
                    <span className="font-semibold text-brand-primary">
                      {formatDuration(minutes)}
                    </span>
                    {arrivalManual
                      ? null
                      : " (estimada según la distancia de la ruta; puedes cambiar la llegada)"}
                  </>
                ) : values.origin &&
                  values.destination &&
                  values.departureDate &&
                  values.departureTime &&
                  !estimate ? (
                  // Algún aeropuerto sin coordenadas: no hay con qué estimar.
                  "No hay datos para estimar esta ruta: escribe la fecha y la hora de llegada."
                ) : (
                  "Elige la ruta y la salida: la llegada se calcula sola."
                )}
              </p>
              {arrivalManual && estimate ? (
                <button
                  type="button"
                  onClick={restoreEstimatedArrival}
                  className={cn(
                    typography.labelMd,
                    "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 font-semibold text-brand-secondary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-8"
                  )}
                >
                  Usar la llegada estimada ({estimate.label})
                </button>
              ) : null}
            </div>
          </div>
        </fieldset>

        {/* Aeronave: solo las operativas. El modelo es el «tipo de avión». */}
        <fieldset className={cardClass}>
          <legend className={legendClass}>Aeronave</legend>
          <div className="clear-both flex flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-aircraftId`} className={fieldLabelClass}>
                Aeronave
                <RequiredMark />
              </label>
              <select
                {...requiredField("aircraftId", true)}
                className={controlClass}
                {...register("aircraftId")}
              >
                <option value="">Selecciona…</option>
                {catalog.aircraft.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.registration} · {option.name} · {option.capacity}{" "}
                    sillas
                  </option>
                ))}
              </select>
              <p id={`${id}-aircraftId-hint`} className={hintClass}>
                Solo las aeronaves operativas. Las de mantenimiento no se pueden
                programar.
              </p>
              {fieldError("aircraftId")}
            </div>
            {/* Lo que tendrá que asignar el supervisor (se anuncia al cambiar). */}
            <div aria-live="polite" className={infoClass}>
              {aircraft ? (
                <>
                  <p className="font-semibold text-brand-primary">
                    Tripulación requerida:{" "}
                    {
                      crewRequirement(
                        aircraft.capacity,
                        validDuration ? minutes : 0
                      ).text
                    }
                  </p>
                  <p>La asigna el supervisor en Programación.</p>
                </>
              ) : (
                <p>Elige la aeronave para ver la tripulación requerida.</p>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      {/* Pie: error general (si lo hay) y los botones. */}
      <div className="flex justify-end border-t border-brand-border bg-card px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {genericError ? (
            <p role="alert" className={errorClass}>
              {genericError}
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
            {/* Siempre activo: si falta algo, cada campo muestra su mensaje y se
                enfoca el primero. */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                typography.labelMd,
                "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-70 lg:min-h-9"
              )}
            >
              {mutation.isPending ? "Creando…" : "Crear vuelo"}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

interface FlightFormDialogProps {
  open: boolean
  onClose: () => void
}

// Ventana «Crear vuelo». Pide el catálogo (aeropuertos y aeronaves operativas) al abrir.
const FlightFormDialog = ({ open, onClose }: FlightFormDialogProps) => {
  const catalog = useFlightsCatalog(open)
  // Cada apertura empieza con el formulario vacío.
  const [formKey, setFormKey] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setFormKey((key) => key + 1)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      {/* Sin la X genérica de shadcn: la pone el encabezado, en español y en blanco. */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-2xl"
      >
        <FlightDialogHeader
          icon={<FlightIcon className="size-5" />}
          title="Crear vuelo"
          description="Programación de vuelos · Flight Ops Central"
          closeLabel="Cerrar formulario de vuelo"
        />
        {catalog.isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "p-5 text-muted-foreground")}
          >
            Cargando formulario…
          </p>
        ) : catalog.isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "p-5 text-destructive")}
          >
            No se pudo cargar el formulario.
          </p>
        ) : (
          <FlightForm key={formKey} catalog={catalog.data} onSaved={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default FlightFormDialog
