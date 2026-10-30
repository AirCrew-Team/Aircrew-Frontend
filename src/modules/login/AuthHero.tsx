// Logo de AirCrew y foto del ala del avión (imagen de fondo)
import aircrewLogo from "@/App/utils/images/LogoAC.png"
import airplaneWing from "@/App/utils/images/Airplane.png"

// Por debajo de 700 px el panel está oculto (max-[700px]:hidden). Un <img> oculto se
// descarga igual, así que en ese ancho <picture> sirve un GIF vacío de 1 px.
const MOBILE_MEDIA = "(width < 700px)"
const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

/** Presenta el ala y el logo de AirCrew en el lado visual del login. */
export function AuthHero() {
  return (
    // Panel con degradado azul; se oculta en móvil
    <section
      aria-label="AirCrew, juntos volamos más lejos"
      className="relative flex min-h-[720px] flex-col overflow-hidden bg-[linear-gradient(160deg,#0b4778_0%,#176ca5_48%,#9bc9e2_100%)] px-[clamp(38px,7vw,102px)] py-[clamp(42px,6vw,88px)] text-white max-[900px]:px-[34px] max-[700px]:hidden"
    >
      {/* Imagen de fondo; es la imagen LCP en escritorio, por eso va con prioridad alta */}
      <picture>
        <source media={MOBILE_MEDIA} srcSet={EMPTY_IMAGE} />
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[center_54%]"
          decoding="async"
          fetchPriority="high"
          src={airplaneWing}
        />
      </picture>
      {/* Overlay oscuro para dar contraste */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgb(3_38_70_/_44%)_0%,rgb(2_48_83_/_12%)_45%,rgb(3_34_62_/_50%)_100%),linear-gradient(90deg,rgb(8_53_91_/_28%),transparent_80%)]"
      />
      {/* Logo y eslogan */}
      <div className="relative z-10 w-full max-w-[400px] self-center text-center">
        {/* width/height reservan el hueco con la proporción real y evitan el salto del eslogan */}
        <picture>
          <source media={MOBILE_MEDIA} srcSet={EMPTY_IMAGE} />
          <img
            alt="AirCrew"
            className="mx-auto block h-auto w-full max-w-[340px]"
            height={373}
            src={aircrewLogo}
            width={669}
          />
        </picture>
        <p className="mt-5 text-xs font-medium tracking-[.48em] uppercase max-[900px]:tracking-[.3em]">
          Juntos volamos más lejos
        </p>
      </div>
    </section>
  )
}
