import { NavLink } from "react-router"

import type { NavItem } from "@/App/types/navigation.types"
import { cn } from "@/lib/utils"

import { focusRing } from "./navbar.styles"

interface NavbarLinksProps {
  items: NavItem[]
  // "horizontal" para la barra (md+) y "vertical" para el panel móvil.
  orientation?: "horizontal" | "vertical"
  onNavigate?: () => void
  className?: string
}

const NavbarLinks = ({
  items,
  orientation = "horizontal",
  onNavigate,
  className,
}: NavbarLinksProps) => {
  const isVertical = orientation === "vertical"

  return (
    <nav aria-label="Navegación principal" className={className}>
      <ul
        className={cn(
          "flex",
          isVertical ? "flex-col gap-1" : "items-center gap-1.5"
        )}
      >
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "block rounded-md font-medium whitespace-nowrap transition-colors",
                  isVertical
                    ? "px-3 py-2.5 text-sm"
                    : "px-3 py-1.5 text-[13px]",
                  isActive
                    ? "bg-brand-secondary font-semibold text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                  focusRing
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default NavbarLinks
