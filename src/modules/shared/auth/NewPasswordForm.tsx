import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import {
  login,
  logout,
  TooManyRequestsError,
} from "@/App/actions/auth/auth.actions"
import { ArrowRightIcon, CheckIcon, PasswordIcon } from "@/App/utils/icons"
import { Button } from "@/components/custom/Button"
import { InputField } from "@/components/custom/InputField"
import { VisibilityToggle } from "@/components/custom/VisibilityToggle"
import { HOME_PATH_BY_ROLE } from "@/routes/navigation"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import {
  NEW_PASSWORD_RULES,
  newPasswordSchema,
  type NewPasswordFormValues,
} from "./newPassword.schema"
import {
  loginFieldClass,
  loginInputClass,
  loginPrimaryButtonClass,
} from "./styles"

type NewPasswordFormProps = {
  token: string
  /** Guarda la contraseña con el token (activateAccount o resetPassword) y devuelve el correo. */
  submit: (credentials: {
    token: string
    password: string
  }) => Promise<{ email: string }>
  submitLabel: string
  busyLabel: string
  /** Toast cuando el login automático funciona. */
  welcomeToast: string
  /** Toast cuando la contraseña se guardó pero el login falló. */
  loginToast: string
  /** El backend rechazó el token (400): el padre cambia el formulario por el aviso. */
  onInvalidLink: () => void
  /** Límite (429), solo en el restablecimiento: recibe el texto del backend o "". */
  onLimit?: (message: string) => void
}

const errorClass = "mt-2 px-2 text-sm font-semibold text-[#b42318]"

/** Formulario para crear la contraseña nueva con el token del enlace y abrir la sesión. */
export function NewPasswordForm({
  token,
  submit,
  submitLabel,
  busyLabel,
  welcomeToast,
  loginToast,
  onInvalidLink,
  onLimit,
}: NewPasswordFormProps) {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [networkError, setNetworkError] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const password = useWatch({ control, name: "password" })

  const onSubmit = async (values: NewPasswordFormValues) => {
    setNetworkError(false)
    try {
      const { email } = await submit({ token, password: values.password })
      // La contraseña ya quedó guardada: si el login falla, solo se pide iniciar sesión.
      try {
        const user = await login(email, values.password)
        useAuthStore.getState().setUser(user)
        toast.success(welcomeToast)
        navigate(HOME_PATH_BY_ROLE[user.role], {
          replace: true,
          state: { focusMain: true },
        })
      } catch {
        // Si había otra sesión abierta, se cierra: sin esto, /login redirigiría
        // al inicio de esa otra persona.
        await logout().catch(() => {})
        useAuthStore.getState().logout()
        toast.success(loginToast)
        navigate(PATHS.login, { replace: true })
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        onInvalidLink()
      } else if (error instanceof TooManyRequestsError && onLimit) {
        onLimit(error.message)
      } else {
        setNetworkError(true)
      }
    }
  }

  return (
    <form className="w-full" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-5">
        <div>
          <InputField
            aria-describedby={
              errors.password
                ? "password-rules password-error"
                : "password-rules"
            }
            aria-invalid={errors.password ? true : undefined}
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect="off"
            fieldClassName={loginFieldClass}
            icon={<PasswordIcon size={21} strokeWidth={1.8} />}
            iconClassName="grid shrink-0 place-items-center"
            inputClassName={loginInputClass}
            label="Nueva contraseña"
            placeholder="Nueva contraseña"
            trailing={
              <VisibilityToggle
                className="grid size-9 place-items-center rounded-[9px] bg-transparent text-[#315775] hover:bg-[#edf5fa]"
                iconSize={21}
                isVisible={showPassword}
                label="contraseña"
                onToggle={() => setShowPassword((visible) => !visible)}
              />
            }
            spellCheck={false}
            trailingClassName="flex shrink-0 items-center"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
          {errors.password && (
            <p className={errorClass} id="password-error">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Reglas siempre visibles; se marcan en vivo mientras escribe */}
        <ul
          aria-label="Requisitos de contraseña"
          id="password-rules"
          className="-mt-2 mb-0 grid list-none gap-1 rounded-lg bg-[#f0f5f9] p-3 text-xs"
        >
          {NEW_PASSWORD_RULES.map((rule) => {
            const isSatisfied = rule.test(password)
            return (
              <li
                className={`flex items-center gap-2 ${
                  isSatisfied ? "text-[#177245]" : "text-[#8192a8]"
                }`}
                key={rule.label}
              >
                <CheckIcon
                  aria-hidden="true"
                  className={isSatisfied ? "opacity-100" : "opacity-30"}
                  size={14}
                />
                {rule.label}
                <span className="sr-only">
                  {isSatisfied ? " (cumplido)" : " (pendiente)"}
                </span>
              </li>
            )
          })}
        </ul>

        <div>
          <InputField
            aria-describedby={
              errors.confirmPassword ? "confirm-error" : undefined
            }
            aria-invalid={errors.confirmPassword ? true : undefined}
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect="off"
            fieldClassName={loginFieldClass}
            icon={<PasswordIcon size={21} strokeWidth={1.8} />}
            iconClassName="grid shrink-0 place-items-center"
            inputClassName={loginInputClass}
            label="Confirmar contraseña"
            placeholder="Confirmar contraseña"
            trailing={
              <VisibilityToggle
                className="grid size-9 place-items-center rounded-[9px] bg-transparent text-[#315775] hover:bg-[#edf5fa]"
                iconSize={21}
                isVisible={showConfirm}
                label="confirmación de contraseña"
                onToggle={() => setShowConfirm((visible) => !visible)}
              />
            }
            spellCheck={false}
            trailingClassName="flex shrink-0 items-center"
            type={showConfirm ? "text" : "password"}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className={errorClass} id="confirm-error">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      {networkError && (
        <p
          className="mt-4 text-center text-sm font-semibold text-[#b42318]"
          role="alert"
        >
          No pudimos conectar con el servidor. Intenta de nuevo.
        </p>
      )}

      <Button
        className={`${loginPrimaryButtonClass} mt-8`}
        disabled={isSubmitting}
        type="submit"
      >
        <span>{isSubmitting ? busyLabel : submitLabel}</span>
        <ArrowRightIcon aria-hidden="true" size={22} strokeWidth={1.8} />
      </Button>
    </form>
  )
}
