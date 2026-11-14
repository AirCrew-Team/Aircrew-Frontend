import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { SaveIcon, SyncIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import NotificationsSection from "@/modules/operatorProfile/components/NotificationsSection"
import OperatorCredentialCard from "@/modules/operatorProfile/components/OperatorCredentialCard"
import OperatorProfileCard from "@/modules/operatorProfile/components/OperatorProfileCard"
import PersonalInfoSection from "@/modules/operatorProfile/components/PersonalInfoSection"
import SecuritySection from "@/modules/operatorProfile/components/SecuritySection"
import {
  ProfileFieldError,
  getOperatorProfile,
  getResidenceOptions,
  updateOperatorProfile,
} from "@/modules/operatorProfile/data/operatorProfile.data"
import {
  operatorProfileSchema,
  type OperatorProfileFormValues,
} from "@/modules/operatorProfile/schemas/operatorProfile.schema"
import type {
  OperatorProfile,
  ResidenceOption,
} from "@/modules/operatorProfile/types/operatorProfile.types"

// Valores del formulario a partir del perfil. La contraseña no va aquí: tiene su propio
// panel y su propio botón (ChangePasswordPanel).
const toFormValues = (profile: OperatorProfile): OperatorProfileFormValues => ({
  fullName: profile.fullName,
  email: profile.email,
  phone: profile.phone,
  residence: profile.residence,
  notifications: Object.fromEntries(
    profile.notifications.map((notification) => [
      notification.id,
      notification.enabled,
    ])
  ),
})

interface EditableSettingsProps {
  userId: string
  profile: OperatorProfile
  residences: ResidenceOption[]
}

// Formulario con los datos ya cargados. Se monta cuando hay perfil, porque useForm toma
// defaultValues solo al montarse.
const EditableSettings = ({
  userId,
  profile,
  residences,
}: EditableSettingsProps) => {
  const queryClient = useQueryClient()
  // Foto elegida: un archivo nuevo, null (quitar) o undefined (dejar la que había).
  // Va fuera de react-hook-form porque es un File, no texto.
  const [photo, setPhoto] = useState<File | null | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OperatorProfileFormValues>({
    resolver: zodResolver(operatorProfileSchema),
    defaultValues: toFormValues(profile),
  })
  // La tarjeta de la izquierda muestra en vivo el nombre que se está editando.
  const fullName = useWatch({ control, name: "fullName" })

  // Guardar el perfil (con la API, un PUT). Las mutaciones no se reintentan solas
  // (ADR 003).
  const mutation = useMutation({
    mutationFn: (values: OperatorProfileFormValues) =>
      updateOperatorProfile(userId, {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        residence: values.residence,
        notifications: values.notifications,
        photo,
      }),
    onSuccess: (saved) => {
      // Refresca el perfil (también el encabezado) y deja el formulario con lo guardado.
      queryClient.invalidateQueries({ queryKey: ["operatorProfile"] })
      reset(toFormValues(saved))
      setPhoto(undefined)
      toast.success("Perfil actualizado", {
        description:
          "Los cambios ya están vigentes en toda la consola AirCrew.",
      })
    },
    onError: (error) => {
      // Error de un campo del perfil (ej. correo ya usado): se muestra y se enfoca.
      if (error instanceof ProfileFieldError && error.field === "email") {
        setError("email", { message: error.message }, { shouldFocus: true })
      }
    },
  })

  // Cancelar: vuelve a lo último guardado (también la foto).
  const onCancel = () => {
    reset(toFormValues(profile))
    setPhoto(undefined)
    setPhotoError(null)
    mutation.reset()
  }

  const genericError =
    mutation.isError && !(mutation.error instanceof ProfileFieldError)

  return (
    // noValidate: los mensajes los pone el formulario (en español y accesibles).
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      // Móvil y tablet: una columna. Escritorio (lg): perfil a la izquierda y secciones a
      // la derecha (dos tercios).
      className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <OperatorProfileCard
          profile={profile}
          fullName={fullName}
          photo={photo}
          photoError={photoError}
          onPhotoChange={setPhoto}
          onPhotoError={setPhotoError}
        />
        <OperatorCredentialCard credential={profile.credential} />
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
        <PersonalInfoSection
          profile={profile}
          residences={residences}
          control={control}
          register={register}
          errors={errors}
        />
        <SecuritySection userId={userId} profile={profile} />
        <NotificationsSection
          notifications={profile.notifications}
          register={register}
        />

        {/* Pie: aviso de vigencia, error general (si lo hay) y los botones. */}
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              typography.bodySm,
              "flex items-center gap-2 text-muted-foreground"
            )}
          >
            <SyncIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            Los cambios tendrán vigencia inmediata en toda la consola AirCrew.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {genericError ? (
              <p
                role="alert"
                className={cn(typography.bodySm, "text-destructive")}
              >
                No se pudo guardar el perfil. Intenta de nuevo.
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={mutation.isPending}
                className={cn(
                  typography.labelMd,
                  "inline-flex min-h-11 items-center rounded-md bg-brand-neutral px-4 font-semibold text-brand-primary transition-colors hover:bg-brand-border focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden disabled:opacity-60 lg:min-h-10"
                )}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className={cn(
                  typography.labelMd,
                  "inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-primary px-4 font-semibold text-white transition-colors hover:bg-brand-primary-dark focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-70 lg:min-h-10"
                )}
              >
                <SaveIcon aria-hidden="true" className="size-4" />
                {mutation.isPending ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

// Perfil y configuración del super admin. Pide el perfil
// (["operatorProfile", id], el mismo del encabezado) y las residencias; cada uno con
// su estado de carga y de error.
const OperatorSettingsForm = ({ userId }: { userId: string }) => {
  const profile = useQuery({
    queryKey: ["operatorProfile", userId],
    queryFn: () => getOperatorProfile(userId),
  })
  const residences = useQuery({
    queryKey: ["operatorProfile", "residences"],
    queryFn: getResidenceOptions,
    // Catálogo que cambia poco: se reutiliza 10 minutos (ADR 003).
    staleTime: 10 * 60 * 1000,
  })

  if (profile.isPending || residences.isPending) {
    return (
      <p
        role="status"
        className={cn(
          typography.bodySm,
          "rounded-xl bg-card p-6 text-muted-foreground shadow-sm"
        )}
      >
        Cargando perfil…
      </p>
    )
  }

  if (profile.isError || residences.isError) {
    return (
      <p
        role="alert"
        className={cn(
          typography.bodySm,
          "rounded-xl bg-card p-6 text-destructive shadow-sm"
        )}
      >
        No se pudo cargar el perfil.
      </p>
    )
  }

  return (
    <EditableSettings
      userId={userId}
      profile={profile.data}
      residences={residences.data}
    />
  )
}

export default OperatorSettingsForm
