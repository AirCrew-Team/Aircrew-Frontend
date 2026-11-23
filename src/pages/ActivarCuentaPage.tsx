import { useSearchParams } from "react-router"

import {
  activateAccount,
  checkActivationToken,
} from "@/App/actions/auth/auth.actions"
import { AuthHero } from "@/modules/shared/auth/AuthHero"
import { NewPasswordPanel } from "@/modules/shared/auth/NewPasswordPanel"

/** Página pública a la que lleva el enlace de invitación: compone el hero y el panel. */
const ActivarCuentaPage = () => {
  const [searchParams] = useSearchParams()

  return (
    <main className="grid min-h-svh grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] bg-[#f7faff] text-[#123e60] max-[900px]:grid-cols-[minmax(0,.85fr)_minmax(400px,1.15fr)] max-[700px]:block">
      <AuthHero />
      <NewPasswordPanel
        busyLabel="Activando…"
        checkToken={checkActivationToken}
        invalidLinkMessage="Este enlace de activación no es válido o ya venció. Pide a tu supervisor que te envíe una nueva invitación. Si ya activaste tu cuenta, inicia sesión."
        loginToast="Cuenta activada. Ya puedes iniciar sesión."
        submit={activateAccount}
        submitLabel="Activar cuenta"
        subtitle="Crea tu contraseña para entrar a AirCrew."
        title="Activa tu cuenta"
        token={searchParams.get("token") ?? ""}
        welcomeToast="Cuenta activada. ¡Bienvenido a AirCrew!"
      />
    </main>
  )
}

export default ActivarCuentaPage
