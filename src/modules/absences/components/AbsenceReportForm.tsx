import { useId, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Link } from "react-router"
import { toast } from "sonner"

import {
  ChevronDownIcon,
  CloseIcon,
  CriticalAlertIcon,
  DocumentIcon,
  SendIcon,
  UploadIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import AffectedFlightSection from "@/modules/absences/components/AffectedFlightSection"
import { submitAbsenceReport } from "@/modules/absences/data/absences.data"
import { affectedFlightQuery } from "@/modules/absences/data/affectedFlight.query"
import {
  absenceSchema,
  type AbsenceFormInput,
  type AbsenceFormValues,
} from "@/modules/absences/schemas/absence.schema"
import type { AbsenceReason } from "@/modules/absences/types/absences.types"
import { PATHS } from "@/routes/paths"

const REASON_OPTIONS = [
  { value: "incapacidad", label: "Incapacidad médica repentina" },
  { value: "fatiga", label: "Fatiga operacional / RAC 212" },
  { value: "calamidad", label: "Calamidad doméstica o familiar" },
  { value: "traslado", label: "Dificultad de traslado comprobada" },
] satisfies { value: AbsenceReason; label: string }[]

// Referencia estable: React la llama solo al montar el enlace, así el foco no se
// vuelve a mover en cada render.
const focusOnMount = (element: HTMLElement | null) => element?.focus()

const stepBadge = cn(
  typography.labelSm,
  "flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-border text-brand-primary"
)
const fieldLabel = cn(
  typography.labelLg,
  "flex items-center gap-1.5 text-brand-primary"
)
const fieldError = cn(typography.bodySm, "font-medium text-destructive")

// Formulario F1 a F4 con el aviso crítico y las acciones. El envío es simulado: al
// recargar o volver a entrar, el formulario aparece vacío.
const AbsenceReportForm = () => {
  const id = useId()
  const ids = {
    reason: `${id}-reason`,
    reasonError: `${id}-reason-error`,
    notes: `${id}-notes`,
    notesHint: `${id}-notes-hint`,
    notesError: `${id}-notes-error`,
    attachment: `${id}-attachment`,
    attachmentHint: `${id}-attachment-hint`,
    attachmentError: `${id}-attachment-error`,
    criticalNotice: `${id}-critical-notice`,
  }
  const attachmentInput = useRef<HTMLInputElement | null>(null)

  const { data: flight } = useQuery(affectedFlightQuery)

  const mutation = useMutation({
    mutationFn: submitAbsenceReport,
    onSuccess: (receipt) => {
      toast.success("Aviso enviado a despacho", {
        description: `Tu posición en el vuelo ${receipt.flightNumber} quedó liberada para asignar un tripulante en guardia standby.`,
      })
    },
  })

  const {
    control,
    register,
    handleSubmit,
    trigger,
    clearErrors,
    formState: { errors },
  } = useForm<AbsenceFormInput, unknown, AbsenceFormValues>({
    resolver: zodResolver(absenceSchema),
    defaultValues: { reason: "", notes: "", attachment: null },
  })
  const reason = useWatch({ control, name: "reason" })
  const attachmentRequired = reason === "incapacidad"

  const onSubmit = (values: AbsenceFormValues) => {
    if (!flight || mutation.isPending) return
    mutation.mutate({
      flightNumber: flight.flightNumber,
      reason: values.reason,
      notes: values.notes,
      attachment: values.attachment,
    })
  }

  const sent = mutation.isSuccess

  return (
    <form
      noValidate
      // Landmark con el nombre del h1 de AbsenceReportHeader (id fijo: pantalla única).
      aria-labelledby="reportar-ausencia-titulo"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      {/* También durante el envío: lo que queda como enviado es lo que se envió. */}
      <fieldset
        disabled={sent || mutation.isPending}
        className="flex min-w-0 flex-col gap-6"
      >
        <AffectedFlightSection />

        {/* F2 */}
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.reason} className={fieldLabel}>
            <span aria-hidden="true" className={stepBadge}>
              2
            </span>
            Motivo de la Ausencia
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </label>
          <div className="relative">
            <select
              id={ids.reason}
              aria-required="true"
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={errors.reason ? ids.reasonError : undefined}
              className={cn(
                typography.bodyMd,
                "min-h-11 w-full appearance-none truncate rounded-sm border border-muted-foreground/70 bg-muted py-2 pr-10 pl-4 text-brand-primary transition-colors focus-visible:border-brand-tertiary focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none lg:min-h-10"
              )}
              {...register("reason", { deps: "attachment" })}
            >
              <option value="" disabled>
                Selecciona la tipología de novedad operacional…
              </option>
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          {errors.reason ? (
            <p id={ids.reasonError} className={fieldError}>
              {errors.reason.message}
            </p>
          ) : null}
        </div>

        {/* F3 */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={ids.notes} className={fieldLabel}>
              <span aria-hidden="true" className={stepBadge}>
                3
              </span>
              Observaciones Adicionales
            </label>
            <span
              id={ids.notesHint}
              className={cn(typography.bodySm, "text-muted-foreground")}
            >
              Máx. 300 caracteres
            </span>
          </div>
          <textarea
            id={ids.notes}
            rows={3}
            maxLength={300}
            placeholder="Indica brevemente los síntomas, diagnóstico inicial o detalles para la supervisión de despacho…"
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={
              errors.notes
                ? `${ids.notesHint} ${ids.notesError}`
                : ids.notesHint
            }
            className={cn(
              typography.bodyMd,
              "w-full resize-none rounded-sm border border-muted-foreground/70 bg-muted p-4 text-brand-primary transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none"
            )}
            {...register("notes")}
          />
          {errors.notes ? (
            <p id={ids.notesError} className={fieldError}>
              {errors.notes.message}
            </p>
          ) : null}
        </div>

        {/* F4: el input cubre toda la zona, así clic y arrastrar funcionan sin código. */}
        <Controller
          control={control}
          name="attachment"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.attachment} className={fieldLabel}>
                <span aria-hidden="true" className={stepBadge}>
                  4
                </span>
                Soporte o Incapacidad Médica
                {attachmentRequired ? (
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                ) : null}
              </label>
              {/* Foco solo del input (no de «Quitar archivo»); outline-hidden se ve en colores forzados. */}
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-muted-foreground/70 bg-muted p-4 text-center transition-colors has-aria-invalid:border-2 has-aria-invalid:border-destructive has-[input:disabled]:opacity-70 has-[input:enabled]:hover:bg-brand-neutral has-[input:focus-visible]:border-brand-tertiary has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-brand-tertiary has-[input:focus-visible]:outline-hidden motion-reduce:transition-none sm:p-6">
                <input
                  ref={(element) => {
                    field.ref(element)
                    attachmentInput.current = element
                  }}
                  id={ids.attachment}
                  type="file"
                  name={field.name}
                  accept=".pdf,.png,.jpg,.jpeg"
                  aria-required={attachmentRequired ? true : undefined}
                  aria-invalid={fieldState.error ? true : undefined}
                  aria-describedby={
                    fieldState.error
                      ? `${ids.attachmentHint} ${ids.attachmentError}`
                      : ids.attachmentHint
                  }
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(event.target.files?.[0] ?? null)
                    void trigger("attachment")
                  }}
                  className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
                <span
                  aria-hidden="true"
                  className="mb-2 flex size-12 items-center justify-center rounded-xl bg-brand-border text-brand-primary"
                >
                  <UploadIcon className="size-6" />
                </span>
                <p className={cn(typography.labelLg, "text-brand-primary")}>
                  Arrastra o haz clic para subir comprobante médico o
                  incapacidad
                </p>
                <p
                  id={ids.attachmentHint}
                  className={cn(typography.bodySm, "text-muted-foreground")}
                >
                  Formatos admitidos: PDF, PNG, JPG (Máx 10 MB)
                </p>
                {field.value ? (
                  <p className="relative z-10 mt-2 flex max-w-full items-center gap-1 rounded-full bg-brand-neutral py-1 pr-1 pl-3">
                    <DocumentIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand-secondary"
                    />
                    <span
                      className={cn(
                        typography.labelSm,
                        "truncate font-medium text-brand-primary"
                      )}
                    >
                      {field.value.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar archivo ${field.value.name}`}
                      onClick={() => {
                        field.onChange(null)
                        clearErrors("attachment")
                        if (attachmentInput.current) {
                          attachmentInput.current.value = ""
                          attachmentInput.current.focus()
                        }
                      }}
                      className="relative flex size-7 shrink-0 items-center justify-center rounded-full text-destructive after:absolute after:-inset-2 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CloseIcon aria-hidden="true" className="size-4" />
                    </button>
                  </p>
                ) : null}
              </div>
              {fieldState.error ? (
                // role="alert": se valida al elegir el archivo, sin mover el foco.
                <p id={ids.attachmentError} role="alert" className={fieldError}>
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />
      </fieldset>

      {/* Aviso estático: sin role="alert". bg-destructive/10 aproxima error-container. */}
      <div className="flex items-start gap-3 rounded-md bg-destructive/10 p-4 sm:gap-4">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"
        >
          <CriticalAlertIcon className="size-5" />
        </span>
        <div className="flex flex-col">
          <p
            className={cn(
              typography.labelLg,
              "font-bold tracking-tight text-destructive"
            )}
          >
            Aviso Operacional Crítico
          </p>
          <p
            id={ids.criticalNotice}
            className={cn(typography.bodySm, "mt-0.5 text-foreground")}
          >
            Al enviar este reporte, el sistema liberará tu posición
            inmediatamente para que el algoritmo de supervisión OCC asigne un
            tripulante en guardia standby. Esta acción genera trazabilidad
            auditada bajo RAC 121.
          </p>
        </div>
      </div>

      {mutation.isError ? (
        <p role="alert" className={cn(typography.bodyMd, "text-destructive")}>
          No se pudo enviar el aviso. Intenta de nuevo o llama a la línea de
          emergencia OCC.
        </p>
      ) : null}

      {sent ? (
        // Estado persistente sin región viva: el toast ya lo anuncia.
        <div className="flex flex-col items-center justify-end gap-2 sm:flex-row sm:gap-4">
          <p
            className={cn(
              typography.bodyMd,
              "text-center text-brand-primary sm:text-left"
            )}
          >
            Aviso enviado a despacho para el vuelo {mutation.data.flightNumber}.
          </p>
          <Link
            ref={focusOnMount}
            to={PATHS.tripulante.inicio}
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md border border-transparent bg-muted px-6 py-2 text-brand-primary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-border-strong motion-reduce:transition-none sm:w-auto lg:min-h-10"
            )}
          >
            Volver al Inicio
          </Link>
        </div>
      ) : (
        <div className="flex flex-col-reverse items-center justify-end gap-2 sm:flex-row">
          <Link
            to={PATHS.tripulante.inicio}
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-transparent px-6 py-2 text-muted-foreground transition-colors hover:bg-brand-neutral hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-border motion-reduce:transition-none sm:w-auto lg:min-h-10"
            )}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            // El botón se describe con la consecuencia del envío (liberar la posición).
            aria-describedby={ids.criticalNotice}
            disabled={!flight}
            // Enviando: aria-disabled y no disabled, para que el foco no caiga a <body>
            // y siga en el botón si hay que reintentar; onSubmit ignora el segundo envío.
            aria-disabled={mutation.isPending || undefined}
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-transparent bg-brand-secondary px-6 py-2 text-white shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden enabled:hover:bg-brand-secondary-hover enabled:active:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transition-none sm:w-auto sm:px-10 lg:min-h-10"
            )}
          >
            <SendIcon aria-hidden="true" className="size-4.5 shrink-0" />
            {mutation.isPending ? "Enviando aviso…" : "Enviar Aviso a Despacho"}
          </button>
        </div>
      )}
    </form>
  )
}

export default AbsenceReportForm
