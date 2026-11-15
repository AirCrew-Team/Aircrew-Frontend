import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { typography } from "@/App/utils/typography"
import { PASSWORD_RULES } from "@/components/custom/passwordRules"
import { VisibilityToggle } from "@/components/custom/VisibilityToggle"
import { cn } from "@/lib/utils"
import {
  controlClass,
  errorClass,
  fieldLabelClass,
} from "@/modules/operatorProfile/components/formStyles"
import {
  ProfileFieldError,
  changePassword,
} from "@/modules/operatorProfile/data/operatorProfile.data"
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/modules/operatorProfile/schemas/changePassword.schema"

type PasswordName = keyof ChangePasswordFormValues

const EMPTY: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

// Nivel de fortaleza según cuántas reglas de PASSWORD_RULES cumple (las mismas del login).
const strengthOf = (password: string) => {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length
  const percent = (passed / PASSWORD_RULES.length) * 100
  if (passed === PASSWORD_RULES.length) {
    return {
      percent,
      label: "Fuerte (Recomendada)",
      tone: "bg-brand-secondary",
      text: "text-brand-secondary",
    }
  }
  if (passed >= 3) {
    return {
      percent,
      label: "Media",
      tone: "bg-amber-500",
      text: "text-amber-700",
    }
  }
  return {
    percent,
    label: "Débil",
    tone: "bg-destructive",
    text: "text-destructive",
  }
}

const buttonClass = cn(
  typography.labelMd,
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:outline-hidden lg:min-h-9"
)

interface ChangePasswordPanelProps {
  userId: string
}

// Cambio de contraseña, separado del resto del perfil: se abre con «Cambiar contraseña»,
// pide la actual, la nueva y su confirmación, y se envía con su propio botón (con la
// API, un POST aparte). La contraseña actual nunca se muestra llena: el backend no la
// guarda en texto, solo cifrada; el ojo de cada campo deja ver lo que se escribe.
// Va dentro del formulario del perfil (HTML no permite un form dentro de otro), así que
// sus botones son type="button" y Enter en sus campos envía solo la contraseña.
const ChangePasswordPanel = ({ userId }: ChangePasswordPanelProps) => {
  const id = useId()
  const queryClient = useQueryClient()
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // Qué contraseñas se ven en texto plano (ojo de cada campo).
  const [visible, setVisible] = useState<Record<PasswordName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  })
  const newPassword = useWatch({ control, name: "newPassword" })
  const strength = strengthOf(newPassword)

  // Al abrir, el foco pasa a «Contraseña Actual», el primer campo que hay que llenar.
  useEffect(() => {
    if (open) document.getElementById(`${id}-currentPassword`)?.focus()
  }, [open, id])

  // Cierra el panel, limpia lo escrito y devuelve el foco a «Cambiar contraseña».
  const close = () => {
    reset(EMPTY)
    setVisible({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    })
    setOpen(false)
    requestAnimationFrame(() => openButtonRef.current?.focus())
  }

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(userId, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      // Refresca el perfil: el último cambio pasa a «hoy».
      queryClient.invalidateQueries({ queryKey: ["operatorProfile"] })
      toast.success("Contraseña actualizada", {
        description: "Usa la nueva contraseña en tu próximo inicio de sesión.",
      })
      mutation.reset()
      close()
    },
    onError: (error) => {
      // Contraseña actual incorrecta: se marca en su campo y se enfoca.
      if (
        error instanceof ProfileFieldError &&
        error.field === "currentPassword"
      ) {
        setError(
          "currentPassword",
          { message: error.message },
          { shouldFocus: true }
        )
      }
    },
  })

  const submit = handleSubmit((values) => mutation.mutate(values))

  // Enter en un campo de contraseña envía solo la contraseña, no el perfil.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      submit()
    }
  }

  const genericError =
    mutation.isError && !(mutation.error instanceof ProfileFieldError)

  // Cerrado: la contraseña oculta, el último cambio y el botón para cambiarla.
  if (!open) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <span className={fieldLabelClass}>Contraseña</span>
          <span
            aria-hidden="true"
            className={cn(typography.bodyMd, "tracking-widest text-foreground")}
          >
            ••••••••••
          </span>
        </div>
        <button
          ref={openButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            buttonClass,
            "border border-brand-border bg-card text-brand-primary hover:bg-brand-neutral"
          )}
        >
          Cambiar contraseña
        </button>
      </div>
    )
  }

  const passwordField = (
    name: PasswordName,
    label: string,
    autoComplete: string,
    placeholder?: string
  ) => {
    const message = errors[name]?.message
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${id}-${name}`} className={fieldLabelClass}>
          {label}
        </label>
        <div className="relative">
          <input
            id={`${id}-${name}`}
            type={visible[name] ? "text" : "password"}
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-required="true"
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-${name}-error` : undefined}
            onKeyDown={onKeyDown}
            className={cn(controlClass, "pr-12")}
            {...register(name)}
          />
          {/* Ojo (el mismo del login): muestra u oculta lo que se escribe. */}
          <VisibilityToggle
            label={label.toLowerCase()}
            isVisible={visible[name]}
            iconSize={18}
            onToggle={() =>
              setVisible((current) => ({ ...current, [name]: !current[name] }))
            }
            className="absolute top-1/2 right-1 size-11 -translate-y-1/2 text-muted-foreground lg:size-9"
          />
        </div>
        {message ? (
          <p id={`${id}-${name}-error`} className={errorClass}>
            {message}
          </p>
        ) : null}
      </div>
    )
  }

  // Abierto: los tres campos, la fortaleza y sus botones.
  return (
    <div
      role="group"
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-lg bg-muted p-4"
    >
      <p id={`${id}-title`} className={fieldLabelClass}>
        Cambiar contraseña
      </p>
      {/* Móvil: una columna. Desde md: las tres contraseñas en una fila. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {passwordField(
          "currentPassword",
          "Contraseña Actual",
          "current-password"
        )}
        {passwordField(
          "newPassword",
          "Nueva Contraseña",
          "new-password",
          "Mínimo 8 caracteres"
        )}
        {passwordField(
          "confirmPassword",
          "Confirmar Contraseña",
          "new-password",
          "Repite la contraseña"
        )}
      </div>

      {/* Nivel de fortaleza de la nueva contraseña (se anuncia al cambiar). */}
      <div className="flex flex-col gap-2 rounded-md bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={cn(
            typography.labelSm,
            "flex flex-wrap items-center gap-2 text-muted-foreground uppercase"
          )}
        >
          Nivel de fortaleza:
          <span
            aria-hidden="true"
            className="h-1.5 w-28 overflow-hidden rounded-full bg-brand-border"
          >
            <span
              className={cn("block h-full rounded-full", strength.tone)}
              style={{ width: `${newPassword ? strength.percent : 0}%` }}
            />
          </span>
          <span className={cn("normal-case", strength.text)}>
            {newPassword ? strength.label : "Sin escribir"}
          </span>
        </p>
        <p className={cn(typography.labelSm, "text-muted-foreground")}>
          Usa mayúsculas, minúsculas, números y símbolos
        </p>
      </div>

      {/* Botones propios: no envían el formulario del perfil. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {genericError ? (
          <p role="alert" className={errorClass}>
            No se pudo actualizar la contraseña. Intenta de nuevo.
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              mutation.reset()
              close()
            }}
            disabled={mutation.isPending}
            className={cn(
              buttonClass,
              "text-brand-primary hover:bg-brand-neutral disabled:opacity-60"
            )}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => submit()}
            disabled={mutation.isPending}
            className={cn(
              buttonClass,
              "bg-brand-secondary text-white hover:bg-brand-secondary-hover disabled:cursor-wait disabled:opacity-70"
            )}
          >
            {mutation.isPending ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPanel
