import { lazy, Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { AddUserIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import UserDialogHeader from "@/modules/users/components/UserDialogHeader"
import { useUsersApi } from "@/modules/users/hooks/useUsersApi"
import { fullName } from "@/modules/users/utils/userName"

// Carga diferida: el formulario (con react-phone-number-input y los datos de teléfonos
// de todos los países) se descarga solo la primera vez que se abre la ventana, no al
// entrar a Usuarios.
const UserForm = lazy(() => import("@/modules/users/components/UserForm"))

// Mientras llegan los catálogos o el código del formulario.
const FormLoading = () => (
  <p
    role="status"
    className={cn(typography.bodySm, "p-5 text-muted-foreground")}
  >
    Cargando formulario…
  </p>
)

interface CreateUserDialogProps {
  // Ventana abierta o cerrada; la controla «Añadir usuario» (UsersToolbar).
  open: boolean
  onClose: () => void
}

// Ventana «Añadir usuario». Pide los catálogos al abrirse (["users", "catalogs"]) y, ya
// cargados, muestra el formulario. La cuenta nace pendiente de activación: la persona
// recibe un correo para crear su contraseña.
// Se cierra con la X, con Esc o al pulsar fuera, y el foco vuelve a «Añadir usuario».
const CreateUserDialog = ({ open, onClose }: CreateUserDialogProps) => {
  const { createUser, getUserCatalogs } = useUsersApi()
  // Opciones de las listas (bases, cargos y turnos). Misma consulta que la edición.
  const { data, isPending, isError } = useQuery({
    queryKey: ["users", "catalogs"],
    queryFn: getUserCatalogs,
    // Solo se piden al abrir la ventana, no al cargar la pantalla.
    enabled: open,
    // Los catálogos cambian poco: se reutilizan 10 minutos sin volver a pedirlos (ADR 003).
    staleTime: 10 * 60 * 1000,
  })

  return (
    // Ventana controlada: la X, Esc o pulsar fuera piden cerrar y el padre decide.
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      {/* Sin la X genérica de shadcn: la pone UserDialogHeader, en español y en blanco.
          max-h + flex-col: en pantallas bajas el formulario se desplaza por dentro. */}
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden bg-muted p-0 ring-0 sm:max-w-3xl"
      >
        <UserDialogHeader
          icon={AddUserIcon}
          title="Añadir usuario"
          description="Alta de usuarios · Flight Ops Central"
          closeLabel="Cerrar formulario de usuario"
        />
        {/* Estados de los catálogos: cargando (status), error (alert) o el formulario. */}
        {isPending ? (
          <FormLoading />
        ) : isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "p-5 text-destructive")}
          >
            No se pudo cargar el formulario.
          </p>
        ) : (
          <Suspense fallback={<FormLoading />}>
            <UserForm
              catalogs={data}
              submitLabel="Crear usuario"
              pendingLabel="Creando usuario…"
              onSave={createUser}
              // Al crear: aviso del correo de activación y se cierra la ventana. El
              // usuario aparece en la lista como pendiente de activación.
              onSaved={(user) => {
                toast.success("Usuario creado", {
                  description: `Se envió un correo a ${user.email} para que ${fullName(user)} active la cuenta.`,
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

export default CreateUserDialog
