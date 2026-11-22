import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { UserRequestError } from "@/App/actions/users/users.actions"
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
import { useUsersApi } from "@/modules/users/hooks/useUsersApi"
import type { CrewUser } from "@/modules/users/types/users.types"
import { fullName } from "@/modules/users/utils/userName"

interface DeleteUserDialogProps {
  // Usuario a desactivar; null con la ventana cerrada.
  user: CrewUser | null
  onClose: () => void
}

const buttonClass = cn(
  typography.labelMd,
  "h-11 rounded-md px-4 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-popover lg:h-9"
)

// Confirmación antes de desactivar un usuario (DELETE en el backend). No se borra: sigue
// en la lista como inactivo y ya no puede iniciar sesión, porque ausencias y asignaciones
// guardan su id. «Cancelar», Esc o pulsar fuera cierran sin hacer nada.
const DeleteUserDialog = ({ user, onClose }: DeleteUserDialogProps) => {
  const queryClient = useQueryClient()
  const { deleteUser } = useUsersApi()
  // Último usuario abierto: el texto no cambia durante la animación de cierre.
  const [shownUser, setShownUser] = useState(user)
  if (user !== null && user !== shownUser) setShownUser(user)
  const name = shownUser ? fullName(shownUser) : ""

  const mutation = useMutation({
    // Solo el ID: es lo que va en la petición.
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      // Refresca la tabla, los indicadores y la ficha.
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Usuario desactivado", {
        description: `${name} ya no podrá iniciar sesión.`,
      })
      onClose()
    },
  })

  // 400/409 del backend (p. ej. «No puedes … desactivar tu propia cuenta.»): su texto.
  const errorText =
    mutation.error instanceof UserRequestError
      ? mutation.error.message
      : "No se pudo desactivar el usuario. Intenta de nuevo."

  return (
    <AlertDialog
      open={user !== null}
      onOpenChange={(open) => {
        // Mientras se desactiva no se cierra: el resultado llega enseguida.
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
            ¿Desea desactivar a {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            No se borra: seguirá en la lista como inactivo y no podrá iniciar
            sesión.
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
          {/* Botón normal (no AlertDialogAction): la ventana se cierra al terminar, no
              al pulsar, para poder mostrar un error si falla. */}
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => shownUser && mutation.mutate(shownUser.id)}
            className={cn(
              buttonClass,
              "inline-flex items-center justify-center bg-destructive font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-70"
            )}
          >
            {mutation.isPending ? "Desactivando…" : "Desactivar"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteUserDialog
