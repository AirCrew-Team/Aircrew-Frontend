import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import { ClockIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import MasterClock from "@/components/custom/MasterClock"
import { cn } from "@/lib/utils"
import { getOpsCenter } from "@/modules/adminHome/data/adminHome.data"
import { useAuthStore } from "@/stores/auth.store"

// Bloque 1: bienvenida (h1 con el nombre de la sesión), dependencia y sede, y el reloj maestro.
const AdminWelcomeHeader = () => {
  // Nombre corto del usuario con sesión (en el store, no en la consulta: es estado del cliente).
  const displayName = useAuthStore((state) => state.user?.displayName)
  // Id único para enlazar la sección con su h1 (aria-labelledby).
  const titleId = useId()
  // Consulta propia de la sección: su clave empieza por el dominio ("admin").
  const { data, isPending, isError } = useQuery({
    queryKey: ["admin", "opsCenter"],
    queryFn: getOpsCenter,
  })

  return (
    // Móvil y tablet: texto arriba y reloj abajo. Escritorio (lg): uno al lado del otro.
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-6 rounded-xl bg-linear-to-r from-card to-muted p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Columna de texto. min-w-0 deja que el texto se ajuste en lugar de desbordar. */}
      <div className="flex max-w-2xl min-w-0 flex-col gap-1">
        {/* Etiqueta de dependencia y sede: solo cuando llegan los datos.
            Si fallan, el error se muestra en la tarjeta del reloj. */}
        {data ? (
          <p
            className={cn(
              typography.labelSm,
              "flex flex-wrap items-center gap-x-2 gap-y-1"
            )}
          >
            <span className="flex items-center gap-1.5 rounded-sm bg-brand-border px-2.5 py-1 text-brand-primary uppercase">
              {/* Punto decorativo: aria-hidden para que el lector de pantalla lo ignore. */}
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-brand-secondary"
              />
              {data.unit}
            </span>
            <span className="font-medium text-muted-foreground">
              <span aria-hidden="true">/ </span>
              {data.hqCode}{" "}
              <span className="text-brand-secondary">{data.baseName}</span>
            </span>
          </p>
        ) : null}
        {/* Único h1 de la pantalla. break-words: un nombre largo corta línea en móvil. */}
        <h1
          id={titleId}
          className={cn(
            typography.headlineLg,
            "font-bold tracking-tight break-words text-brand-primary"
          )}
        >
          {displayName}, Bienvenido a AirCrew
        </h1>
        <p className={cn(typography.bodyLg, "text-muted-foreground")}>
          Centro de Operaciones y Despacho Aéreo • Turno Activo
        </p>
      </div>

      {/* Tarjeta del reloj: ancho completo en móvil y tablet; en escritorio, ancho mínimo fijo. */}
      <div className="flex w-full flex-col gap-2 rounded-xl border border-brand-border bg-card p-4 shadow-sm lg:w-auto lg:min-w-70 lg:shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-1.5 text-muted-foreground uppercase"
            )}
          >
            <ClockIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-secondary"
            />
            Reloj maestro
          </p>
          {/* Componente reutilizable de components/custom: hora UTC en vivo. */}
          <MasterClock />
        </div>
        {/* Barra decorativa bajo el reloj, como en la referencia. */}
        <div
          aria-hidden="true"
          className="h-1 w-full rounded-full bg-brand-secondary"
        />
        {/* Estados de la consulta: cargando (status), error (alert) o el dato. */}
        {isPending ? (
          <p
            role="status"
            className={cn(typography.labelSm, "pt-1 text-muted-foreground")}
          >
            Cargando condición operacional…
          </p>
        ) : isError ? (
          <p
            role="alert"
            className={cn(typography.labelSm, "pt-1 text-destructive")}
          >
            No se pudo cargar la condición operacional.
          </p>
        ) : (
          <p
            className={cn(
              typography.labelSm,
              "flex items-center justify-between gap-2 pt-1 text-brand-secondary"
            )}
          >
            Condición Operacional
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-brand-secondary"
              />
              {data.operationalCondition}
            </span>
          </p>
        )}
      </div>
    </section>
  )
}

export default AdminWelcomeHeader
