import { useId } from "react"

import { RecalculatingIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface RequestSuggestionsDialogProps {
  flightNumber: string
  // Al confirmar, la solicitud pasa a recálculo y la lista (con este diálogo) se desmonta.
  onConfirm: () => void
}

const focusRing =
  "focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card"

// «Pedir nuevas sugerencias», con su diálogo y un motivo opcional.
// El motivo aún no se envía: se mandará con la acción real cuando exista la API.
const RequestSuggestionsDialog = ({
  flightNumber,
  onConfirm,
}: RequestSuggestionsDialogProps) => {
  const reasonId = useId()

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              typography.labelLg,
              "h-11 w-full gap-2 rounded-md border-brand-secondary px-4 text-brand-secondary hover:bg-brand-neutral hover:text-brand-secondary sm:w-auto",
              focusRing
            )}
          />
        }
      >
        <RecalculatingIcon aria-hidden="true" className="size-4.5" />
        Pedir nuevas sugerencias
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-brand-primary">
            Pedir nuevas sugerencias
          </DialogTitle>
          <DialogDescription>
            La IA recalculará los candidatos para el vuelo {flightNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={reasonId}
            className={cn(typography.labelMd, "text-brand-primary")}
          >
            Motivo (opcional)
          </label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={300}
            className={cn(
              typography.bodyMd,
              // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
              "w-full resize-none rounded-sm border border-muted-foreground/70 bg-muted p-4 text-brand-primary transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none max-lg:text-base max-lg:leading-6"
            )}
          />
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                className={cn("min-h-11 sm:min-h-9", focusRing)}
              />
            }
          >
            Cancelar
          </DialogClose>
          <Button
            onClick={onConfirm}
            className={cn(
              "min-h-11 bg-brand-secondary text-white hover:bg-brand-secondary-hover sm:min-h-9",
              focusRing
            )}
          >
            Pedir sugerencias
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RequestSuggestionsDialog
