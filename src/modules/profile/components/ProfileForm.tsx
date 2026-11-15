import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { SaveIcon, SyncIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import ContactSection from "@/modules/profile/components/ContactSection"
import EmploymentSection from "@/modules/profile/components/EmploymentSection"
import NotificationsSection from "@/modules/profile/components/NotificationsSection"
import SecuritySection from "@/modules/profile/components/SecuritySection"
import {
  getNotificationPreferences,
  getSupervisorNotificationPreferences,
  getUserProfile,
  updateProfilePhoto,
} from "@/modules/profile/data/profile.data"
import {
  profileSchema,
  type ProfileFormValues,
} from "@/modules/profile/schemas/profile.schema"
import type {
  NotificationPreferences,
  SupervisorNotificationPreferences,
  UserProfile,
} from "@/modules/profile/types/profile.types"

interface ProfileFormProps {
  userId: string
  isCrew: boolean
  // Foto elegida en I1: un archivo nuevo, null (quitar) o undefined (sin cambios).
  photo: File | null | undefined
  // Vuelve a la foto guardada (tras guardarla o al cancelar).
  onPhotoReset: () => void
}

interface EditableFormProps extends ProfileFormProps {
  profile: UserProfile
  notifications?: NotificationPreferences | SupervisorNotificationPreferences
}

const showSavedToast = () =>
  toast.success("Perfil actualizado con éxito", {
    description:
      "Los datos operativos y preferencias han sido transmitidos a OCC.",
  })

// Formulario F1 a F5. Se monta cuando ya tiene sus valores iniciales, porque useForm
// toma defaultValues solo al montarse. Guardar solo actualiza el estado local, salvo la
// foto, que se envía con updateProfilePhoto.
const EditableForm = ({
  userId,
  isCrew,
  profile,
  notifications,
  photo,
  onPhotoReset,
}: EditableFormProps) => {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: profile.contact.phone,
      residenceZone: profile.contact.residenceZone,
      ...notifications,
    },
  })

  // Guardar la foto (con la API, un PUT). Las mutaciones no se reintentan solas (ADR 003).
  const photoMutation = useMutation({
    mutationFn: ({
      photo,
    }: {
      values: ProfileFormValues
      photo: File | null
    }) => updateProfilePhoto(userId, photo),
    onSuccess: (_saved, { values }) => {
      // Refresca el perfil (la foto de I1) y deja el formulario con lo guardado.
      queryClient.invalidateQueries({ queryKey: ["profile", userId] })
      reset(values)
      onPhotoReset()
      showSavedToast()
    },
  })

  // Lo enviado pasa a ser el "último guardado" al que vuelve Cancelar. Sin foto nueva,
  // se guarda al momento, como siempre.
  const onSubmit = (values: ProfileFormValues) => {
    if (photo === undefined) {
      reset(values)
      showSavedToast()
      return
    }
    photoMutation.mutate({ values, photo })
  }

  // Cancelar: vuelve a lo último guardado (también la foto) y quita el error de guardado.
  const onCancel = () => {
    reset()
    onPhotoReset()
    photoMutation.reset()
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <ContactSection
        userId={userId}
        isCrew={isCrew}
        email={profile.contact.email}
        register={register}
        errors={errors}
      />
      <EmploymentSection userId={userId} isCrew={isCrew} />
      <NotificationsSection isCrew={isCrew} register={register} />
      <SecuritySection userId={userId} security={profile.security} />

      {/* border-transparent: en colores forzados se pinta y delimita los botones. */}
      <div className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            typography.bodySm,
            "flex min-w-0 items-center gap-2 text-muted-foreground"
          )}
        >
          <SyncIcon
            aria-hidden="true"
            className="size-4.5 shrink-0 text-brand-secondary"
          />
          Los cambios de contacto se sincronizan instantáneamente con el OCC
          Bogotá.
        </p>
        {photoMutation.isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            No se pudo guardar el perfil. Intenta de nuevo.
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:shrink-0 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={photoMutation.isPending}
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 items-center justify-center rounded-md border border-transparent bg-muted px-6 py-2 whitespace-nowrap text-brand-primary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-border-strong disabled:opacity-60 motion-reduce:transition-none lg:min-h-10"
            )}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={photoMutation.isPending}
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-transparent bg-brand-secondary px-8 py-2 whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-primary disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none lg:min-h-10"
            )}
          >
            <SaveIcon aria-hidden="true" className="size-4.5 shrink-0" />
            {photoMutation.isPending ? "Guardando…" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </form>
  )
}

// Carga los datos iniciales del formulario: el perfil común y las preferencias de
// notificaciones del rol (tripulante o supervisor).
const ProfileForm = ({
  userId,
  isCrew,
  photo,
  onPhotoReset,
}: ProfileFormProps) => {
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getUserProfile(userId),
  })
  const crewNotifications = useQuery({
    queryKey: ["profile", "notifications", userId],
    queryFn: () => getNotificationPreferences(userId),
    enabled: isCrew,
  })
  const supervisorNotifications = useQuery({
    queryKey: ["profile", "supervisor", "notifications", userId],
    queryFn: () => getSupervisorNotificationPreferences(userId),
    enabled: !isCrew,
  })
  const notifications = isCrew ? crewNotifications : supervisorNotifications

  if (profile.isError || notifications.isError) {
    return (
      <p
        role="alert"
        className={cn(
          typography.bodyMd,
          "rounded-xl border border-brand-border/70 bg-card p-6 text-destructive shadow-sm"
        )}
      >
        No se pudo cargar el perfil.
      </p>
    )
  }

  if (profile.isPending || notifications.isPending) {
    return (
      <p
        role="status"
        className={cn(
          typography.bodyMd,
          "rounded-xl border border-brand-border/70 bg-card p-6 text-muted-foreground shadow-sm"
        )}
      >
        Cargando perfil…
      </p>
    )
  }

  return (
    <EditableForm
      userId={userId}
      isCrew={isCrew}
      profile={profile.data}
      notifications={notifications.data}
      photo={photo}
      onPhotoReset={onPhotoReset}
    />
  )
}

export default ProfileForm
