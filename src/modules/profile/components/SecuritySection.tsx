import { useId } from "react"

import { KeyIcon, SecurityIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/modules/profile/types/profile.types"

interface SecuritySectionProps {
  // Número del h2 según los bloques que ve el rol.
  number: number
  security: UserProfile["security"]
}

// Estilo atenuado de NextFlightCard, con borde: van sobre la caja tintada, no sobre blanco.
const comingSoonButton = cn(
  typography.labelMd,
  "inline-flex min-h-11 cursor-not-allowed items-center justify-between gap-3 rounded-md border border-brand-border bg-muted px-4 py-2.5 text-left font-semibold text-muted-foreground/80 shadow-xs focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden lg:min-h-9"
)

// F4 (común): seguridad y credenciales. Las acciones aún no existen ("Próximamente").
const SecuritySection = ({ number, security }: SecuritySectionProps) => {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border border-brand-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="-mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-t-xl border-b border-brand-neutral bg-background px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-border text-brand-primary">
            <SecurityIcon aria-hidden="true" className="size-4.5" />
          </span>
          <h2
            id={titleId}
            className={cn(
              typography.headlineSm,
              "min-w-0 font-bold text-brand-primary"
            )}
          >
            {number}. Seguridad y Credenciales
          </h2>
        </div>
        <p
          className={cn(
            typography.labelSm,
            "shrink-0 rounded-sm bg-brand-border px-2 py-0.5 text-brand-secondary-hover uppercase"
          )}
        >
          FIDO2 activo
        </p>
      </div>

      {/* Botones en fila desde sm; en xl van en columna junto al texto, porque "Próximamente" los alarga. */}
      <div className="flex flex-col gap-4 rounded-md border border-brand-neutral bg-background p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-sm border border-brand-border bg-card text-brand-secondary">
            <KeyIcon aria-hidden="true" className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3
              className={cn(typography.labelLg, "font-bold text-brand-primary")}
            >
              Autenticación Multifactor y Llave FÍSICA
            </h3>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              Llave de seguridad {security.securityKey} registrada para acceso a
              sistemas de plan de vuelo y despacho operacional.
            </p>
            <p
              className={cn(
                typography.labelSm,
                "flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1.5 text-muted-foreground"
              )}
            >
              <span>
                Último cambio de clave: hace {security.lastPasswordChangeDays}{" "}
                días
              </span>
              <span aria-hidden="true">•</span>
              <span className="font-medium text-brand-secondary">
                {security.hardwareSynced
                  ? "Hardware 2FA sincronizado"
                  : "Hardware 2FA sin sincronizar"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0 xl:flex-col">
          <button
            type="button"
            aria-disabled="true"
            aria-label="Cambiar Contraseña, próximamente"
            className={comingSoonButton}
          >
            Cambiar Contraseña
            <span className="font-medium">Próximamente</span>
          </button>
          <button
            type="button"
            aria-disabled="true"
            aria-label="Configurar YubiKey, próximamente"
            className={comingSoonButton}
          >
            Configurar YubiKey
            <span className="font-medium">Próximamente</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default SecuritySection
