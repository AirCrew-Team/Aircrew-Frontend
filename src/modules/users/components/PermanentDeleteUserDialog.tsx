import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { UserRequestError } from "@/App/actions/users/users.actions"
import { WarningIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { Dialog } from "@/components/custom/Dialog"
import { cn } from "@/lib/utils"
import { useUsersApi } from "@/modules/users/hooks/useUsersApi"
import type { CrewUser } from "@/modules/users/types/users.types"
import { fullName } from "@/modules/users/utils/userName"

interface PermanentDeleteUserDialogProps {
  // Usuario a eliminar; null con la ventana cerrada.
  user: CrewUser | null
  onClose: () => void
  // Tras eliminar (la ventana ya se debe cerrar).
  onDeleted: () => void
}

const buttonClass = cn(
  typography.labelMd,
  "h-11 rounded-md px-4 font-semibold focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 lg:h-9"
)

// Confirmación de «Eliminar» (spec eliminar-usuarios, EU-09): borra la cuenta para
// siempre (DELETE /users/:id/permanent). Diálogo propio (components/custom/Dialog): se
// cierra con «Cancelar», la X, Esc o el fondo, salvo mientras se elimina.
const PermanentDeleteUserDialog = ({
  user,
  onClose,
  onDeleted,
}: PermanentDeleteUserDialogProps) => {
  const queryClient = useQueryClient()
  const { deleteUserPermanently } = useUsersApi()
  const name = user ? fullName(user) : ""

  const mutation = useMutation({
    mutationFn: (id: string) => deleteUserPermanently(id),
    onSuccess: (_data, id) => {
      // La tabla, los indicadores y los conteos de los filtros. Ni los catálogos (no
      // cambian) ni la ficha del eliminado: las ventanas de edición y detalle la siguen
      // observando cerradas, y pedirla daría 404.
      void queryClient.invalidateQueries({
        queryKey: ["users"],
        predicate: ({ queryKey }) =>
          queryKey[1] !== "catalogs" && queryKey[2] !== id,
      })
      toast.success("Usuario eliminado.")
      onDeleted()
    },
  })
  const pending = mutation.isPending

  // Mientras se elimina no se cierra: así la respuesta nunca llega a otra ventana. Al
  // cerrar se olvida el error, para que no aparezca al abrir otro usuario.
  const close = () => {
    if (pending) return
    mutation.reset()
    onClose()
  }

  // 409 (eliminarse a sí mismo, último super_admin): el texto del backend.
  const errorText =
    mutation.error instanceof UserRequestError
      ? mutation.error.message
      : "No se pudo eliminar el usuario. Intenta de nuevo."

  return (
    <Dialog
      isOpen={user !== null}
      onClose={close}
      title={`¿Eliminar a ${name}?`}
      description="Esta acción es permanente y no se puede deshacer."
    >
      <div className={cn(typography.bodyMd, "flex flex-col gap-4")}>
        <p>
          Se borrarán la cuenta, el correo, la foto y las notificaciones de{" "}
          {name}, y sus enlaces de invitación o de recuperación dejarán de
          servir. El correo quedará libre para una cuenta nueva.
        </p>
        {user?.roleGroup === "tripulacion" ? (
          <>
            <p>
              También se borrarán el perfil de tripulante, las certificaciones,
              las ausencias y las sugerencias de la IA que lo nombran.
            </p>
            <p className="flex items-start gap-2 rounded-lg bg-error-container p-3 text-on-error-container">
              <WarningIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              Sus vuelos futuros quedarán con el puesto vacante para que el
              supervisor lo cubra.
            </p>
          </>
        ) : null}
        {mutation.isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            {errorText}
          </p>
        ) : null}
        {/* Mientras se elimina, los botones quedan con aria-disabled (Base UI) y
            conservan el foco. Foco inicial en «Cancelar», la opción que no borra. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            data-autofocus
            disabled={pending}
            focusableWhenDisabled
            onClick={close}
            className={buttonClass}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            focusableWhenDisabled
            onClick={() => user && mutation.mutate(user.id)}
            className={cn(
              buttonClass,
              "bg-destructive text-white hover:bg-destructive/90 aria-disabled:cursor-wait aria-disabled:opacity-70"
            )}
          >
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default PermanentDeleteUserDialog
