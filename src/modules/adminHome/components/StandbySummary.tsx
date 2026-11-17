import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { ConfirmedIcon, SyncIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { Button } from "@/components/custom/Button"
import { cn } from "@/lib/utils"
import { getStandbySummary } from "@/modules/adminHome/data/adminHome.data"

// Bloque 4: guardia del turno y confirmación de la dotación (simulada hasta conectar la API).
const StandbySummary = () => {
  const titleId = useId()
  // Estado local: la confirmación todavía no se envía al backend.
  const [confirmed, setConfirmed] = useState(false)
  // Clave en el dominio "crew": las guardias vendrán del servicio de tripulación.
  const { data, isPending, isError } = useQuery({
    queryKey: ["crew", "standby"],
    queryFn: getStandbySummary,
  })

  // Confirma la dotación: bloquea el botón y avisa con un toast de sonner.
  // Con la API real, aquí irá la mutación (con su Idempotency-Key, ADR 003).
  const handleConfirm = () => {
    if (!data) return
    setConfirmed(true)
    toast.success("Dotación confirmada", {
      description: `${data.shift}: ${data.standbyCrew} tripulantes en Standby.`,
    })
  }

  return (
    // Móvil: contenido arriba y botón abajo a todo el ancho. Desde sm: en una fila.
    <section
      aria-labelledby={data ? titleId : undefined}
      aria-label={data ? undefined : "Resumen de guardias"}
      className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      {/* Estados de la consulta: cargando (status), error (alert) o el contenido. */}
      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando resumen de guardias…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudo cargar el resumen de guardias.
        </p>
      ) : (
        <>
          {/* Ícono y textos. items-start en móvil para que el ícono quede arriba
              si el texto ocupa varias líneas. */}
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-neutral text-brand-secondary"
            >
              <SyncIcon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p
                className={cn(
                  typography.labelSm,
                  "flex flex-wrap items-center gap-1.5 text-brand-secondary uppercase"
                )}
              >
                Resumen de guardias
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-brand-secondary"
                />
                <span className="text-muted-foreground normal-case">
                  {data.shift}
                </span>
              </p>
              <h2
                id={titleId}
                className={cn(
                  typography.headlineSm,
                  "font-bold text-brand-primary"
                )}
              >
                Sistema de suplencias en guardia listo
              </h2>
              <p className={cn(typography.bodySm, "text-brand-secondary")}>
                {data.standbyCrew} tripulantes en Standby para el bloque{" "}
                {data.block} • {data.staffingDelays} demoras operativas
                atribuibles a dotación técnica.
              </p>
            </div>
          </div>

          {/* Botón propio (components/custom/Button). Tras confirmar queda deshabilitado;
              focusableWhenDisabled evita que el foco del teclado se pierda. */}
          <Button
            variant="outline"
            disabled={confirmed}
            focusableWhenDisabled
            onClick={handleConfirm}
            className={cn(
              typography.labelMd,
              "min-h-11 w-full shrink-0 gap-2 border-brand-border bg-brand-neutral px-4 font-semibold text-brand-primary hover:bg-brand-border sm:w-auto"
            )}
          >
            <ConfirmedIcon aria-hidden="true" />
            {confirmed ? "Dotación Confirmada" : "Confirmar Dotación"}
          </Button>
        </>
      )}
    </section>
  )
}

export default StandbySummary
