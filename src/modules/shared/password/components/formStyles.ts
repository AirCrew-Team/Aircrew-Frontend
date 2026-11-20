import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Estilos del panel de contraseña.

// Campos de texto y listas con el mismo borde, foco y error que los formularios del
// proyecto. text-base por debajo de lg: con menos de 16 px iOS hace zoom al enfocar.
export const controlClass = cn(
  typography.bodySm,
  "min-h-11 w-full min-w-0 rounded-sm border border-muted-foreground/70 bg-card px-3 py-2 text-brand-primary shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand-tertiary focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:outline-hidden aria-invalid:border-2 aria-invalid:border-destructive motion-reduce:transition-none max-lg:text-base max-lg:leading-6 lg:min-h-10"
)

export const fieldLabelClass = cn(
  typography.labelMd,
  "font-semibold text-brand-primary"
)

export const errorClass = cn(typography.bodySm, "text-destructive")
