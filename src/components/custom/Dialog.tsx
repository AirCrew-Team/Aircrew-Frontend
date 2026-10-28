import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/custom/Button"

// Props del diálogo; la descripción es opcional
type DialogProps = {
  children: ReactNode
  description?: string
  isOpen: boolean
  onClose: () => void
  title: string
}

/** Diálogo modal accesible. Cierra con Esc, con la X o al pulsar el fondo. */
export function Dialog({
  children,
  description,
  isOpen,
  onClose,
  title,
}: DialogProps) {
  // Referencia al <dialog> nativo para abrirlo y cerrarlo por código
  const dialogRef = useRef<HTMLDialogElement>(null)
  // IDs únicos para enlazar título y descripción con aria
  const dialogId = useId()
  const titleId = `${dialogId}-title`
  const descriptionId = `${dialogId}-description`

  // Sincroniza el estado isOpen con el estado real del <dialog>
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100vw-2rem)] max-w-[460px] rounded-2xl border border-[#d8e2ee] bg-[#f8faff] p-0 text-[#123e60] shadow-2xl backdrop:bg-[#082b46]/55"
      // Esc: delega el cierre al padre
      onCancel={(event) => {
        // El estado lo controla el padre: evitamos que el navegador cierre solo.
        event.preventDefault()
        onClose()
      }}
      // Clic en el fondo: cierra
      onClick={(event) => {
        // Con padding 0, un clic directo sobre <dialog> es un clic en el fondo.
        if (event.target === event.currentTarget) onClose()
      }}
      ref={dialogRef}
    >
      <div className="p-7 max-[700px]:p-5">
        {/* Encabezado: título, descripción y botón de cerrar */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-bold text-[#113d5f]" id={titleId}>
              {title}
            </h2>
            {description && (
              <p
                className="mt-2 mb-0 text-sm text-[#8192a8]"
                id={descriptionId}
              >
                {description}
              </p>
            )}
          </div>
          {/* Botón X */}
          <Button
            aria-label="Cerrar ventana"
            className="size-8 rounded-full text-[#315775]"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" size={18} />
          </Button>
        </div>
        {/* Se monta solo al abrir: así los formularios internos se reinician. */}
        {isOpen && children}
      </div>
    </dialog>
  )
}