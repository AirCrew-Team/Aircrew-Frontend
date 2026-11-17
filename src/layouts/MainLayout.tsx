import { useEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router"

import DevRoleSwitcher from "@/components/custom/DevRoleSwitcher"
import Navbar from "@/components/custom/navbar/Navbar"
import { NAV_ITEMS_BY_ROLE } from "@/routes/navigation"
import { useAuthStore } from "@/stores/auth.store"

// Diseño base compartido por todos los roles: solo cambian las secciones del navbar.
const MainLayout = () => {
  const user = useAuthStore((state) => state.user)
  const { pathname, state } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // Última ruta enfocada: evita mover el foco en la carga inicial (y en el doble efecto de StrictMode).
  // Tras el login (state.focusMain) empieza vacía para que el efecto enfoque main al montarse.
  const lastPathnameRef = useRef<string | null>(
    state?.focusMain ? null : pathname
  )

  // Al navegar, el foco pasa al contenido para que el lector de pantalla no se quede en el enlace pulsado.
  useEffect(() => {
    if (lastPathnameRef.current === pathname) return
    lastPathnameRef.current = pathname
    mainRef.current?.focus()
  }, [pathname])

  // ProtectedRoute garantiza el usuario; esto solo protege el tipado.
  if (!user) return null

  return (
    <div className="min-h-svh bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-brand-primary"
      >
        Saltar al contenido principal
      </a>
      <Navbar items={NAV_ITEMS_BY_ROLE[user.role]} user={user} />
      <main
        id="contenido"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 py-6 outline-none md:px-8"
      >
        <Outlet />
      </main>
      {import.meta.env.DEV && <DevRoleSwitcher />}
    </div>
  )
}

export default MainLayout
