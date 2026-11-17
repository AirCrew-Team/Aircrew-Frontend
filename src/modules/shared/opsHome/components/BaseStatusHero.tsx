import { useId } from "react"

import airportPhoto from "@/App/utils/images/SuperA.jpg"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Clases de los recuadros de datos: fondo translúcido sobre la foto.
const statClass =
  "flex flex-col gap-0.5 rounded-md border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm"
const statLabelClass = cn(typography.labelSm, "text-white/70 uppercase")
const statValueClass = cn(typography.headlineSm, "font-bold text-white")

interface BaseStatusHeroProps {
  // Nombre de la sección (aria-label) mientras no hay datos.
  fallbackLabel: string
  loadingText: string
  errorText: string
  // Contenido del banner: solo con datos.
  status?: {
    tag: string
    location: string
    headline: string
    summary: string
    stats: { label: string; value: string }[]
  }
  // Estado de la consulta que hace la página.
  isPending: boolean
  isError: boolean
}

// Bloque 2 del Inicio (admin y supervisor): estado de la base sobre la foto de un avión
// en pista. Solo presenta: la consulta la hace cada página.
const BaseStatusHero = ({
  fallbackLabel,
  loadingText,
  errorText,
  status,
  isPending,
  isError,
}: BaseStatusHeroProps) => {
  const titleId = useId()

  return (
    // Con datos, la sección se nombra con su h2; mientras carga o si falla, con aria-label.
    // isolate + -z-10: la foto y el degradado quedan detrás del texto sin salirse de la tarjeta.
    <section
      aria-labelledby={status ? titleId : undefined}
      aria-label={status ? undefined : fallbackLabel}
      className="relative isolate flex min-h-56 flex-col justify-end overflow-hidden rounded-xl bg-brand-primary shadow-sm sm:min-h-64"
    >
      {/* Foto decorativa (alt vacío): cubre toda la tarjeta en cualquier ancho. */}
      <img
        src={airportPhoto}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover object-[center_60%]"
      />
      {/* Degradado oscuro abajo para que el texto blanco tenga contraste sobre la foto. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-brand-primary-dark/95 via-brand-primary/60 to-brand-primary/10"
      />

      {/* Móvil: texto arriba y datos abajo. Desde md: texto a la izquierda y datos a la derecha. */}
      <div className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-end md:justify-between">
        {isPending ? (
          <p role="status" className={cn(typography.bodySm, "text-white/80")}>
            {loadingText}
          </p>
        ) : isError ? (
          // El error va sobre un fondo claro para que se lea encima de la foto.
          <p
            role="alert"
            className={cn(
              typography.bodySm,
              "w-fit rounded-md bg-error-container px-3 py-2 text-on-error-container"
            )}
          >
            {errorText}
          </p>
        ) : status ? (
          <>
            <div className="flex max-w-2xl min-w-0 flex-col gap-1.5">
              <p
                className={cn(
                  typography.labelSm,
                  "flex flex-wrap items-center gap-2 text-white/80"
                )}
              >
                <span className="rounded-sm bg-brand-primary/80 px-2 py-0.5 text-white uppercase">
                  {status.tag}
                </span>
                {status.location}
              </p>
              <h2
                id={titleId}
                className={cn(typography.headlineSm, "font-bold text-white")}
              >
                {status.headline}
              </h2>
              <p className={cn(typography.bodySm, "text-white/75")}>
                {status.summary}
              </p>
            </div>
            {/* Lista de pares etiqueta/valor (dl). Móvil: dos columnas de igual ancho
                que llenan la fila. Desde md: recuadros del tamaño de su contenido. */}
            <dl className="grid shrink-0 grid-cols-2 gap-3 md:flex">
              {status.stats.map((stat) => (
                <div key={stat.label} className={statClass}>
                  <dt className={statLabelClass}>{stat.label}</dt>
                  <dd className={statValueClass}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </div>
    </section>
  )
}

export default BaseStatusHero
