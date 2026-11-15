import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Estilos compartidos por las secciones del formulario de perfil del operador.

// Campos de texto y listas con el mismo borde, foco y error que los formularios del
// proyecto. text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
export const controlClass = cn(
  typography.bodySm,
  "min-h-11 w-full min-w-0 rounded-sm border border-muted-foreground/70 bg-card px-3 py-2 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
)

// Tarjeta de cada sección numerada.
export const sectionClass =
  "flex flex-col gap-4 rounded-xl bg-card p-5 shadow-sm"

export const fieldLabelClass = cn(
  typography.labelMd,
  "font-semibold text-brand-primary"
)

export const errorClass = cn(typography.bodySm, "text-destructive")

// Interruptor (casilla con role="switch"): pista con borde de 4:1 sobre blanco y el
// círculo que se mueve al activarse; mismo diseño que las notificaciones del tripulante.
export const switchTrackClass =
  "relative h-6 w-11 rounded-full border border-muted-foreground/70 bg-brand-border-strong transition-colors peer-checked:border-brand-secondary peer-checked:bg-brand-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-tertiary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-focus-visible:outline-hidden after:absolute after:top-0.5 after:left-0.5 after:size-4.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none forced-colors:after:border forced-colors:peer-checked:after:border-9"
