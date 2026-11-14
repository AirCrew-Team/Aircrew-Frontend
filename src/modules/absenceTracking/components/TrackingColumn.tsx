import { useId, useLayoutEffect, useRef, useState } from "react"

import { ChevronDownIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import AbsenceTrackingCard from "@/modules/absenceTracking/components/AbsenceTrackingCard"
import type { TrackedAbsence } from "@/modules/absenceTracking/types/absenceTracking.types"

interface TrackingColumnProps {
  title: string
  // Color del punto decorativo junto al título.
  dotClassName: string
  absences: TrackedAbsence[]
}

// Tarjetas visibles al cargar y cuántas añade cada «Ver más».
const INITIAL = 5
const STEP = 10
// Relleno vertical de la zona con scroll (p-1 arriba y abajo).
const SCROLL_PADDING = 8

// Una columna del tablero: título con el total de tarjetas y sus ausencias, en el orden
// recibido, de 5 en 5 al principio y por tandas de 10 con «Ver más», en una zona con
// scroll propio para que una columna larga no empuje a las demás fuera de la pantalla.
const TrackingColumn = ({
  title,
  dotClassName,
  absences,
}: TrackingColumnProps) => {
  const titleId = useId()
  const [limit, setLimit] = useState(INITIAL)
  const shown = absences.slice(0, limit)
  const hidden = absences.length - shown.length
  const nextBatch = Math.min(STEP, hidden)
  const areaRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  // Solo cambia si cambian las 2 primeras tarjetas (o si deja de haber más de 2).
  const firstTwo =
    shown.length > 2
      ? shown
          .slice(0, 2)
          .map(({ id }) => id)
          .join()
      : ""

  // El scroll muestra exactamente 2 tarjetas completas: se mide hasta el final de la 2.ª y
  // se vuelve a medir si cambian de alto (historial abierto, ancho de pantalla). Sin
  // medidas (jsdom), quedan los max-h de las clases.
  useLayoutEffect(() => {
    const area = areaRef.current
    const list = listRef.current
    const [first, second] = Array.from(list?.children ?? [])
    if (!area || !list || !first || !second || !firstTwo) {
      if (area) area.style.maxHeight = ""
      return
    }
    const measure = () => {
      const height =
        second.getBoundingClientRect().bottom - list.getBoundingClientRect().top
      area.style.maxHeight =
        height > 0 ? `${Math.ceil(height) + SCROLL_PADDING}px` : ""
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(first)
    observer.observe(second)
    return () => observer.disconnect()
  }, [firstTwo])

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 rounded-xl bg-brand-neutral p-3"
    >
      {/* Nombre accesible «{título} ({n})»: los paréntesis solo para el lector. */}
      <h2
        id={titleId}
        className={cn(
          typography.headlineSm,
          "flex items-center gap-2 px-1 text-brand-primary"
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-2.5 shrink-0 rounded-full", dotClassName)}
        />
        {title}{" "}
        <span
          className={cn(
            typography.labelSm,
            "ml-auto shrink-0 rounded-sm bg-brand-border-strong px-2 py-0.5 text-brand-primary tabular-nums"
          )}
        >
          <span className="sr-only">(</span>
          {absences.length}
          <span className="sr-only">)</span>
        </span>
      </h2>

      {absences.length === 0 ? (
        <p
          className={cn(
            typography.bodyMd,
            "rounded-xl bg-card p-4 text-muted-foreground"
          )}
        >
          Sin ausencias en este estado.
        </p>
      ) : (
        // El alto de 2 tarjetas lo pone el efecto; las clases max-h son el respaldo sin
        // medidas. p-1/-m-1: sitio para el anillo de foco, que el overflow recortaría.
        <div
          ref={areaRef}
          className="-m-1 flex max-h-[70svh] flex-col gap-3 overflow-y-auto p-1 lg:max-h-[max(24rem,calc(100svh-10rem))]"
        >
          {/* role="list": Safari deja de exponer como lista un <ul> con list-style: none. */}
          <ul ref={listRef} role="list" className="flex flex-col gap-3">
            {shown.map((absence) => (
              <li key={absence.id}>
                <AbsenceTrackingCard absence={absence} />
              </li>
            ))}
          </ul>

          {/* Al final del scroll: las tarjetas nuevas aparecen donde está el usuario. Siempre
              el mismo botón (cambia su texto), así el foco no se pierde al pulsarlo. */}
          {absences.length > INITIAL ? (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={
                  hidden > 0
                    ? `Ver ${nextBatch} más de ${title}`
                    : `Mostrar menos de ${title}`
                }
                onClick={() =>
                  setLimit(hidden > 0 ? shown.length + nextBatch : INITIAL)
                }
                className={cn(
                  typography.labelLg,
                  "inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-brand-secondary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-neutral focus-visible:outline-hidden active:text-brand-secondary-hover lg:min-h-9"
                )}
              >
                {hidden > 0 ? `Ver ${nextBatch} más` : "Mostrar menos"}
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                    hidden === 0 && "rotate-180"
                  )}
                />
              </button>
              <p className={cn(typography.bodySm, "text-muted-foreground")}>
                Mostrando {shown.length} de {absences.length}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

export default TrackingColumn
