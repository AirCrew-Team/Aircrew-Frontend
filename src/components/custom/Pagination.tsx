import { Link } from "react-router"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Elemento de la paginación: un número o un «…», y en qué pantallas se ve.
// En celular (por debajo de sm) solo se ven la primera, la actual y la última, para que
// todo quepa en una línea; desde sm se ven también las vecinas de la actual.
type PageItem =
  | { kind: "page"; page: number; mobile: boolean }
  | { kind: "gap"; key: string; mobile: boolean; desktop: boolean }

// Números de escritorio: la primera, la última y las vecinas de la actual.
// Página 1 de 37 → 1 2 3 … 37. Página 10 de 37 → 1 … 9 10 11 … 37.
const desktopPages = (page: number, totalPages: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  // Cerca de los extremos se muestran tres números seguidos, como en la referencia.
  if (page <= 3) [2, 3].forEach((value) => pages.add(value))
  if (page >= totalPages - 2) {
    ;[totalPages - 1, totalPages - 2].forEach((value) => pages.add(value))
  }
  return [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b)
}

// Une las dos vistas en una sola lista (los enlaces no se repiten): cada número dice si
// se ve en celular, y cada «…» dice en qué vista aparece. Página 10 de 37:
// escritorio 1 … 9 10 11 … 37 · celular 1 … 10 … 37.
const pageItems = (page: number, totalPages: number): PageItem[] => {
  const isMobile = (value: number) =>
    value === 1 || value === totalPages || value === page
  const items: PageItem[] = []
  let previous: number | null = null
  let previousMobile: number | null = null

  for (const value of desktopPages(page, totalPages)) {
    const mobile = isMobile(value)
    const desktopGap = previous !== null && value - previous > 1
    const mobileGap =
      mobile && previousMobile !== null && value - previousMobile > 1
    if (desktopGap || mobileGap) {
      items.push({
        kind: "gap",
        key: `gap-${value}`,
        desktop: desktopGap,
        mobile: mobileGap,
      })
    }
    items.push({ kind: "page", page: value, mobile })
    previous = value
    if (mobile) previousMobile = value
  }
  return items
}

const itemClass = cn(
  typography.labelMd,
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-hidden max-sm:px-2 lg:min-h-8 lg:min-w-8"
)

interface PaginationProps {
  // Nombre de la paginación para el lector de pantalla, ej. "Paginación de certificaciones".
  label: string
  page: number
  totalPages: number
  // Dirección (?page=N, conservando búsqueda y filtro) de cada página.
  hrefForPage: (page: number) => string
}

// Paginación genérica de listas: la puede usar cualquier pantalla. Solo cambia ?page=
// en la URL; la lista lee ese valor y lo pone en su consulta, que es lo que se enviará
// al backend. Siempre en una línea: en celular, «Anterior» y «Siguiente» se ven como
// flechas y se ocultan las vecinas de la página actual.
const Pagination = ({
  label,
  page,
  totalPages,
  hrefForPage,
}: PaginationProps) => {
  // Anterior y Siguiente: enlaces mientras haya página a la que ir; si no, texto
  // deshabilitado. En celular se ve la flecha; el nombre completo queda para el lector.
  const edgeLink = (
    label: string,
    arrow: string,
    target: number,
    enabled: boolean
  ) => {
    const content = (
      <>
        <span className="max-sm:sr-only">{label}</span>
        <span aria-hidden="true" className="text-base sm:hidden">
          {arrow}
        </span>
      </>
    )
    return enabled ? (
      <Link
        to={hrefForPage(target)}
        className={cn(
          itemClass,
          "bg-card text-brand-primary hover:bg-brand-border"
        )}
      >
        {content}
      </Link>
    ) : (
      <span
        aria-disabled="true"
        className={cn(itemClass, "bg-card/60 text-muted-foreground/70")}
      >
        {content}
      </span>
    )
  }

  return (
    <nav aria-label={label} className="max-sm:self-center">
      <ul className="flex flex-nowrap items-center gap-1.5">
        <li>{edgeLink("Anterior", "‹", page - 1, page > 1)}</li>
        {pageItems(page, totalPages).map((item) =>
          item.kind === "gap" ? (
            <li
              key={item.key}
              aria-hidden="true"
              className={cn(
                typography.labelMd,
                "px-1 text-muted-foreground",
                !item.mobile && "max-sm:hidden",
                !item.desktop && "sm:hidden"
              )}
            >
              …
            </li>
          ) : (
            <li
              key={item.page}
              className={item.mobile ? undefined : "max-sm:hidden"}
            >
              {/* aria-current: el lector anuncia cuál es la página actual. */}
              <Link
                to={hrefForPage(item.page)}
                aria-label={`Página ${item.page}`}
                aria-current={item.page === page ? "page" : undefined}
                className={cn(
                  itemClass,
                  "tabular-nums",
                  item.page === page
                    ? "bg-brand-primary text-white"
                    : "bg-card text-brand-primary hover:bg-brand-border"
                )}
              >
                {item.page}
              </Link>
            </li>
          )
        )}
        <li>{edgeLink("Siguiente", "›", page + 1, page < totalPages)}</li>
      </ul>
    </nav>
  )
}

export default Pagination
