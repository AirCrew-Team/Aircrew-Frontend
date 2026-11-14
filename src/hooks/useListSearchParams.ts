import { useSearchParams } from "react-router"

// ?page=abc, ?page=0 o ?page=-2 se leen como la página 1.
const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

interface ListSearchParamsOptions<Filter extends string> {
  // Nombre del parámetro del filtro en la URL, ej. "status" → ?status=verificado.
  filterParam: string
  // Valores válidos del filtro; cualquier otro se ignora (equivale a «Todos»).
  filterValues: readonly Filter[]
}

// Estado de una lista paginada guardado en la URL: ?page= (página), ?q= (búsqueda) y un
// filtro con el nombre que elija cada pantalla. Genérico: lo puede usar cualquier lista
// (Certificaciones, Aeronaves…). Al vivir en la URL, la vista se puede recargar,
// compartir y recorrer con atrás/adelante, y estos valores son los que irán al backend.
export const useListSearchParams = <Filter extends string>({
  filterParam,
  filterValues,
}: ListSearchParamsOptions<Filter>) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parsePage(searchParams.get("page"))
  const search = searchParams.get("q") ?? ""
  const filterValue = searchParams.get(filterParam)
  const filter = filterValues.find((value) => value === filterValue)

  // Cambia parámetros sin perder los demás. Al buscar o filtrar se vuelve a la página 1,
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
    filter,
    // Cambiar de página crea una entrada en el historial: «atrás» vuelve a la anterior.
    setPage: (nextPage: number, options?: { replace?: boolean }) =>
      update({ page: String(nextPage) }, { resetPage: false, ...options }),
    // replace: escribir no llena el historial con una entrada por tecla.
    setSearch: (nextSearch: string) =>
      update(
        { q: nextSearch.trim() ? nextSearch : undefined },
        { resetPage: true, replace: true }
      ),
    // Sin valor («Todos») quita el filtro de la URL.
    setFilter: (nextFilter?: Filter) =>
      update({ [filterParam]: nextFilter }, { resetPage: true }),
    // Dirección (?...) de una página concreta, para los enlaces de la paginación.
    hrefForPage: (targetPage: number) => {
      const next = new URLSearchParams(searchParams)
      next.set("page", String(targetPage))
      return `?${next.toString()}`
    },
  }
}
