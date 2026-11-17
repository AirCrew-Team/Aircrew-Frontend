import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { SupervisorIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getOperatorProfile } from "@/modules/operatorProfile/data/operatorProfile.data"

const pad = (value: number) => String(value).padStart(2, "0")

// Hora UTC en vivo («14:32 UTC»), con su propio estado para que el tic solo repinte esto.
const UtcNow = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])
  return (
    <time dateTime={now.toISOString()} className="tabular-nums">
      {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())} UTC
    </time>
  )
}

// Bloque 1: etiqueta, título y descripción, y la sincronización con el hub de operaciones.
// La descripción y la etiqueta de sincronización salen del perfil (misma consulta que
// el formulario, así que se pide una sola vez).
const OperatorProfileHeader = ({ userId }: { userId: string }) => {
  const { data } = useQuery({
    queryKey: ["operatorProfile", userId],
    queryFn: () => getOperatorProfile(userId),
  })

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-2xl min-w-0 flex-col gap-1">
        <p
          className={cn(
            typography.labelSm,
            "flex items-center gap-1.5 text-brand-secondary uppercase"
          )}
        >
          <SupervisorIcon aria-hidden="true" className="size-4 shrink-0" />
          Ajustes de operador • OCC Central
        </p>
        {/* Único h1 de la pantalla. */}
        <h1
          className={cn(
            typography.headlineLg,
            "font-bold tracking-tight text-brand-primary"
          )}
        >
          Mi Perfil y Configuración
        </h1>
        {data ? (
          <p className={cn(typography.bodyMd, "text-muted-foreground")}>
            {data.header.subtitle}
          </p>
        ) : null}
      </div>
      {data ? (
        <p
          className={cn(
            typography.labelSm,
            "flex w-fit items-center gap-2 rounded-lg bg-card px-4 py-2.5 shadow-sm"
          )}
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-brand-secondary"
          />
          <span className="flex flex-col">
            <span className="text-muted-foreground uppercase">
              {data.header.syncLabel}
            </span>
            <span className="font-bold text-brand-primary">
              Atlanta Ops Hub • <UtcNow />
            </span>
          </span>
        </p>
      ) : null}
    </header>
  )
}

export default OperatorProfileHeader
