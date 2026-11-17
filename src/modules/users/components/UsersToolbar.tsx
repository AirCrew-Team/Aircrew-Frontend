import { useEffect, useId, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { AddUserIcon, SearchIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { cn } from "@/lib/utils"
import CreateUserDialog from "@/modules/users/components/CreateUserDialog"
import { getUsersStats } from "@/modules/users/data/users.data"
import { useUsersSearchParams } from "@/modules/users/hooks/useUsersSearchParams"
import type { UserRoleGroup } from "@/modules/users/types/users.types"

// Opciones del filtro por rol; «Todos» quita ?role= de la URL.
const ROLE_FILTERS: { value?: UserRoleGroup; label: string }[] = [
  { label: "Todos" },
  { value: "tripulacion", label: "Tripulación" },
  { value: "supervisor", label: "Supervisores" },
  { value: "administrador", label: "Administradores" },
]

// Bloque 3: buscador, filtros por rol y alta de usuario.
// La búsqueda y el filtro se guardan en la URL (?q= y ?role=) para enviarlos al backend.
const UsersToolbar = () => {
  const id = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  // Ventana «Añadir usuario» abierta o cerrada.
  const [createOpen, setCreateOpen] = useState(false)
  const { search, role, setSearch, setRole } = useUsersSearchParams()
  // Conteos de los filtros: misma consulta que los indicadores (UsersStats).
  const { data: stats } = useQuery({
    queryKey: ["users", "stats"],
    queryFn: getUsersStats,
  })

  // Atajo ⌘K / Ctrl+K: lleva el foco al buscador desde cualquier parte de la pantalla.
  // No se muestra en el campo; el lector de pantalla lo recibe por aria-keyshortcuts.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Conteo de cada filtro; sin datos todavía, el botón se muestra sin número.
  const countFor = (value?: UserRoleGroup) => {
    if (!stats) return null
    return value ? stats.byRole[value] : stats.total
  }

  return (
    // Móvil: buscador, filtros y botón apilados. Escritorio (lg): todo en una fila.
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      {/* Buscador. type="search" agrega la «x» para borrar en varios navegadores. */}
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`${id}-search`} className="sr-only">
          Buscar usuario
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={searchRef}
          id={`${id}-search`}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, ID de tripulante o base…"
          aria-keyshortcuts="Meta+K Control+K"
          className={cn(
            typography.bodySm,
            // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
            "min-h-11 w-full rounded-md border border-brand-border bg-muted py-2 pr-3 pl-9 text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden max-lg:text-base max-lg:leading-6 lg:min-h-10"
          )}
        />
      </div>

      {/* Filtros por rol: botones de alternancia (aria-pressed) dentro de un grupo nombrado. */}
      <div
        role="group"
        aria-label="Filtrar por rol"
        className="flex flex-wrap gap-2"
      >
        {ROLE_FILTERS.map(({ value, label }) => {
          const active = role === value
          const count = countFor(value)
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => setRole(value)}
              className={cn(
                typography.labelMd,
                "min-h-11 rounded-full px-3.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden lg:min-h-8",
                active
                  ? "bg-brand-primary text-white"
                  : "bg-brand-neutral text-brand-primary hover:bg-brand-border"
              )}
            >
              {label}
              {count === null ? null : ` (${count})`}
            </button>
          )
        })}
      </div>

      {/* Alta de usuario: abre la ventana con el formulario. */}
      <Button
        onClick={() => setCreateOpen(true)}
        className={cn(
          typography.labelLg,
          "min-h-11 shrink-0 gap-2 rounded-md bg-brand-secondary px-4 text-white hover:bg-brand-secondary-hover focus-visible:ring-brand-tertiary lg:min-h-10"
        )}
      >
        <AddUserIcon aria-hidden="true" />
        Añadir usuario
      </Button>
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}

export default UsersToolbar
