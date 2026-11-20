import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Outlet, useLocation } from "react-router"

import {
  getMyProfile,
  myPhotoUrl,
  myProfileQueryKey,
} from "@/App/actions/profile/profile.actions"
import DevRoleSwitcher from "@/components/custom/DevRoleSwitcher"
import Navbar from "@/components/custom/navbar/Navbar"
import { NAV_ITEMS_BY_ROLE } from "@/routes/navigation"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Diseño base compartido por todos los roles: solo cambian las secciones del navbar.
const MainLayout = () => {
  const user = useAuthStore((state) => state.user)
  const isRealUser = user !== null && !isDemoUser(user)
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

  // Foto del avatar del navbar. Misma consulta que Configuración: al subir o quitar la
  // foto allí, el navbar cambia sin recargar. Las cuentas demo no piden nada. Corre en
  // todas las pantallas, así que este observador no reintenta ni recarga por su cuenta;
  // Configuración conserva sus opciones y sus cambios llegan por la caché.
  const { data: profile } = useQuery({
    queryKey: myProfileQueryKey(user?.id ?? ""),
    queryFn: getMyProfile,
    enabled: isRealUser,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const photoUrl =
    isRealUser && profile?.photo_updated_at
      ? myPhotoUrl(profile.photo_updated_at)
      : null

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
      <Navbar
        items={NAV_ITEMS_BY_ROLE[user.role]}
        user={user}
        photoUrl={photoUrl}
      />
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
