import { zodResolver } from "@hookform/resolvers/zod"
import {
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  myProfileQueryKey,
  ProfileFieldError,
  updateMyProfile,
  type MyCrewMember,
} from "@/App/actions/profile/profile.actions"
import type { AuthUser } from "@/App/types/auth.types"
import { ROLES } from "@/App/types/auth.types"
import type {
  MyProfile,
  NotificationKey,
  UpdateMyProfileInput,
} from "@/App/types/profile.types"
import { InfoIcon, SaveIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import ContactSection from "@/modules/profile/components/ContactSection"
import EmploymentSection from "@/modules/profile/components/EmploymentSection"
import NotificationsSection from "@/modules/profile/components/NotificationsSection"
import SecuritySection from "@/modules/profile/components/SecuritySection"
import SupervisorEmploymentSection from "@/modules/profile/components/SupervisorEmploymentSection"
import {
  notificationKeysFor,
  profileSchemaFor,
  type ProfileFormValues,
} from "@/modules/profile/schemas/profile.schema"

// Valores del formulario a partir de la cuenta (vacíos en las cuentas demo).
const toFormValues = (
  profile: MyProfile | null,
  keys: readonly NotificationKey[]
): ProfileFormValues => ({
  phone: profile?.phone ?? "",
  residence: profile?.residence ?? "",
  notifications: Object.fromEntries(
    keys.map((key) => [key, profile?.notifications?.[key] === true])
  ),
})

interface ProfileFormProps {
  user: AuthUser
  // null en las cuentas demo: todo vacío y deshabilitado, sin peticiones.
  profile: MyProfile | null
  crew: UseQueryResult<MyCrewMember>
  // Catálogo de ciudades de EE. UU.; undefined mientras llega, si falla o en las demo.
  cities: string[] | undefined
  // El catálogo no se pudo cargar: la ciudad la valida solo el backend.
  citiesFailed: boolean
}

// Formulario de Contacto y Notificaciones (tripulante y supervisor), con Información
// laboral (tripulante y supervisor) y Seguridad (con su propio envío). Se monta una sola vez, con los datos ya
// cargados, porque useForm toma defaultValues al montarse; el último cambio de
// contraseña se lee del perfil vivo.
const ProfileForm = ({
  user,
  profile,
  crew,
  cities,
  citiesFailed,
}: ProfileFormProps) => {
  const queryClient = useQueryClient()
  const isDemo = profile === null
  const isCrew = user.role === ROLES.TRIPULANTE
  const showCrewEmployment = isCrew && !isDemo
  // El supervisor demo no tiene employment (profile null), así que no ve el bloque.
  const supervisorEmployment =
    user.role === ROLES.SUPER_VISOR ? (profile?.employment ?? null) : null
  const showEmployment = showCrewEmployment || supervisorEmployment !== null
  // El admin no tiene notificaciones (Ampliación B), tampoco en la cuenta demo.
  const hasNotifications = user.role !== ROLES.SUPER_ADMIN
  const notificationKeys = hasNotifications ? notificationKeysFor(isCrew) : []
  // Contacto es el 1; Información laboral y Notificaciones pueden faltar.
  const notificationsNumber = showEmployment ? 3 : 2
  const securityNumber = hasNotifications
    ? notificationsNumber + 1
    : notificationsNumber

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    // Se rehace en cada render: cuando llega el catálogo, la residencia se valida con él.
    resolver: zodResolver(profileSchemaFor(cities)),
    defaultValues: toFormValues(profile, notificationKeys),
  })

  // El toast va aquí y no en mutate: sale aunque el usuario ya haya salido de la pantalla.
  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      toast.success("Cambios guardados.")
      void queryClient.invalidateQueries({
        queryKey: myProfileQueryKey(user.id),
      })
    },
  })

  // El celular va sin espacios y las notificaciones solo con las claves del rol (el admin,
  // sin notifications). Mientras se guarda, ni un clic ni Enter en un campo repiten el envío.
  const onSubmit = (values: ProfileFormValues) => {
    if (mutation.isPending) return
    const input: UpdateMyProfileInput = {
      phone: values.phone.replace(/\s/g, ""),
      residence: values.residence,
    }
    if (hasNotifications) {
      input.notifications = Object.fromEntries(
        notificationKeys.map((key) => [key, values.notifications[key] === true])
      )
    }
    // Lo guardado pasa a ser el valor inicial, con los datos normalizados del backend.
    // Una ciudad que rechaza el backend (p. ej. sin catálogo en la pantalla) va al campo.
    mutation.mutate(input, {
      onSuccess: (saved) => reset(toFormValues(saved, notificationKeys)),
      onError: (error) => {
        if (error instanceof ProfileFieldError) {
          setError(
            error.field,
            { message: "Elige una ciudad de la lista." },
            { shouldFocus: true }
          )
        }
      },
    })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <ContactSection
        email={profile?.email ?? ""}
        cities={cities}
        citiesFailed={citiesFailed}
        register={register}
        errors={errors}
        disabled={isDemo}
      />
      {showCrewEmployment ? <EmploymentSection crew={crew} /> : null}
      {supervisorEmployment ? (
        <SupervisorEmploymentSection employment={supervisorEmployment} />
      ) : null}
      {hasNotifications ? (
        <NotificationsSection
          number={notificationsNumber}
          keys={notificationKeys}
          register={register}
          disabled={isDemo}
        />
      ) : null}
      <SecuritySection
        number={securityNumber}
        userId={user.id}
        passwordChangedAt={profile?.password_changed_at}
        disabled={isDemo}
      />

      <div className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className={cn(
              typography.bodySm,
              "flex items-center gap-2 text-muted-foreground"
            )}
          >
            <InfoIcon
              aria-hidden="true"
              className="size-4.5 shrink-0 text-brand-secondary"
            />
            {hasNotifications
              ? "Guarda tu contacto y tus notificaciones."
              : "Guarda tu contacto."}{" "}
            La foto y la contraseña se guardan aparte.
          </p>
          {mutation.isError &&
          !(mutation.error instanceof ProfileFieldError) ? (
            <p
              role="alert"
              className={cn(typography.bodySm, "text-destructive")}
            >
              No se pudieron guardar los cambios. Intenta de nuevo.
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          // Demo: disabled nativo. Guardando: aria-disabled, para no perder el foco.
          disabled={isDemo}
          aria-disabled={mutation.isPending || undefined}
          className={cn(
            typography.labelLg,
            "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-transparent bg-brand-secondary px-8 py-2 whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden active:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-secondary aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-brand-secondary motion-reduce:transition-none sm:shrink-0 lg:min-h-10"
          )}
        >
          <SaveIcon aria-hidden="true" className="size-4.5 shrink-0" />
          {mutation.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}

export default ProfileForm
