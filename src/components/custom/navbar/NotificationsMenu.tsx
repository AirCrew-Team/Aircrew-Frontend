import { NotificationsEmptyIcon, NotificationsIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { barButton, popoverSurface } from "./navbar.styles"

// Solo interfaz: el listado real se conectará cuando exista el módulo de notificaciones.
const NotificationsMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notificaciones"
        className={cn(barButton, "size-11 justify-center lg:size-9")}
      >
        <NotificationsIcon className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(popoverSurface, "w-80 max-w-[calc(100vw-2rem)]")}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel
            className={cn(
              typography.labelSm,
              "px-3 py-2 text-brand-primary uppercase"
            )}
          >
            Notificaciones
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-brand-border" />
        <div
          role="status"
          className="flex flex-col items-center gap-2 px-4 py-8 text-center"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-neutral text-brand-secondary">
            <NotificationsEmptyIcon className="size-5" aria-hidden="true" />
          </span>
          <p className={cn(typography.bodyMd, "text-muted-foreground")}>
            No tienes notificaciones nuevas
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationsMenu
