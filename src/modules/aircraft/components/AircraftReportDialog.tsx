import { useId, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  ConfirmedIcon,
  DocumentIcon,
  EditIcon,
  WarningIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import AircraftDialogHeader from "@/modules/aircraft/components/AircraftDialogHeader"
import {
  getAircraftReport,
  releaseToService,
  setMaintenanceTask,
} from "@/modules/aircraft/data/aircraft.data"
import type {
  Aircraft,
  MaintenanceHistoryEntry,
  MaintenanceRecord,
} from "@/modules/aircraft/types/aircraft.types"
import { aircraftPhotoSrc } from "@/modules/aircraft/utils/aircraftPhoto"
import {
  AIRCRAFT_STATUS,
  CATEGORY_LABEL,
  MAINTENANCE_LABEL,
  crewText,
  statusLabelOf,
} from "@/modules/aircraft/utils/aircraftStatus"
import { formatDate, formatNumber } from "@/modules/aircraft/utils/formatDate"

const cardClass = "min-w-0 rounded-lg bg-card p-4 shadow-xs"
const sectionTitleClass = cn(
  typography.labelSm,
  "mb-3 text-brand-secondary uppercase"
)
const labelClass = cn(typography.labelSm, "text-muted-foreground uppercase")
const valueClass = cn(typography.labelLg, "font-bold text-brand-primary")

// Par etiqueta/valor de la ficha.
const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className={labelClass}>{label}</dt>
    <dd className={cn(valueClass, "break-words")}>{value}</dd>
  </div>
)

// Datos de la aeronave: foto, identificación, configuración, uso acumulado y estado.
const AircraftSection = ({ aircraft }: { aircraft: Aircraft }) => {
  const titleId = useId()
  const status = AIRCRAFT_STATUS[aircraft.status]
  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <h3 id={titleId} className={sectionTitleClass}>
        Datos de la aeronave
      </h3>
      <div className="flex flex-col gap-4">
        <img
          src={aircraftPhotoSrc(aircraft.photoUrl)}
          alt={`Foto de la aeronave ${aircraft.registration}`}
          className="aspect-[21/9] w-full rounded-md object-cover"
        />
        {/* Celular: dos columnas. Desde sm: tres. */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Matrícula" value={aircraft.registration} />
          <Field label="Número de serie" value={aircraft.msn} />
          <Field label="Modelo" value={aircraft.modelName} />
          <Field label="Categoría" value={CATEGORY_LABEL[aircraft.category]} />
          <Field label="Capacidad" value={`${aircraft.capacity} pasajeros`} />
          <Field
            label="Tripulación mínima"
            value={crewText(aircraft.minimumCrew)}
          />
          <Field label="Motores" value={aircraft.engines} />
          <Field
            label="Año de fabricación"
            value={String(aircraft.manufactureYear)}
          />
          <Field
            label="En la flota desde"
            value={formatDate(aircraft.inFleetSince)}
          />
          <Field
            label="Horas de vuelo"
            value={`${formatNumber(aircraft.flightHours)} h`}
          />
          <Field label="Ciclos" value={formatNumber(aircraft.cycles)} />
          <Field label="Base principal" value={aircraft.baseName} />
          <div className="flex min-w-0 flex-col gap-1">
            <dt className={labelClass}>Estado</dt>
            <dd>
              <span
                className={cn(
                  typography.labelSm,
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
                  status.badgeClass
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", status.dotClass)}
                />
                {statusLabelOf(aircraft)}
              </span>
            </dd>
          </div>
        </dl>
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          Ciclos: cada despegue y aterrizaje cuenta como uno. Horas y ciclos son
          el uso total del avión, como el kilometraje de un carro.
        </p>
      </div>
    </section>
  )
}

// Mantenimiento en curso: motivo, descripción, orden, hangar, fecha, avance y tareas
// (casillas que se guardan al marcarlas). Con todas hechas se puede liberar a servicio.
const MaintenanceSection = ({
  aircraft,
  maintenance,
}: {
  aircraft: Aircraft
  maintenance: MaintenanceRecord
}) => {
  const titleId = useId()
  const progressId = useId()
  const queryClient = useQueryClient()
  const done = maintenance.tasks.filter((task) => task.done).length
  const total = maintenance.tasks.length
  const percent = Math.round((done / total) * 100)
  const allDone = done === total

  // Marcar o desmarcar una tarea (con la API, un PATCH). Al terminar se refresca el
  // informe para ver el avance.
  const toggleTask = useMutation({
    mutationFn: ({ index, value }: { index: number; value: boolean }) =>
      setMaintenanceTask(aircraft.id, index, value),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["aircraft", "report", aircraft.id],
      }),
    onError: () =>
      toast.error("No se pudo guardar la tarea", {
        description: "Intenta marcarla de nuevo.",
      }),
  })

  // Liberar a servicio (con la API, un POST): queda operativa y la reparación pasa al
  // historial. Refresca la tabla, los indicadores y el informe.
  const release = useMutation({
    mutationFn: () => releaseToService(aircraft.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aircraft"] })
      toast.success("Aeronave liberada a servicio", {
        description: `${aircraft.registration} volvió a estar operativa.`,
      })
    },
  })

  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <h3 id={titleId} className={sectionTitleClass}>
        Mantenimiento
      </h3>
      <div className="flex flex-col gap-4">
        {/* Qué le pasa al avión, resaltado en rojo. */}
        <div className="flex items-start gap-3 rounded-md bg-error-container p-3 text-on-error-container">
          <WarningIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={cn(typography.labelLg, "font-bold")}>
              {MAINTENANCE_LABEL[maintenance.type]}
            </p>
            <p className={typography.bodySm}>
              {maintenance.description ?? "Sin descripción del problema."}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className={labelClass}>Orden de taller</dt>
            <dd className={cn(valueClass, "font-mono")}>
              {maintenance.orderNumber}
            </dd>
          </div>
          <Field label="Hangar" value={maintenance.hangar} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className={labelClass}>En hangar desde</dt>
            <dd className={valueClass}>
              <time dateTime={maintenance.openedOn}>
                {formatDate(maintenance.openedOn)}
              </time>
            </dd>
          </div>
        </dl>

        {/* Avance: barra con nombre y valor para el lector de pantalla. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={labelClass}>Avance de la reparación</span>
            <span
              id={progressId}
              aria-live="polite"
              className={cn(
                typography.labelMd,
                "font-semibold text-brand-primary"
              )}
            >
              {done} de {total} tareas completadas
            </span>
          </div>
          <div
            role="progressbar"
            aria-labelledby={progressId}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-brand-neutral"
          >
            <div
              className="h-full rounded-full bg-brand-secondary transition-[width] motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Tareas: casillas reales; se guardan al marcarlas. */}
        <fieldset className="min-w-0">
          <legend className={cn(labelClass, "float-left mb-2 w-full")}>
            Tareas (marca las que ya están hechas)
          </legend>
          <ul className="clear-both flex flex-col gap-1">
            {maintenance.tasks.map((task, index) => (
              <li key={task.name}>
                <label
                  className={cn(
                    typography.bodySm,
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 transition-colors hover:bg-muted lg:min-h-9",
                    task.done ? "text-brand-primary" : "text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={toggleTask.isPending || release.isPending}
                    onChange={(event) =>
                      toggleTask.mutate({ index, value: event.target.checked })
                    }
                    className="size-4.5 shrink-0 cursor-pointer accent-brand-secondary disabled:cursor-wait"
                  />
                  <span className={task.done ? "font-medium" : undefined}>
                    {task.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {/* Liberar a servicio: solo con todas las tareas hechas. */}
        <div className="flex flex-col gap-2 border-t border-brand-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              typography.bodySm,
              allDone ? "text-brand-primary" : "text-muted-foreground"
            )}
          >
            {allDone
              ? "Todas las tareas están hechas: el avión puede volver a servicio."
              : "Cuando todas las tareas estén hechas podrás liberar el avión."}
          </p>
          <button
            type="button"
            disabled={!allDone || release.isPending}
            onClick={() => release.mutate()}
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-muted-foreground lg:min-h-9"
            )}
          >
            <ConfirmedIcon aria-hidden="true" className="size-4" />
            {release.isPending ? "Liberando…" : "Liberar a servicio"}
          </button>
        </div>
        {release.isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            No se pudo liberar la aeronave. Intenta de nuevo.
          </p>
        ) : null}
      </div>
    </section>
  )
}

// Reparaciones ya terminadas, de la más reciente a la más antigua.
const HistorySection = ({
  history,
}: {
  history: MaintenanceHistoryEntry[]
}) => {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <h3 id={titleId} className={sectionTitleClass}>
        Historial de mantenimientos
      </h3>
      {history.length === 0 ? (
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          Sin mantenimientos anteriores.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-brand-border">
          {history.map((entry) => (
            <li
              key={entry.orderNumber}
              className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  typography.labelMd,
                  "font-bold text-brand-primary"
                )}
              >
                {MAINTENANCE_LABEL[entry.type]}
              </span>
              {entry.description ? (
                <span className={cn(typography.bodySm, "text-brand-primary")}>
                  {entry.description}
                </span>
              ) : null}
              <span className={cn(typography.bodySm, "text-muted-foreground")}>
                {formatDate(entry.openedOn)} – {formatDate(entry.closedOn)} ·{" "}
                {entry.hangar} · {entry.orderNumber}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

interface AircraftReportDialogProps {
  aircraft: Aircraft | null
  onClose: () => void
  // «Editar» cierra el informe y abre el formulario de esa aeronave.
  onEdit: (aircraft: Aircraft) => void
}

// Ventana «Informe de aeronave»: todos los datos del avión, su mantenimiento en curso
// (si está en hangar) y su historial (["aircraft", "report", id]).
const AircraftReportDialog = ({
  aircraft,
  onClose,
  onEdit,
}: AircraftReportDialogProps) => {
  // Última aeronave abierta: el contenido sigue visible durante la animación de cierre.
  const [shown, setShown] = useState(aircraft)
  if (aircraft !== null && aircraft !== shown) setShown(aircraft)

  const { data, isPending, isError } = useQuery({
    queryKey: ["aircraft", "report", shown?.id],
    queryFn: () => getAircraftReport(shown?.id as string),
    enabled: shown !== null,
  })

  return (
    <Dialog
      open={aircraft !== null}
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
          icon={<DocumentIcon className="size-5" />}
          title={`Informe de aeronave · ${shown?.registration ?? ""}`}
          description={
            shown ? `${shown.modelName} · Base ${shown.baseCode}` : ""
          }
          closeLabel="Cerrar informe de aeronave"
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          {isPending ? (
            <p
              role="status"
              className={cn(typography.bodySm, "text-muted-foreground")}
            >
              Cargando informe…
            </p>
          ) : isError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudo cargar el informe.
            </p>
          ) : (
            <>
              <AircraftSection aircraft={data.aircraft} />
              {data.maintenance ? (
                <MaintenanceSection
                  // key: si se abre otra aeronave, sus estados empiezan de nuevo.
                  key={data.aircraft.id}
                  aircraft={data.aircraft}
                  maintenance={data.maintenance}
                />
              ) : null}
              <HistorySection history={data.history} />
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-brand-border bg-card px-5 py-3">
          <DialogClose
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 items-center rounded-md px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
            )}
          >
            Cerrar
          </DialogClose>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && onEdit(data.aircraft)}
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-secondary px-4 font-semibold text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:opacity-60 lg:min-h-9"
            )}
          >
            <EditIcon aria-hidden="true" className="size-4" />
            Editar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AircraftReportDialog
