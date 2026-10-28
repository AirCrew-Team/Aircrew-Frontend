import { useEffect, useState } from "react"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

const pad = (value: number) => String(value).padStart(2, "0")

const formatUtc = (date: Date) =>
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}Z`

// Hora UTC en vivo. Guarda su propio estado para que el tic de cada segundo solo lo renderice a él.
// Sin aria-live: el lector de pantalla no debe anunciarlo cada segundo.
const UtcClock = () => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <time
      dateTime={now.toISOString()}
      className={cn(
        typography.headlineLg,
        "pt-1 font-mono font-bold tracking-tight text-brand-primary tabular-nums"
      )}
    >
      {formatUtc(now)}
    </time>
  )
}

export default UtcClock
