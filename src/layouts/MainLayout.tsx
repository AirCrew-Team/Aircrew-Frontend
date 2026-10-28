import { Outlet } from "react-router"

import DevRoleSwitcher from "@/components/custom/DevRoleSwitcher"
import { Navbar } from "@/components/custom/navbar"
import { NAV_ITEMS_BY_ROLE } from "@/routes/navigation"
import { useAuthStore } from "@/stores/auth.store"

// Diseño base compartido por todos los roles: solo cambian las secciones del navbar.
const MainLayout = () => {
  const user = useAuthStore((state) => state.user)

  // ProtectedRoute garantiza el usuario; esto solo protege el tipado.
  if (!user) return null

  return (
    <div className="min-h-svh bg-background">
      <Navbar
        items={NAV_ITEMS_BY_ROLE[user.role]}
        user={user}
        hasUnreadNotifications
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <Outlet />
      </main>
      {import.meta.env.DEV && <DevRoleSwitcher />}
    </div>
  )
}

export default MainLayout
