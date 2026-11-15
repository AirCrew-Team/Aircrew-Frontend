// Estilos compartidos por las secciones del formulario de perfil del operador.

// Los de campos, etiquetas y errores son los del panel de contraseña (shared/password).
export {
  controlClass,
  errorClass,
  fieldLabelClass,
} from "@/modules/shared/password/components/formStyles"

// Tarjeta de cada sección numerada.
export const sectionClass =
  "flex flex-col gap-4 rounded-xl bg-card p-5 shadow-sm"

// Interruptor (casilla con role="switch"): pista con borde de 4:1 sobre blanco y el
// círculo que se mueve al activarse; mismo diseño que las notificaciones del tripulante.
export const switchTrackClass =
  "relative h-6 w-11 rounded-full border border-muted-foreground/70 bg-brand-border-strong transition-colors peer-checked:border-brand-secondary peer-checked:bg-brand-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-tertiary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-focus-visible:outline-hidden after:absolute after:top-0.5 after:left-0.5 after:size-4.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none forced-colors:after:border forced-colors:peer-checked:after:border-9"
