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

interface NavbarProps {
  items: NavItem[]
  user: AuthUser
}

const MOBILE_MENU_ID = "navbar-mobile-menu"

const Navbar = ({ items, user }: NavbarProps) => {
  const { pathname } = useLocation()
  // Guarda la ruta en la que se abrió el menú móvil: al navegar deja de coincidir y se cierra solo.
  const [mobileOpenAt, setMobileOpenAt] = useState<string | null>(null)
  const isMobileOpen = mobileOpenAt === pathname

  const closeMobileMenu = () => setMobileOpenAt(null)
  const toggleMobileMenu = () => setMobileOpenAt(isMobileOpen ? null : pathname)

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/15 bg-brand-primary text-white shadow-sm">
      <div className="flex h-16 items-center justify-between gap-2 px-4 sm:gap-4 md:px-8">
        <NavbarBrand />

        <div className="flex items-center gap-4">
          <NavbarLinks items={items} className="hidden lg:block" />

          <div className="flex items-center gap-1 sm:gap-2 lg:border-l lg:border-brand-border/15 lg:pl-4">
            <NotificationsMenu />
            <ProfileMenu user={user} />
            <button
              type="button"
              aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileOpen}
              aria-controls={MOBILE_MENU_ID}
              onClick={toggleMobileMenu}
              className={cn(barButton, "size-11 justify-center lg:hidden")}
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
          className="border-t border-brand-border/15 bg-brand-primary-dark px-4 py-3 md:px-8 lg:hidden"
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
