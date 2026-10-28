import { useRef } from "react"
import { Link, useLocation } from "react-router"

import type { AuthUser } from "@/App/types/auth.types"
import { ChevronDownIcon, LogoutIcon, SettingsIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { PATHS } from "@/routes/paths"
import { useAuthStore } from "@/stores/auth.store"

import { barButton, popoverSurface } from "./navbar.styles"

interface ProfileMenuProps {
  user: AuthUser
}

// Iniciales de las dos primeras palabras del nombre: "Juan Pablo" -> "JP".
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

const itemClassName = cn(
  typography.bodyMd,
  "cursor-pointer gap-2.5 px-3 py-3 lg:py-2"
)

const ProfileMenu = ({ user }: ProfileMenuProps) => {
  const logout = useAuthStore((state) => state.logout)
  const { pathname } = useLocation()
  // Si el ítem navega a otra ruta, MainLayout enfoca <main>; el menú no debe devolver el foco al botón.
  const navigatingRef = useRef(false)

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) navigatingRef.current = false
      }}
    >
      <DropdownMenuTrigger
        aria-label={`Menú de perfil de ${user.displayName}`}
        className={cn(barButton, "group gap-2.5 py-1.5 pr-2 pl-1 lg:py-1")}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              typography.navLabel,
              "flex size-8 items-center justify-center rounded-full bg-brand-secondary font-bold tracking-wide text-white shadow-sm"
            )}
          >
            {getInitials(user.displayName)}
          </span>
        )}
        <span className="hidden max-w-40 min-w-0 flex-col text-left xl:flex">
          <span
            className={cn(
              typography.navLabel,
              "truncate leading-tight font-semibold text-white"
            )}
          >
            {user.displayName}
          </span>
          <span
            className={cn(
              typography.labelSm,
              "truncate leading-tight text-white/70"
            )}
          >
            {user.position}
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 text-white/60 transition-transform group-hover:text-white group-data-popup-open:rotate-180"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(popoverSurface, "min-w-56")}
        finalFocus={() => !navigatingRef.current}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2">
            <span className={cn(typography.labelLg, "text-brand-primary")}>
              {user.displayName}
            </span>
            <span className={cn(typography.bodySm, "text-muted-foreground")}>
              {user.position}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-brand-border" />
        <DropdownMenuItem
          render={<Link to={PATHS.configuracion} />}
          className={itemClassName}
          onClick={() => {
            // En /configuracion el pathname no cambia y MainLayout no enfoca <main>.
            navigatingRef.current = pathname !== PATHS.configuracion
          }}
        >
          <SettingsIcon aria-hidden="true" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className={itemClassName}
          onClick={logout}
        >
          <LogoutIcon aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileMenu
