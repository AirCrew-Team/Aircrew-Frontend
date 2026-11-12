import { useId, type ComponentType, type SVGProps } from "react"
import { Link } from "react-router"

import { ArrowRightIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Color del borde superior de la tarjeta.
type Accent = "secondary" | "primary" | "muted"

const ACCENT_CLASS: Record<Accent, string> = {
  secondary: "border-t-brand-secondary/50",
  primary: "border-t-brand-primary",
  muted: "border-t-brand-border-strong",
}

interface ModuleCardProps {
  // Ícono de la esquina (de App/utils/icons).
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description: string
  // Color del borde superior, como en la referencia.
  accent: Accent
  // Texto y ruta del botón de la tarjeta.
  link: { label: string; to: string }
  // Estado de la consulta de la tarjeta: el título, la descripción y el enlace se ven siempre.
  isPending: boolean
  isError: boolean
  loadingText: string
  errorText: string
  // Solo con datos: etiqueta de la esquina y dato del pie.
  badge?: string
  metric?: { label: string; value: string }
  // Etiqueta y dato en rojo (ej. certificaciones por renovar).
  alert?: boolean
}

// Tarjeta de acceso a un módulo del Inicio (admin y supervisor). Solo presenta: no pide datos.
// Cada tarjeta de la página hace su consulta y le pasa el resultado,
// así todas comparten el mismo diseño sin repetir el marcado.
const ModuleCard = ({
  icon: Icon,
  title,
  description,
  accent,
  link,
  isPending,
  isError,
  loadingText,
  errorText,
  badge,
  metric,
  alert = false,
}: ModuleCardProps) => {
  const titleId = useId()

  return (
    // article: cada tarjeta es un bloque independiente, nombrado por su h2.
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-4 rounded-xl border-t-[3px] bg-card p-5 shadow-sm sm:p-6",
        ACCENT_CLASS[accent]
      )}
    >
      {/* Encabezado: ícono a la izquierda y etiqueta a la derecha. */}
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-neutral text-brand-secondary"
        >
          <Icon className="size-5" />
        </span>
        {badge ? (
          // text-right: si la etiqueta no cabe en una línea, se ajusta pegada a la derecha.
          <p
            className={cn(
              typography.labelSm,
              "rounded-full px-2.5 py-0.5 text-right uppercase",
              alert
                ? "bg-error-container text-on-error-container"
                : "bg-brand-neutral text-brand-primary"
            )}
          >
            {badge}
          </p>
        ) : null}
      </div>

      {/* Título y descripción del módulo (fijos, no dependen de la consulta). */}
      <div className="flex flex-col gap-1">
        <h2
          id={titleId}
          className={cn(typography.headlineSm, "font-bold text-brand-primary")}
        >
          {title}
        </h2>
        <p className={cn(typography.bodySm, "text-muted-foreground")}>
          {description}
        </p>
      </div>

      {/* mt-auto: el pie y el botón quedan alineados entre tarjetas de distinto alto. */}
      <div className="mt-auto flex flex-col gap-4">
        {/* Estados de la consulta: cargando (status), error (alert) o el dato del pie. */}
        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "text-muted-foreground")}
          >
            {loadingText}
          </p>
        ) : isError ? (
          <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
            {errorText}
          </p>
        ) : metric ? (
          // flex-wrap: en tarjetas angostas el dato baja de línea en vez de apretarse.
          <p
            className={cn(
              typography.bodySm,
              "flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md bg-muted px-3 py-2.5 text-muted-foreground"
            )}
          >
            {metric.label}
            <span
              className={cn(
                "font-bold",
                alert ? "text-destructive" : "text-brand-secondary"
              )}
            >
              {metric.value}
            </span>
          </p>
        ) : null}

        {/* Enlace con aspecto de botón (navega, no ejecuta una acción). min-h-11: área
            táctil cómoda en móvil. El anillo de foco se ve al navegar con teclado. */}
        <Link
          to={link.to}
          className={cn(
            typography.labelLg,
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-secondary px-4 py-2.5 text-white transition-colors hover:bg-brand-secondary-hover focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden"
          )}
        >
          {link.label}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  )
}

export default ModuleCard
