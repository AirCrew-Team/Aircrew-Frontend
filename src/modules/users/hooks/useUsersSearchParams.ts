import { useSearchParams } from "react-router"

import type { UserRoleGroup } from "@/modules/users/types/users.types"

const ROLE_GROUPS: UserRoleGroup[] = [
  "tripulacion",
  "supervisor",
  "administrador",
]

// ?page=abc, ?page=0 o ?page=-2 se leen como la página 1.
const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// Un ?role= desconocido se ignora (equivale a «Todos»).
const parseRole = (value: string | null) =>
  ROLE_GROUPS.find((role) => role === value)

// Estado de la lista guardado en la URL: ?page=, ?q= (búsqueda) y ?role= (filtro).
// Al vivir en la URL, la vista se puede recargar, compartir y recorrer con atrás/adelante,
// y estos mismos valores son los que se enviarán al backend.
export const useUsersSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parsePage(searchParams.get("page"))
  const search = searchParams.get("q") ?? ""
  const role = parseRole(searchParams.get("role"))

  // Cambia un parámetro sin perder los demás. Al buscar o filtrar se vuelve a la página 1,
  // porque la página en la que estaba puede no existir con el nuevo resultado.
  const update = (
    changes: Record<string, string | undefined>,
    options: { resetPage: boolean; replace?: boolean }
  ) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (options.resetPage) next.delete("page")
        return next
      },
      { replace: options.replace }
    )
  }

  return {
    page,
    search,
    role,
    // Cambiar de página crea una entrada en el historial: «atrás» vuelve a la anterior.
    setPage: (nextPage: number, options?: { replace?: boolean }) =>
      update({ page: String(nextPage) }, { resetPage: false, ...options }),
    // replace: escribir no llena el historial con una entrada por tecla.
    setSearch: (nextSearch: string) =>
      update(
        { q: nextSearch.trim() ? nextSearch : undefined },
        {
          resetPage: true,
          replace: true,
        }
      ),
    setRole: (nextRole?: UserRoleGroup) =>
      update({ role: nextRole }, { resetPage: true }),
    // Dirección (?...) de una página concreta, para los enlaces de la paginación.
    hrefForPage: (targetPage: number) => {
      const next = new URLSearchParams(searchParams)
      next.set("page", String(targetPage))
      return `?${next.toString()}`
    },
  }
}
