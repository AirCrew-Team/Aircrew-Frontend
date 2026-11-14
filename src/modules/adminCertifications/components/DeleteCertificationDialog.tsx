import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DeleteIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { deleteCertification } from "@/modules/adminCertifications/data/adminCertifications.data"
import type { CrewCertification } from "@/modules/adminCertifications/types/adminCertifications.types"

interface DeleteCertificationDialogProps {
  // Tripulante cuya certificación se elimina; null con la ventana cerrada.
  crew: CrewCertification | null
  onClose: () => void
}

const buttonClass = cn(
  typography.labelMd,
  "h-11 rounded-md px-4 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-popover lg:h-9"
)

// Confirmación antes de eliminar la certificación de un tripulante. «Eliminar» borra su
// licencia y certificados (con la API, un DELETE de la certificación): el tripulante
// sigue en la lista como «Sin certificado». «Cancelar», Esc o pulsar fuera cierran sin
// hacer nada.
const DeleteCertificationDialog = ({
  crew,
  onClose,
}: DeleteCertificationDialogProps) => {
  const queryClient = useQueryClient()
  // Último tripulante abierto: el texto no cambia durante la animación de cierre.
  const [shownCrew, setShownCrew] = useState(crew)
  if (crew !== null && crew !== shownCrew) setShownCrew(crew)
  const name = shownCrew ? `${shownCrew.firstName} ${shownCrew.lastName}` : ""

  const mutation = useMutation({
    // Solo el ID: es lo que irá en la petición.
    mutationFn: (id: string) => deleteCertification(id),
    onSuccess: () => {
      // Refresca la tabla, los indicadores y los conteos de los filtros.
      queryClient.invalidateQueries({ queryKey: ["certifications"] })
      toast.success("Certificación eliminada", {
        description: `${name} quedó sin certificado.`,
      })
      onClose()
    },
  })

  return (
    <AlertDialog
      open={crew !== null}
      onOpenChange={(open) => {
        // Mientras se elimina no se cierra: el resultado llega enseguida.
        if (!open && !mutation.isPending) {
          mutation.reset()
          onClose()
        }
      }}
    >
      {/* size="sm": ícono, texto y botones centrados en cualquier pantalla, con los
          dos botones del mismo ancho, uno al lado del otro. */}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-error-container text-destructive">
            <DeleteIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle
            className={cn(typography.headlineSm, "text-brand-primary")}
          >
            ¿Desea eliminar la certificación de {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se podrá deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "text-center text-destructive")}
          >
            No se pudo eliminar la certificación. Intenta de nuevo.
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={mutation.isPending}
            className={buttonClass}
          >
            Cancelar
          </AlertDialogCancel>
          {/* Botón normal (no AlertDialogAction): la ventana se cierra al terminar de
              eliminar, no al pulsar, para poder mostrar un error si falla. */}
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => shownCrew && mutation.mutate(shownCrew.id)}
            className={cn(
              buttonClass,
              "inline-flex items-center justify-center bg-destructive font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-70"
            )}
          >
            {mutation.isPending ? "Eliminando…" : "Eliminar"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteCertificationDialog
