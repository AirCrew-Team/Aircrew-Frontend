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
import { deleteUser } from "@/modules/users/data/users.data"
import type { CrewUser } from "@/modules/users/types/users.types"
import { fullName } from "@/modules/users/utils/userName"

interface DeleteUserDialogProps {
  // Usuario a eliminar; null con la ventana cerrada.
  user: CrewUser | null
  onClose: () => void
}

const buttonClass = cn(
  typography.labelMd,
  "h-11 rounded-md px-4 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-popover lg:h-9"
)

// Confirmación antes de eliminar un usuario. «Eliminar» lo quita de la lista (con la API,
// un DELETE del usuario); «Cancelar», Esc o pulsar fuera cierran sin hacer nada.
const DeleteUserDialog = ({ user, onClose }: DeleteUserDialogProps) => {
  const queryClient = useQueryClient()
  // Último usuario abierto: el texto no cambia durante la animación de cierre.
  const [shownUser, setShownUser] = useState(user)
  if (user !== null && user !== shownUser) setShownUser(user)
  const name = shownUser ? fullName(shownUser) : ""

  const mutation = useMutation({
    // Solo el ID: es lo que irá en la petición (DELETE del usuario).
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      // Refresca la tabla, los indicadores y los conteos de los filtros.
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Usuario eliminado", {
        description: `${name} ya no forma parte del directorio.`,
      })
      onClose()
    },
  })

  return (
    <AlertDialog
      open={user !== null}
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
            ¿Desea eliminar a {name}?
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
            No se pudo eliminar el usuario. Intenta de nuevo.
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
            onClick={() => shownUser && mutation.mutate(shownUser.id)}
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

export default DeleteUserDialog
