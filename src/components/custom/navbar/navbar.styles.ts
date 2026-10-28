// Clases compartidas por las piezas del navbar.

// Anillo de foco visible sobre el fondo azul marino de la barra.
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary"

// Botones de la barra (campana, perfil, hamburguesa).
export const barButton = `flex items-center rounded-md text-white/80 transition-colors hover:bg-brand-secondary/25 hover:text-white data-popup-open:bg-brand-secondary/25 data-popup-open:text-white ${focusRing}`

// Superficie de los desplegables (capa 2 de DESIGN.md): solo lo que cambia respecto a DropdownMenuContent.
// w-auto: ancho según el contenido en vez del ancho del disparador.
// Ojo: cn no reconoce shadow-popover como sombra y conserva el shadow-md por defecto; gana
// shadow-popover solo porque Tailwind la emite después (orden alfabético). Revisar si se renombra.
export const popoverSurface = "w-auto ring-brand-border-strong shadow-popover"
