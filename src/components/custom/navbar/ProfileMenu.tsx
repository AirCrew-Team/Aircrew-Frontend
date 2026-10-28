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

import { barButton, popoverSurface } from "./navbar.styles"

interface ProfileMenuProps {
  user: AuthUser
  onOpenSettings?: () => void
  onLogout?: () => void
}

// Iniciales de las dos primeras palabras del nombre: "Juan Pablo" -> "JP".
const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

const itemClassName = cn(typography.bodyMd, "cursor-pointer gap-2.5 px-3 py-2")

const ProfileMenu = ({ user, onOpenSettings, onLogout }: ProfileMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menú de perfil de ${user.fullName}`}
        className={cn(barButton, "group gap-2.5 py-1 pr-2 pl-1")}
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
            className="flex size-8 items-center justify-center rounded-full bg-brand-secondary text-[13px] font-bold tracking-wide text-white shadow-sm"
          >
            {getInitials(user.fullName)}
          </span>
        )}
        <span className="hidden flex-col text-left lg:flex">
          <span className="text-[13px] leading-tight font-semibold text-white">
            {user.fullName}
          </span>
          <span className="text-[11px] leading-tight text-white/70">
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
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2">
            <span className={cn(typography.labelLg, "text-brand-primary")}>
              {user.fullName}
            </span>
            <span className={cn(typography.bodySm, "text-muted-foreground")}>
              {user.position}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-brand-border" />
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => onOpenSettings?.()}
        >
          <SettingsIcon aria-hidden="true" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className={itemClassName}
          onClick={() => onLogout?.()}
        >
          <LogoutIcon aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileMenu
