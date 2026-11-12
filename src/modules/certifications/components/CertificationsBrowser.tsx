import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { SearchIcon } from "@/App/utils/icons"
import { normalizeForSearch } from "@/App/utils/text"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import CertificationItem from "@/modules/certifications/components/CertificationItem"
import { LICENSE_COLUMNS_CLASS } from "@/modules/certifications/components/columns"
import { getCertifications } from "@/modules/certifications/data/certifications.data"
import type { Certification } from "@/modules/certifications/types/certifications.types"

const COLUMN_HEADERS = [
  "Certificación / Licencia",
  "Organismo / Alcance",
  "Fecha de vencimiento",
  "Estado RAC",
  "Observación operacional",
  "Acción",
]

const matchesSearch = (certification: Certification, search: string) =>
  [
    certification.name,
    certification.code,
    certification.issuer,
    certification.scope,
  ].some((value) => normalizeForSearch(value).includes(search))

// Cargando, error y sin resultados: en una tarjeta, en el sitio de la tabla.
const messageClass =
  "rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm lg:px-6"

const licenses = (count: number) =>
  `${count} ${count === 1 ? "licencia" : "licencias"}`

// L: barra con el total y el buscador, estado de resultados para el lector y la lista.
const CertificationsBrowser = () => {
  const id = useId()
  const [search, setSearch] = useState("")
  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "list"],
    queryFn: getCertifications,
  })

  const query = search.trim()
  const normalizedQuery = normalizeForSearch(query)
  const visible = data?.filter((certification) =>
    matchesSearch(certification, normalizedQuery)
  )

  // Como en la referencia, la barra gris y la tabla son dos piezas: la sección no es tarjeta.
  // Desde lg, encabezados y lista forman la tarjeta de la tabla; por debajo, cada licencia es su tarjeta.
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col">
      <h2 id={`${id}-title`} className="sr-only">
        Licencias del expediente
      </h2>

      <div className="mb-4 flex flex-col gap-3 rounded-md bg-brand-neutral px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-2">
        {data ? (
          <p
            className={cn(
              typography.labelMd,
              "min-w-0 text-muted-foreground tabular-nums"
            )}
          >
            {data.length === 1
              ? "1 licencia cargada en expediente digital (SKBO Base)"
              : `${data.length} licencias cargadas en expediente digital (SKBO Base)`}
          </p>
        ) : null}
        <div className="flex w-full items-center gap-2 lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
            <label htmlFor={`${id}-search`} className="sr-only">
              Filtrar por certificación
            </label>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar por certificación…"
              className={cn(
                typography.bodySm,
                // text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
                // Borde muted-foreground/70 sobre la barra brand-neutral: 3.78:1.
                "min-h-11 w-full rounded-sm border border-muted-foreground/70 bg-card py-1.5 pr-3 pl-9 text-foreground shadow-xs transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-9"
              )}
            />
          </div>
          <span
            className={cn(
              typography.labelSm,
              "shrink-0 rounded-sm border border-transparent bg-brand-border px-2 py-1 tracking-wider text-brand-primary uppercase"
            )}
          >
            RAC 121
          </span>
        </div>
      </div>

      <p role="status" className="sr-only">
        {visible ? licenses(visible.length) : ""}
      </p>

      {isPending ? (
        <p
          role="status"
          className={cn(
            typography.bodySm,
            messageClass,
            "text-muted-foreground"
          )}
        >
          Cargando licencias…
        </p>
      ) : isError ? (
        <p
          role="alert"
          className={cn(typography.bodySm, messageClass, "text-destructive")}
        >
          No se pudieron cargar las licencias.
        </p>
      ) : data.length === 0 ? (
        <p
          className={cn(
            typography.bodyMd,
            messageClass,
            "text-muted-foreground"
          )}
        >
          No hay licencias cargadas en el expediente.
        </p>
      ) : visible?.length === 0 && query ? (
        <p
          className={cn(
            typography.bodyMd,
            messageClass,
            "break-words text-muted-foreground"
          )}
        >
          Ninguna licencia coincide con «{query}».
        </p>
      ) : (
        <>
          {/* Mismo gap y px que la fila de CertificationItem; columnas compartidas en columns.ts. */}
          <div
            aria-hidden="true"
            className={cn(
              typography.labelSm,
              "hidden rounded-t-xl border border-b-0 border-brand-border/70 bg-muted px-6 py-3 tracking-wider text-muted-foreground uppercase lg:grid lg:items-center lg:gap-4",
              LICENSE_COLUMNS_CLASS
            )}
          >
            {COLUMN_HEADERS.map((header) => (
              <span key={header} className="last:text-right">
                {header}
              </span>
            ))}
          </div>
          <ul
            // role="list": Safari deja de exponer como lista un <ul> con list-style: none.
            role="list"
            aria-label="Licencias"
            className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-brand-border/70 lg:overflow-hidden lg:rounded-b-xl lg:border lg:border-brand-border/70 lg:bg-card lg:shadow-sm"
          >
            {visible?.map((certification) => (
              <li key={certification.id}>
                <CertificationItem certification={certification} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default CertificationsBrowser
