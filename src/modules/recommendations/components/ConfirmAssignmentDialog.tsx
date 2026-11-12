import { AcceptIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmAssignmentDialogProps {
  candidateName: string
  position: string
  flightNumber: string
  // Al asignar, la solicitud sale de la cola y la lista (con este diálogo) se desmonta.
  onAssign: () => void
}

const focusRing =
  "focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card"

// «Confirmar asignación» del candidato elegido, con su diálogo de confirmación.
const ConfirmAssignmentDialog = ({
  candidateName,
  position,
  flightNumber,
  onAssign,
}: ConfirmAssignmentDialogProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            className={cn(
              typography.labelLg,
              "h-11 w-full gap-2 rounded-md bg-brand-secondary px-4 text-white shadow-sm hover:bg-brand-secondary-hover active:bg-brand-primary",
              focusRing
            )}
          />
        }
      >
        <AcceptIcon aria-hidden="true" className="size-4.5" />
        Confirmar asignación
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-brand-primary">
            Confirmar asignación
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Asignar a {candidateName} como {position} del vuelo {flightNumber}?
            Se le notificará de inmediato.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={cn("min-h-11 sm:min-h-9", focusRing)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAssign}
            className={cn(
              "min-h-11 bg-brand-secondary text-white hover:bg-brand-secondary-hover sm:min-h-9",
              focusRing
            )}
          >
            Asignar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmAssignmentDialog
