import { type MouseEvent, useEffect, useState } from "react"

import {
  absenceAttachmentUrl,
  downloadAbsenceAttachment,
} from "@/App/actions/absences/absences.actions"
import type { AbsenceAttachment } from "@/App/types/absences.types"
import {
  DocumentIcon,
  DownloadIcon,
  ExternalLinkIcon,
  HideIcon,
  ViewIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface AttachmentPreviewProps {
  id: string
  attachment: AbsenceAttachment
}

// «Guardar como» del navegador: solo existe en Chrome y Edge en contexto seguro, y no
// está en los tipos del DOM.
interface SavePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types?: { accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
}

// Tamaño en KB: 2048 bytes → «2 KB» (como mínimo «1 KB»).
const formatSize = (bytes: number) =>
  `${Math.max(1, Math.round(bytes / 1024))} KB`

const IMAGE_TYPES = ["image/png", "image/jpeg"]

// Extensión de cada tipo previsualizable (los únicos con blob que guardar).
const EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
}

type Preview = "closed" | "open" | "error"
type Zoom = "fit" | "actual"
type SaveStatus = "idle" | "saved" | "error"

// Tamaño real: centra el scroll del área en la imagen. Se llama al montar el área (imagen
// ya cargada) y al cargar la imagen. Es una función de módulo, así React no la vuelve a
// llamar en cada render y no pisa el scroll del usuario.
const centerScroll = (area: HTMLElement | null) => {
  if (!area) return
  area.scrollLeft = (area.scrollWidth - area.clientWidth) / 2
  area.scrollTop = (area.scrollHeight - area.clientHeight) / 2
}

const centerIfLoaded = (area: HTMLDivElement | null) => {
  if (area?.querySelector("img")?.complete) centerScroll(area)
}

// Sin blob (tipo no previsualizable), el navegador guarda el archivo pedido con apiClient.
const saveWithLink = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const secondaryAction = cn(
  typography.labelLg,
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-brand-secondary bg-white px-4 py-2 text-brand-secondary transition-colors hover:bg-brand-secondary hover:text-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-hidden motion-reduce:transition-none lg:min-h-9"
)

// Bloque «Comprobante» del detalle: nombre, tamaño y «Previsualizar». La vista previa
// se muestra aquí mismo y, debajo, sus acciones. «Descargar» es un enlace: con la vista
// previa cargada, descarga su blob (no pide nada, así una sesión vencida no lleva al JSON
// del gateway); sin blob, el clic pide el archivo con apiClient (un 401 cierra la sesión
// con su toast). Si el navegador tiene «Guardar como», el clic lo abre y escribe el blob.
const AttachmentPreview = ({ id, attachment }: AttachmentPreviewProps) => {
  const [preview, setPreview] = useState<Preview>("closed")
  const [file, setFile] = useState<{ url: string; blob: Blob } | null>(null)
  const [zoom, setZoom] = useState<Zoom>("fit")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const { file_name: fileName, mime_type: mimeType } = attachment
  const isImage = IMAGE_TYPES.includes(mimeType)
  const canPreview = Object.hasOwn(EXTENSIONS, mimeType)
  const isOpen = preview === "open"
  const isLoading = isOpen && canPreview && file === null

  // Se pide al abrir la vista previa. El cleanup (al ocultarla o al cerrar el popup)
  // libera la URL y descarta una respuesta que llegue tarde.
  useEffect(() => {
    if (!isOpen || !canPreview) return
    let ignore = false
    let objectUrl: string | null = null
    downloadAbsenceAttachment(id).then(
      (response) => {
        if (ignore) return
        // El tipo sale del detalle (ya comprobado): el iframe nunca recibe otro tipo.
        const blob = new Blob([response], { type: mimeType })
        objectUrl = URL.createObjectURL(blob)
        setFile({ url: objectUrl, blob })
      },
      () => {
        if (!ignore) setPreview("error")
      }
    )
    return () => {
      ignore = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isOpen, canPreview, id, mimeType])

  const toggle = () => {
    if (isLoading) return
    if (isOpen) {
      setPreview("closed")
      setFile(null)
      setZoom("fit")
      setSaveStatus("idle")
    } else {
      setPreview("open")
    }
  }

  // Con blob y sin «Guardar como», el enlace al blob sigue su curso.
  const saveAs = async (event: MouseEvent<HTMLAnchorElement>) => {
    const picker = window as Window & SavePickerWindow
    if (!picker.showSaveFilePicker && file) return
    event.preventDefault()
    setSaveStatus("idle")
    try {
      if (!picker.showSaveFilePicker) {
        const response = await downloadAbsenceAttachment(id)
        saveWithLink(new Blob([response], { type: mimeType }), fileName)
        return
      }
      // La ventana se pide antes de cualquier await: el navegador exige el gesto del
      // usuario. Sin extensión conocida (tipo no previsualizable) no se fija el tipo.
      const handle = await picker.showSaveFilePicker({
        suggestedName: fileName,
        ...(file && {
          types: [{ accept: { [mimeType]: [EXTENSIONS[mimeType]] } }],
        }),
      })
      const blob =
        file?.blob ??
        new Blob([await downloadAbsenceAttachment(id)], { type: mimeType })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      setSaveStatus("saved")
    } catch (error) {
      // Cancelar «Guardar como» (AbortError) no es un error. Se mira el nombre, no la
      // clase: DOMException no hereda de Error en todos los entornos.
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      )
        return
      setSaveStatus("error")
    }
  }

  const PreviewIcon = isOpen ? HideIcon : ViewIcon
  const ZoomIcon = zoom === "fit" ? ZoomInIcon : ZoomOutIcon

  const image = file ? (
    <img
      src={file.url}
      alt={`Comprobante: ${fileName}`}
      data-zoom={zoom}
      onLoad={
        zoom === "actual"
          ? (event) => centerScroll(event.currentTarget.parentElement)
          : undefined
      }
      className={
        zoom === "actual" ? "max-w-none" : "h-auto w-full rounded-md bg-white"
      }
    />
  ) : null

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <DocumentIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-brand-secondary"
        />
        <div className="flex min-w-0 flex-col">
          <p className={cn(typography.labelLg, "truncate text-brand-primary")}>
            {fileName}
          </p>
          <p className={cn(typography.bodySm, "text-muted-foreground")}>
            {`Tamaño: ${formatSize(attachment.size_bytes)}`}
          </p>
        </div>
      </div>{" "}
      {/* El espacio separa el tamaño del botón en el texto (en flex no se pinta). */}
      <button
        type="button"
        // Cargando: aria-disabled y no disabled, para que el foco no caiga a <body>.
        aria-disabled={isLoading || undefined}
        onClick={toggle}
        className={cn(
          typography.labelLg,
          "inline-flex min-h-11 items-center justify-center gap-1.5 self-start rounded-md bg-brand-secondary px-4 py-2 text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-hidden active:bg-brand-primary aria-disabled:opacity-60 motion-reduce:transition-none lg:min-h-9"
        )}
      >
        <PreviewIcon aria-hidden="true" className="size-4 shrink-0" />
        {isLoading
          ? "Cargando vista previa…"
          : isOpen
            ? "Ocultar vista previa"
            : "Previsualizar"}
      </button>
      {preview === "error" ? (
        <p
          role="alert"
          className={cn(typography.bodySm, "font-medium text-destructive")}
        >
          No se pudo cargar la vista previa. Intenta de nuevo.
        </p>
      ) : null}
      {isOpen && !isLoading ? (
        <div className="flex flex-col gap-3">
          {/* Sin blob con la vista previa abierta: el tipo no se puede mostrar. */}
          {file === null ? (
            <p className={cn(typography.bodyMd, "text-foreground")}>
              No se puede previsualizar este tipo de archivo.
            </p>
          ) : isImage ? (
            zoom === "actual" ? (
              // Tamaño real: se desplaza en los dos ejes (también con el teclado) y
              // arranca centrado en la imagen.
              <div
                ref={centerIfLoaded}
                role="region"
                aria-label="Comprobante a tamaño real"
                tabIndex={0}
                className="max-h-[60vh] overflow-auto rounded-md bg-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-hidden"
              >
                {image}
              </div>
            ) : (
              image
            )
          ) : (
            <iframe
              src={file.url}
              title={`Comprobante: ${fileName}`}
              className="h-[60vh] w-full rounded-md border border-border bg-white"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {file !== null && isImage ? (
              <button
                type="button"
                onClick={() => setZoom(zoom === "fit" ? "actual" : "fit")}
                className={secondaryAction}
              >
                <ZoomIcon aria-hidden="true" className="size-4 shrink-0" />
                {zoom === "fit" ? "Ver tamaño real" : "Ajustar al ancho"}
              </button>
            ) : null}
            {file !== null ? (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryAction}
              >
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
                Abrir en pestaña nueva
              </a>
            ) : null}
            <a
              href={file?.url ?? absenceAttachmentUrl(id)}
              download={file ? fileName : undefined}
              onClick={saveAs}
              className={secondaryAction}
            >
              <DownloadIcon aria-hidden="true" className="size-4 shrink-0" />
              Descargar
            </a>
          </div>
          {/* Estado persistente, sin región viva. */}
          {saveStatus === "saved" ? (
            <p className={cn(typography.bodySm, "text-foreground")}>
              Archivo guardado.
            </p>
          ) : null}
          {saveStatus === "error" ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "font-medium text-destructive")}
            >
              No se pudo guardar el archivo. Intenta de nuevo.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export default AttachmentPreview
