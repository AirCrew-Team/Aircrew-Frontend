import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"

import { AcceptIcon, SaveIcon, SyncIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import ContactSection from "@/modules/profile/components/ContactSection"
import EmploymentSection from "@/modules/profile/components/EmploymentSection"
import NotificationsSection from "@/modules/profile/components/NotificationsSection"
import SecuritySection from "@/modules/profile/components/SecuritySection"
import {
  getNotificationPreferences,
  getUserProfile,
} from "@/modules/profile/data/profile.data"
import {
  profileSchema,
  type ProfileFormValues,
} from "@/modules/profile/schemas/profile.schema"
import type {
  NotificationPreferences,
  UserProfile,
} from "@/modules/profile/types/profile.types"

interface ProfileFormProps {
  userId: string
  isCrew: boolean
}

interface EditableFormProps extends ProfileFormProps {
  profile: UserProfile
  notifications?: NotificationPreferences
}

// Formulario F1 a F5. Se monta cuando ya tiene sus valores iniciales, porque useForm
// toma defaultValues solo al montarse. Guardar solo actualiza el estado local.
const EditableForm = ({
  userId,
  isCrew,
  profile,
  notifications,
}: EditableFormProps) => {
  const [saved, setSaved] = useState(false)
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

  // Lo enviado pasa a ser el "último guardado" al que vuelve Cancelar.
  const onSubmit = (values: ProfileFormValues) => {
    reset(values)
    setSaved(true)
  }

  const onCancel = () => {
    reset()
    setSaved(false)
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      // Cualquier edición oculta la confirmación de guardado.
      onChange={() => setSaved(false)}
      className="flex flex-col gap-4"
    >
      <ContactSection
        userId={userId}
        isCrew={isCrew}
        email={profile.contact.email}
        register={register}
        errors={errors}
      />
      {isCrew ? (
        <>
          <EmploymentSection userId={userId} />
          <NotificationsSection register={register} />
        </>
      ) : null}
      <SecuritySection number={isCrew ? 4 : 2} security={profile.security} />

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
        <div className="flex flex-col-reverse gap-2 sm:shrink-0 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 items-center justify-center rounded-md border border-transparent bg-muted px-6 py-2 whitespace-nowrap text-brand-primary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-border-strong motion-reduce:transition-none lg:min-h-10"
            )}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={cn(
              typography.labelLg,
              "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-transparent bg-brand-secondary px-8 py-2 whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-primary motion-reduce:transition-none lg:min-h-10"
            )}
          >
            <SaveIcon aria-hidden="true" className="size-4.5 shrink-0" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Región viva siempre montada: el mensaje aparece al guardar sin errores. */}
      <div role="status">
        {saved ? (
          <p className="flex items-start gap-3 rounded-xl border border-brand-border bg-muted p-4">
            <AcceptIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-brand-secondary"
            />
            <span className="flex flex-col gap-0.5">
              <span className={cn(typography.labelLg, "text-brand-primary")}>
                Perfil actualizado con éxito
              </span>
              <span className={cn(typography.bodySm, "text-muted-foreground")}>
                Los datos operativos y preferencias han sido transmitidos a OCC.
              </span>
            </span>
          </p>
        ) : null}
      </div>
    </form>
  )
}

// Carga los datos iniciales del formulario: el perfil común y, para el tripulante,
// sus preferencias de notificaciones.
const ProfileForm = ({ userId, isCrew }: ProfileFormProps) => {
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getUserProfile(userId),
  })
  const notifications = useQuery({
    queryKey: ["profile", "notifications", userId],
    queryFn: () => getNotificationPreferences(userId),
    enabled: isCrew,
  })

  if (profile.isError || (isCrew && notifications.isError)) {
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

  if (profile.isPending || (isCrew && notifications.isPending)) {
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
    />
  )
}

export default ProfileForm
