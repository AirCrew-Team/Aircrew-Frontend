import { useRef, useState } from "react"
import { Link, useLocation } from "react-router"

import { logout as logoutRequest } from "@/App/actions/auth/auth.actions"
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
  // URL de la foto de perfil; sin foto (o en las cuentas demo), las iniciales.
  photoUrl?: string | null
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

const ProfileMenu = ({ user, photoUrl }: ProfileMenuProps) => {
  const logout = useAuthStore((state) => state.logout)
  // URL que no se pudo cargar: vuelven las iniciales hasta que llegue otra (otro ?v=).
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)
  const photo = photoUrl ?? user.avatarUrl ?? null
  const shownPhoto = photo !== brokenSrc ? photo : null
  const { pathname } = useLocation()
  // Si el ítem navega a otra ruta, MainLayout enfoca <main>; el menú no debe devolver el foco al botón.
  const navigatingRef = useRef(false)

  // Borra la cookie en el backend (también con sesión demo, por si quedó una real) y
  // cierra la sesión del navegador aunque la llamada falle (F7).
  const handleLogout = async () => {
    try {
      await logoutRequest()
    } catch {
      // Sin backend o con error, la sesión del navegador se cierra igual.
    }
    logout()
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) navigatingRef.current = false
      }}
    >
      <DropdownMenuTrigger
        // WCAG 2.5.3: desde xl se ve «{displayName} {position}» y el nombre lo contiene.
        aria-label={`Menú de perfil de ${user.displayName} ${user.position}`}
        className={cn(barButton, "group gap-2.5 py-1.5 pr-2 pl-1 lg:py-1")}
      >
        {shownPhoto ? (
          <img
            src={shownPhoto}
            alt=""
            onError={() => setBrokenSrc(shownPhoto)}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          // Las iniciales van como contenido CSS, no como texto del DOM: axe cuenta como
          // texto visible del botón todo lo que se ve (aunque sea aria-hidden), y con «JP»
          // ningún nombre que empiece por «Menú de perfil de …» lo contendría (WCAG 2.5.3).
          <span
            aria-hidden="true"
            data-initials={getInitials(user.displayName)}
            className={cn(
              typography.navLabel,
              "flex size-8 items-center justify-center rounded-full bg-brand-secondary font-bold tracking-wide text-white shadow-sm before:content-[attr(data-initials)]"
            )}
          />
        )}
        <span className="hidden max-w-40 min-w-0 flex-col text-left xl:flex">
          <span
            className={cn(
              typography.navLabel,
              "truncate leading-tight font-semibold text-white"
            )}
          >
            {user.displayName}
          </span>{" "}
          {/* El espacio separa nombre y cargo en el texto visible (no se pinta en flex). */}
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
          onClick={() => void handleLogout()}
        >
          <LogoutIcon aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileMenu
