// Escala tipográfica del sistema de diseño (referencias/Inicio - Tripulante/DESIGN.md).
// Encabezados en Space Grotesk (font-heading) y cuerpo/etiquetas en Inter (font-sans).
export const typography = {
  displayLg:
    "font-heading text-[32px] leading-[38px] font-bold tracking-[-0.01em] md:text-[40px] md:leading-12 md:tracking-[-0.02em]",
  headlineLg:
    "font-heading text-[28px] leading-9 font-semibold tracking-[-0.01em]",
  headlineMd: "font-heading text-[22px] leading-7 font-semibold",
  headlineSm: "font-heading text-lg leading-6 font-semibold",
  bodyLg: "font-sans text-base leading-6 font-normal",
  bodyMd: "font-sans text-sm leading-5 font-normal",
  bodySm: "font-sans text-xs leading-4 font-normal",
  labelLg: "font-sans text-sm leading-5 font-semibold tracking-[0.01em]",
  labelMd: "font-sans text-xs leading-4 font-medium tracking-[0.02em]",
  labelSm:
    "font-sans text-[11px] leading-[14px] font-semibold tracking-[0.04em]",
  // Fuera de DESIGN.md: la referencia del navbar usa 13 px en los enlaces y en el nombre del perfil.
  navLabel: "font-sans text-[13px] leading-5 font-medium",
} as const
