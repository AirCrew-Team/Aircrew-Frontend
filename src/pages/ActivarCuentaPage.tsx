import { useSearchParams } from "react-router"

import { ActivatePanel } from "@/modules/activateAccount/ActivatePanel"
import { AuthHero } from "@/modules/shared/auth/AuthHero"

/** Página pública a la que lleva el enlace de invitación: compone el hero y el panel. */
const ActivarCuentaPage = () => {
  const [searchParams] = useSearchParams()

  return (
    <main className="grid min-h-svh grid-cols-[minmax(0,1.03fr)_minmax(430px,0.97fr)] bg-[#f7faff] text-[#123e60] max-[900px]:grid-cols-[minmax(0,.85fr)_minmax(400px,1.15fr)] max-[700px]:block">
      <AuthHero />
      <ActivatePanel token={searchParams.get("token") ?? ""} />
    </main>
  )
}

export default ActivarCuentaPage
