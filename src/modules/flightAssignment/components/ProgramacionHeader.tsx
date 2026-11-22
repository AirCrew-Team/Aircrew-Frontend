import { useQuery } from "@tanstack/react-query"

import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { myBaseQuery } from "@/modules/shared/base/myBase"
import { isDemoUser, useAuthStore } from "@/stores/auth.store"

// Base de los datos de ejemplo (cuenta demo).
const DEMO_BASE = "Base Eldorado · BOG"

// Antetítulo, h1 y descripción de la pantalla. Con la sesión real, la base sale de
// GET /bases/me (misma clave que el Inicio); mientras llega, o si no hay base, el
// antetítulo va sin ese tramo.
const ProgramacionHeader = () => {
  const isDemo = useAuthStore((state) => isDemoUser(state.user))
  const { data: myBase } = useQuery({ ...myBaseQuery, enabled: !isDemo })
  const base = isDemo
    ? DEMO_BASE
    : myBase
      ? `${myBase.base_name} · ${myBase.iata}`
      : null

  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          typography.labelSm,
          "flex items-start gap-1.5 tracking-wider text-brand-secondary uppercase before:mt-0.75 before:size-2 before:shrink-0 before:rounded-full before:bg-brand-secondary"
        )}
      >
        {base
          ? `Programación de tripulaciones · ${base} · Horas en UTC`
          : "Programación de tripulaciones · Horas en UTC"}
      </p>
      <h1 className={cn(typography.headlineLg, "text-brand-primary")}>
        Programación
      </h1>
      <p className={cn(typography.bodyMd, "text-muted-foreground")}>
        Asigna la tripulación de los vuelos que salen de tu base.
      </p>
    </div>
  )
}

export default ProgramacionHeader
