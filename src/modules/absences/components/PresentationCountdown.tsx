import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { ClockIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { affectedFlightQuery } from "@/modules/absences/data/affectedFlight.query"

const MINUTE = 60_000

const pad = (value: number) => String(value).padStart(2, "0")

// Minutos enteros hasta la presentación (hacia abajo); vencida, 0.
const minutesUntil = (presentationAt: string, now: number) =>
  Math.max(0, Math.floor((Date.parse(presentationAt) - now) / MINUTE))

// «04h : 18m».
const formatRemaining = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}h : ${pad(minutes % 60)}m`

// «4 horas y 18 minutos», para el lector de pantalla.
const speakRemaining = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} ${hours === 1 ? "hora" : "horas"} y ${rest} ${rest === 1 ? "minuto" : "minutos"}`
}

// Caja «Tiempo a presentación». Guarda su propio reloj para que el tic de cada segundo
// solo la renderice a ella. Sin aria-live: no debe anunciarse cada minuto.
// Carga y error del vuelo se muestran en F1: aquí no aparece hasta tener datos.
const PresentationCountdown = () => {
  const [now, setNow] = useState(() => Date.now())
  const { data: flight } = useQuery(affectedFlightQuery)

  useEffect(() => {
    // Cada segundo, como UtcClock: el minuto cambia a tiempo aunque se abra a mitad de minuto.
    const intervalId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  if (!flight) return null

  const remaining = minutesUntil(flight.presentationAt, now)

  return (
    <div className="flex w-fit shrink-0 items-center gap-2 rounded-xl bg-brand-neutral px-4 py-2">
      <ClockIcon
        aria-hidden="true"
        className="size-5 shrink-0 text-brand-secondary"
      />
      <div className="flex flex-col">
        <span
          className={cn(typography.labelSm, "text-muted-foreground uppercase")}
        >
          Tiempo a presentación
        </span>
        <span
          className={cn(
            typography.headlineSm,
            "font-bold text-brand-primary tabular-nums"
          )}
        >
          {/* Lo visual va oculto al lector, que oye las horas y minutos en palabras. */}
          <span aria-hidden="true">{formatRemaining(remaining)}</span>
          <span className="sr-only">{speakRemaining(remaining)}</span>
        </span>
      </div>
    </div>
  )
}

export default PresentationCountdown
