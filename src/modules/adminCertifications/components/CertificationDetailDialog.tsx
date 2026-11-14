import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { EditIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import CertificationDialogHeader from "@/modules/adminCertifications/components/CertificationDialogHeader"
import CertificationStatusBadge from "@/modules/adminCertifications/components/CertificationStatusBadge"
import { getCertificationDetail } from "@/modules/adminCertifications/data/adminCertifications.data"
import type {
  CertificationDetail,
  CertificationHistoryEntry,
} from "@/modules/adminCertifications/types/adminCertifications.types"
import {
  certificateName,
  primaryCertificate,
  ratings,
} from "@/modules/adminCertifications/utils/certificates"
import {
  crewInitials,
  crewName,
  crewRoleLine,
  formatHistoryDate,
} from "@/modules/adminCertifications/utils/crewFormat"

const cardClass = "flex flex-col gap-3 rounded-lg bg-card p-4 shadow-xs"
const sectionTitleClass = cn(
  typography.labelSm,
  "text-brand-secondary uppercase"
)
const labelClass = cn(typography.labelSm, "text-muted-foreground uppercase")

// Título y color del punto de cada evento del historial.
const HISTORY_EVENT: Record<
  CertificationHistoryEntry["event"],
  { title: string; dot: string }
> = {
  verificado: { title: "Verificado", dot: "bg-emerald-600" },
  registrado: { title: "Certificado registrado", dot: "bg-brand-secondary" },
  actualizado: { title: "Certificado actualizado", dot: "bg-brand-tertiary" },
}

// Certificado FAA: número, tipo, habilitaciones y la copia del certificado.
const CertificateSection = ({
  detail,
  licenseNumber,
}: {
  detail: CertificationDetail
  licenseNumber: string
}) => {
  const titleId = useId()
  const primary = primaryCertificate(detail.certificates)
  const extra = ratings(detail.certificates)
  const { file } = detail

  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <h3 id={titleId} className={sectionTitleClass}>
        Certificado FAA
      </h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className={labelClass}>Número</dt>
          <dd
            className={cn(
              typography.headlineSm,
              "font-mono font-bold text-brand-primary tabular-nums"
            )}
          >
            {licenseNumber}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={labelClass}>Tipo</dt>
          <dd
            className={cn(typography.labelLg, "font-bold text-brand-primary")}
          >
            {primary ? certificateName(primary) : "Sin licencia principal"}
          </dd>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <dt className={labelClass}>Habilitaciones</dt>
          <dd>
            {extra.length > 0 ? (
              <ul
                aria-label="Habilitaciones"
                className="flex flex-wrap gap-1.5"
              >
                {extra.map((code) => (
                  <li
                    key={code}
                    className={cn(
                      typography.labelSm,
                      "rounded-full bg-brand-neutral px-2.5 py-1 text-brand-primary"
                    )}
                  >
                    {certificateName(code)}
                  </li>
                ))}
              </ul>
            ) : (
              <span className={cn(typography.bodySm, "text-muted-foreground")}>
                Ninguna
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* Copia del certificado: con la API se abrirá desde el backend. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border pt-3">
        {file ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  typography.labelSm,
                  "flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-neutral text-brand-secondary uppercase"
                )}
              >
                {file.name.split(".").at(-1)}
              </span>
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    typography.labelMd,
                    "font-semibold break-all text-brand-primary"
                  )}
                >
                  {file.name}
                </span>
                <span
                  className={cn(typography.bodySm, "text-muted-foreground")}
                >
                  Copia del certificado
                </span>
              </div>
            </div>
            {file.url ? (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  typography.labelMd,
                  "inline-flex min-h-11 items-center rounded-md bg-brand-neutral px-4 font-semibold text-brand-secondary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
                )}
              >
                Abrir copia
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  toast.info("Próximamente", {
                    description:
                      "La copia se podrá abrir cuando se conecte el backend.",
                  })
                }
                className={cn(
                  typography.labelMd,
                  "inline-flex min-h-11 items-center rounded-md bg-brand-neutral px-4 font-semibold text-brand-secondary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
                )}
              >
                Abrir copia
              </button>
            )}
          </>
        ) : (
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            Sin copia del certificado adjunta.
          </p>
        )}
      </div>
    </section>
  )
}

// Historial: línea de tiempo del más reciente al más antiguo.
const HistorySection = ({
  history,
}: {
  history: CertificationHistoryEntry[]
}) => {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <h3 id={titleId} className={sectionTitleClass}>
        Historial
      </h3>
      <ol className="flex flex-col">
        {history.map((entry, index) => {
          const { title, dot } = HISTORY_EVENT[entry.event]
          const isLast = index === history.length - 1
          return (
            <li key={`${entry.event}-${index}`} className="flex gap-3">
              {/* Punto y línea de la línea de tiempo (decorativos). */}
              <span
                aria-hidden="true"
                className="flex w-2.5 shrink-0 flex-col items-center"
              >
                <span className={cn("mt-1.5 size-2.5 rounded-full", dot)} />
                {isLast ? null : (
                  <span className="w-px flex-1 bg-brand-border" />
                )}
              </span>
              <div className={cn("flex flex-col", !isLast && "pb-3")}>
                <span
                  className={cn(
                    typography.labelMd,
                    "font-bold text-brand-primary"
                  )}
                >
                  {title}
                </span>
                <span
                  className={cn(typography.bodySm, "text-muted-foreground")}
                >
                  {[entry.by, formatHistoryDate(entry.date), entry.note]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

interface CertificationDetailDialogProps {
  // ID del tripulante; null con la ventana cerrada.
  crewId: string | null
  onClose: () => void
  // «Editar» (con certificado) o «Registrar certificado» (sin él): abre el formulario.
  onEdit: (crewId: string) => void
}

// Ventana del ojo: ficha de la certificación de un tripulante. Pide la ficha solo al
// abrirse (["certifications", "adminDetail", id]). Se cierra con «Cerrar», la X, Esc o
// al pulsar fuera, y el foco vuelve al ojo.
const CertificationDetailDialog = ({
  crewId,
  onClose,
  onEdit,
}: CertificationDetailDialogProps) => {
  // Último tripulante abierto: la ficha sigue visible durante la animación de cierre.
  const [shownId, setShownId] = useState(crewId)
  if (crewId !== null && crewId !== shownId) setShownId(crewId)

  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "adminDetail", shownId],
    queryFn: () => getCertificationDetail(shownId as string),
    enabled: shownId !== null,
  })
  const hasCertificate = Boolean(data?.licenseNumber)

  return (
    <Dialog
      open={crewId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {/* Sin la X genérica de shadcn: la pone el encabezado, en español y en blanco. */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-xl"
      >
        <CertificationDialogHeader
          leading={
            <span
              aria-hidden="true"
              className={cn(
                typography.labelLg,
                "flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-secondary font-heading font-bold text-white"
              )}
            >
              {data ? crewInitials(data) : ""}
            </span>
          }
          title={data ? crewName(data) : "Certificación"}
          description={
            data ? `${crewRoleLine(data)} · ${data.id}` : "Certificaciones FAA"
          }
          trailing={
            data ? <CertificationStatusBadge status={data.status} /> : null
          }
          closeLabel="Cerrar ficha de certificación"
        />

        {/* Cuerpo con su propio desplazamiento: el encabezado y el pie quedan fijos. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          {isPending ? (
            <p
              role="status"
              className={cn(typography.bodySm, "text-muted-foreground")}
            >
              Cargando certificación…
            </p>
          ) : isError ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudo cargar la certificación.
            </p>
          ) : data.licenseNumber ? (
            <>
              <CertificateSection
                detail={data}
                licenseNumber={data.licenseNumber}
              />
              {data.history.length > 0 ? (
                <HistorySection history={data.history} />
              ) : null}
            </>
          ) : (
            // Sin certificado: se dice claro y el pie ofrece registrarlo.
            <p
              className={cn(
                typography.bodyMd,
                "rounded-lg bg-card p-4 text-muted-foreground shadow-xs"
              )}
            >
              Este tripulante aún no tiene un certificado FAA registrado.
            </p>
          )}
        </div>

        {/* Pie: «Cerrar» y «Editar» (o «Registrar certificado» si no tiene). */}
        <div className="flex justify-end gap-2 border-t border-brand-border bg-card px-5 py-3">
          <DialogClose
            className={cn(
              typography.labelMd,
              "inline-flex min-h-11 items-center rounded-md px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
            )}
          >
            Cerrar
          </DialogClose>
          {data ? (
            <button
              type="button"
              onClick={() => onEdit(data.id)}
              className={cn(
                typography.labelMd,
                "inline-flex min-h-11 items-center gap-2 rounded-md border border-brand-border bg-card px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden lg:min-h-9"
              )}
            >
              {hasCertificate ? (
                <>
                  <EditIcon aria-hidden="true" className="size-4" />
                  Editar
                </>
              ) : (
                "Registrar certificado"
              )}
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CertificationDetailDialog
