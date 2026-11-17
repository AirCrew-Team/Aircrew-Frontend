import { useEffect, useState } from "react"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Completa con cero a la izquierda: 7 → «07».
const pad = (value: number) => String(value).padStart(2, "0")

// «21:12 UTC». Usa las funciones getUTC*: la hora es la misma en cualquier zona
// horaria, como corresponde al reloj de referencia en aviación.
const formatUtc = (date: Date) =>
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`

// «16:12 Local». Usa getHours/getMinutes: la zona horaria del equipo del usuario
// (en Colombia, UTC−5). Sirve de apoyo para no confundir la hora UTC con un error.
const formatLocal = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())} Local`

// Reloj en vivo: UTC en grande (referencia) y la hora local debajo, en pequeño.
// Genérico: lo usa el Inicio del admin y se puede reutilizar en otros roles (ej. supervisor).
const MasterClock = () => {
  // Guarda su propio estado para que el tic solo vuelva a renderizar el reloj,
  // no la sección que lo contiene.
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Revisa cada segundo aunque no muestre segundos: así el minuto cambia a tiempo
    // aunque la pantalla se abra a mitad de un minuto.
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    // Al desmontar se detiene el intervalo.
    return () => clearInterval(intervalId)
  }, [])

  return (
    // Las dos horas apiladas y alineadas a la derecha.
    <span className="flex flex-col items-end">
      {/* <time> con la fecha completa en dateTime para lectores de pantalla.
          Sin aria-live: el lector de pantalla no debe anunciarlo en cada cambio. */}
      <time
        dateTime={now.toISOString()}
        className={cn(
          typography.headlineSm,
          // tabular-nums: todos los dígitos con el mismo ancho, el texto no "salta".
          "font-mono font-bold tracking-tight whitespace-nowrap text-brand-primary tabular-nums"
        )}
      >
        {formatUtc(now)}
      </time>
      <time
        dateTime={now.toISOString()}
        className={cn(
          typography.labelSm,
          "font-mono whitespace-nowrap text-muted-foreground tabular-nums"
        )}
      >
        {formatLocal(now)}
      </time>
    </span>
  )
}

export default MasterClock
