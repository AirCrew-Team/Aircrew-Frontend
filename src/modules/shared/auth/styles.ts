/** Clases compartidas por los campos del formulario de acceso. */
// Contenedor de cada campo del login; resalta el borde al enfocar el input
export const loginFieldClass =
  "flex h-[72px] items-center gap-[19px] rounded-[17px] border-[1.5px] border-[#d8e2ee] bg-white/35 px-5 text-[#244b6a] transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[#4aa5d4] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgb(74_165_212_/_12%)] max-[700px]:h-16"

// Input del login: sin borde ni fondo, el estilo lo da el contenedor
export const loginInputClass =
  "w-full min-w-0 border-0 bg-transparent font-[inherit] text-[17px] text-[#173e5e] outline-none placeholder:text-[#8292a8]"

// Botón principal del login: degradado, sombra y leve elevación al pasar el cursor
export const loginPrimaryButtonClass =
  "h-[70px] w-full gap-5 rounded-full bg-[linear-gradient(100deg,#07436a,#0c527a)] text-lg font-semibold text-white shadow-[0_12px_24px_rgb(8_61_96_/_12%)] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-[#083d61] hover:shadow-[0_15px_28px_rgb(8_61_96_/_18%)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#57b4e3] motion-reduce:transition-none max-[700px]:h-16"

// Input de los diálogos, con anillo azul al enfocar
export const dialogInputClass =
  "h-12 w-full rounded-lg border border-[#d8e2ee] bg-white px-3 text-base font-normal outline-none focus:border-[#4aa5d4] focus:ring-4 focus:ring-[#4aa5d4]/15"

// Botón principal de los diálogos, más compacto que el del login
export const dialogPrimaryButtonClass =
  "h-10 rounded-full bg-[#07436a] px-5 text-white hover:bg-[#083d61]"