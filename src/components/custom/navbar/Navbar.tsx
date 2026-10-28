import { useState } from "react"
import { useLocation } from "react-router"

import type { AuthUser } from "@/App/types/auth.types"
import type { NavItem } from "@/App/types/navigation.types"
import { CloseIcon, MenuIcon } from "@/App/utils/icons"
import { cn } from "@/lib/utils"

import NavbarBrand from "./NavbarBrand"
import NavbarLinks from "./NavbarLinks"
import NotificationsMenu from "./NotificationsMenu"
import ProfileMenu from "./ProfileMenu"
import { barButton } from "./navbar.styles"

export interface NavbarProps {
  items: NavItem[]
  user: AuthUser
  hasUnreadNotifications?: boolean
  onOpenSettings?: () => void
  onLogout?: () => void
}

const MOBILE_MENU_ID = "navbar-mobile-menu"

const Navbar = ({
  items,
  user,
  hasUnreadNotifications = false,
  onOpenSettings,
  onLogout,
}: NavbarProps) => {
  const { pathname } = useLocation()
  // Guarda la ruta en la que se abrió el menú móvil: al navegar deja de coincidir y se cierra solo.
  const [mobileOpenAt, setMobileOpenAt] = useState<string | null>(null)
  const isMobileOpen = mobileOpenAt === pathname

  const closeMobileMenu = () => setMobileOpenAt(null)
  const toggleMobileMenu = () => setMobileOpenAt(isMobileOpen ? null : pathname)

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(210,224,240,0.15)] bg-brand-primary text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <NavbarBrand />

        <div className="flex items-center gap-4">
          <NavbarLinks items={items} className="hidden md:block" />

          <div className="flex items-center gap-2 md:border-l md:border-white/15 md:pl-4">
            <NotificationsMenu hasUnread={hasUnreadNotifications} />
            <ProfileMenu
              user={user}
              onOpenSettings={onOpenSettings}
              onLogout={onLogout}
            />
            <button
              type="button"
              aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileOpen}
              aria-controls={MOBILE_MENU_ID}
              onClick={toggleMobileMenu}
              className={cn(barButton, "size-9 justify-center md:hidden")}
            >
              {isMobileOpen ? (
                <CloseIcon className="size-5" aria-hidden="true" />
              ) : (
                <MenuIcon className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileOpen && (
        <div
          id={MOBILE_MENU_ID}
          className="border-t border-[rgba(210,224,240,0.15)] bg-brand-primary-dark px-4 py-3 md:hidden"
        >
          <NavbarLinks
            items={items}
            orientation="vertical"
            onNavigate={closeMobileMenu}
          />
        </div>
      )}
    </header>
  )
}

export default Navbar
