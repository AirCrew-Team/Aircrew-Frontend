import { useId } from "react"

import { AcceptIcon, ConfirmedIcon } from "@/App/utils/icons"
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
  // Criterios que cumple el candidato: la confirmación los resume (no repudio).
  checks: string[]
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
  checks,
  onAssign,
}: ConfirmAssignmentDialogProps) => {
  const criteriaId = useId()

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
          {/* La descripción es un div para incluir la lista: el lector la anuncia completa al abrir. */}
          <AlertDialogDescription
            render={<div />}
            className="flex flex-col gap-3"
          >
            <p>
              ¿Asignar a {candidateName} como {position} del vuelo{" "}
              {flightNumber}? Se le notificará de inmediato.
            </p>
            <div className="flex flex-col gap-1.5 rounded-md bg-muted px-3 py-2.5 text-left">
              <p
                id={criteriaId}
                className={cn(
                  typography.labelSm,
                  "text-muted-foreground uppercase"
                )}
              >
                Criterios verificados
              </p>
              <ul
                aria-labelledby={criteriaId}
                className="flex flex-col gap-1 text-foreground"
              >
                {checks.map((check) => (
                  <li key={check} className="flex items-center gap-2">
                    <ConfirmedIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand-secondary"
                    />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
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
