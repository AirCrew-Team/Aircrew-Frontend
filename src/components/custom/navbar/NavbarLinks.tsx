import { NavLink } from "react-router"

import type { NavItem } from "@/App/types/navigation.types"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

import { focusRing } from "./navbar.styles"

interface NavbarLinksProps {
  items: NavItem[]
  // "horizontal" para la barra (lg+) y "vertical" para el panel móvil.
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
                  isVertical
                    ? [typography.bodyMd, "py-3"]
                    : [typography.navLabel, "py-1.5"],
                  "block rounded-md px-3 whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-brand-secondary/40 font-semibold text-white"
                    : "font-medium text-white/80 hover:bg-brand-secondary/25 hover:text-white",
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
