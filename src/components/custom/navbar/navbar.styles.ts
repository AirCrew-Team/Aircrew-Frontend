// Clases compartidas por las piezas del navbar.

// Anillo de foco visible sobre el fondo azul marino de la barra.
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary"

// Botones de la barra (campana, perfil, hamburguesa).
export const barButton = `flex items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white data-popup-open:bg-white/10 data-popup-open:text-white ${focusRing}`

// Superficie de los desplegables (capa 2 de DESIGN.md).
export const popoverSurface =
  "w-auto rounded-lg border border-[#c0d4ec] bg-white p-1 shadow-[0_12px_24px_-6px_rgba(15,39,68,0.12),0_4px_8px_-2px_rgba(15,39,68,0.05)] ring-0"
