import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { AircraftRequestError } from "@/App/actions/aircraft/aircraft.actions"
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
import { useAircraftApi } from "@/modules/aircraft/hooks/useAircraftApi"
import type { Aircraft } from "@/App/types/aircraft.types"

interface DeleteAircraftDialogProps {
  // Aeronave que se elimina; null con la ventana cerrada.
  aircraft: Aircraft | null
  onClose: () => void
}

const buttonClass = cn(
  typography.labelMd,
  "h-11 rounded-md px-4 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-popover lg:h-9"
)

// Confirmación antes de eliminar una aeronave de la flota (como en Certificaciones).
// «Eliminar» la quita con su mantenimiento e historial (DELETE). Si tiene vuelos, el
// backend no la borra y se muestra su mensaje.
// «Cancelar», Esc o pulsar fuera cierran sin hacer nada.
const DeleteAircraftDialog = ({
  aircraft,
  onClose,
}: DeleteAircraftDialogProps) => {
  const queryClient = useQueryClient()
  const { deleteAircraft } = useAircraftApi()
  // Última aeronave abierta: el texto no cambia durante la animación de cierre.
  const [shown, setShown] = useState(aircraft)
  if (aircraft !== null && aircraft !== shown) setShown(aircraft)
  const registration = shown?.registration ?? ""

  const mutation = useMutation({
    // Solo el ID: es lo que irá en la petición.
    mutationFn: (id: string) => deleteAircraft(id),
    onSuccess: () => {
      // Refresca la tabla, los indicadores y los conteos de los filtros.
      queryClient.invalidateQueries({ queryKey: ["aircraft"] })
      toast.success("Aeronave eliminada", {
        description: `${registration} ya no forma parte de la flota.`,
      })
      onClose()
    },
  })

  // 409 del backend (p. ej. «La aeronave tiene vuelos registrados: no se puede
  // eliminar.»): su texto tal cual.
  const errorText =
    mutation.error instanceof AircraftRequestError
      ? mutation.error.message
      : "No se pudo eliminar la aeronave. Intenta de nuevo."

  return (
    <AlertDialog
      open={aircraft !== null}
      onOpenChange={(open) => {
        // Mientras se elimina no se cierra: el resultado llega enseguida.
        if (!open && !mutation.isPending) {
          mutation.reset()
          onClose()
        }
      }}
    >
      {/* size="sm": ícono, texto y botones centrados en cualquier pantalla. */}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-error-container text-destructive">
            <DeleteIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle
            className={cn(typography.headlineSm, "text-brand-primary")}
          >
            ¿Desea eliminar la aeronave {registration}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se borrarán también su mantenimiento y su historial. Esta acción no
            se podrá deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "text-center text-destructive")}
          >
            {errorText}
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
            onClick={() => shown && mutation.mutate(shown.id)}
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

export default DeleteAircraftDialog
