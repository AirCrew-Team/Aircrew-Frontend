import { lazy, Suspense, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { EditIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import UserDialogHeader from "@/modules/users/components/UserDialogHeader"
import {
  getUserCatalogs,
  getUserDetail,
  updateUser,
} from "@/modules/users/data/users.data"
import type { CreateUserFormValues } from "@/modules/users/schemas/createUser.schema"
import type { UserDetail } from "@/modules/users/types/users.types"
import { fullName } from "@/modules/users/utils/userName"

// Carga diferida: el formulario (con react-phone-number-input y los datos de teléfonos
// de todos los países) se descarga solo la primera vez que se abre la ventana, no al
// entrar a Usuarios.
const UserForm = lazy(() => import("@/modules/users/components/UserForm"))

// Valores del formulario a partir de la ficha del usuario. Supervisor y Administrador no
// tienen cargo propio ni licencia: esos campos empiezan vacíos.
const toFormValues = (user: UserDetail): CreateUserFormValues => {
  const isCrew = user.roleGroup === "tripulacion"
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    // El campo del celular trabaja en E.164: «+1 404 555 0142» → «+14045550142».
    phone: user.phone.number.replace(/[^\d+]/g, ""),
    roleGroup: user.roleGroup,
    roleTitle: isCrew ? user.roleTitle : "",
    base: user.base,
    licenseNumber: user.license?.number ?? "",
    certificates: user.license?.certificates ?? [],
  }
}

// Mientras llegan los datos del usuario, los catálogos o el código del formulario.
const LoadingText = () => (
  <p
    role="status"
    className={cn(typography.bodySm, "p-5 text-muted-foreground")}
  >
    Cargando datos del usuario…
  </p>
)

interface EditUserDialogProps {
  // ID del usuario a editar; null con la ventana cerrada.
  userId: string | null
  onClose: () => void
}

// Ventana «Editar usuario»: el mismo formulario del alta, lleno con los datos actuales.
// Pide la ficha (["users", "detail", id], la misma de «Ver más información») y los
// catálogos. Al guardar, envía los cambios (con la API, un PUT del usuario).
const EditUserDialog = ({ userId, onClose }: EditUserDialogProps) => {
  // Último usuario abierto: al cerrar, userId pasa a null, pero el formulario sigue
  // visible durante la animación de salida en lugar de cambiar a «Cargando…».
  const [shownUserId, setShownUserId] = useState(userId)
  if (userId !== null && userId !== shownUserId) setShownUserId(userId)

  const detail = useQuery({
    queryKey: ["users", "detail", shownUserId],
    queryFn: () => getUserDetail(shownUserId as string),
    enabled: shownUserId !== null,
  })
  const catalogs = useQuery({
    queryKey: ["users", "catalogs"],
    queryFn: getUserCatalogs,
    enabled: shownUserId !== null,
    // Los catálogos cambian poco: se reutilizan 10 minutos sin volver a pedirlos (ADR 003).
    staleTime: 10 * 60 * 1000,
  })

  return (
    <Dialog
      open={userId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-3xl"
      >
        <UserDialogHeader
          icon={EditIcon}
          title="Editar usuario"
          description="Actualización de usuarios · Flight Ops Central"
          closeLabel="Cerrar edición de usuario"
        />
        {detail.isPending || catalogs.isPending ? (
          <LoadingText />
        ) : detail.isError || catalogs.isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "p-5 text-destructive")}
          >
            No se pudieron cargar los datos del usuario.
          </p>
        ) : (
          <Suspense fallback={<LoadingText />}>
            <UserForm
              // key: si se abre otro usuario, el formulario empieza de nuevo con sus datos.
              key={detail.data.id}
              catalogs={catalogs.data}
              defaultValues={toFormValues(detail.data)}
              submitLabel="Guardar cambios"
              pendingLabel="Guardando cambios…"
              // Edición (PUT): repetirla da el mismo resultado, no usa la clave.
              onSave={(input) => updateUser(detail.data.id, input)}
              onSaved={(user) => {
                toast.success("Usuario actualizado", {
                  description: `Los cambios de ${fullName(user)} quedaron guardados.`,
                })
                onClose()
              }}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default EditUserDialog
