import { useSearchParams } from "react-router"

import { checkResetToken, resetPassword } from "@/App/actions/auth/auth.actions"
import { AuthHero } from "@/modules/shared/auth/AuthHero"
import { NewPasswordPanel } from "@/modules/shared/auth/NewPasswordPanel"

/** Página pública a la que lleva el enlace del correo de recuperación: hero y panel. */
const RestablecerContrasenaPage = () => {
  const [searchParams] = useSearchParams()

  return (
    <main className="grid min-h-svh grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] bg-[#f7faff] text-[#123e60] max-[900px]:grid-cols-[minmax(0,.85fr)_minmax(400px,1.15fr)] max-[700px]:block">
      <AuthHero />
      <NewPasswordPanel
        busyLabel="Cambiando…"
        checkToken={checkResetToken}
        invalidLinkMessage="Este enlace para restablecer la contraseña no es válido o ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?» en el inicio de sesión."
        limitFallback="Ya cambiaste tu contraseña 3 veces en las últimas 24 horas. Podrás cambiarla de nuevo más tarde."
        loginToast="Contraseña actualizada. Ya puedes iniciar sesión."
        submit={resetPassword}
        submitLabel="Cambiar contraseña"
        subtitle="Crea una contraseña nueva para tu cuenta."
        title="Restablece tu contraseña"
        token={searchParams.get("token") ?? ""}
        welcomeToast="Contraseña actualizada. ¡Bienvenido de nuevo!"
      />
    </main>
  )
}

export default RestablecerContrasenaPage
