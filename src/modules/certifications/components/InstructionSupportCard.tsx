import { EmergencyLineIcon, MailIcon, PhoneIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// T3: contacto de la jefatura de instrucción. La extensión es interna: no lleva enlace.
const InstructionSupportCard = () => {
  // Fondo suave (surface-container-low de la referencia = muted).
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-border/70 bg-muted p-5 shadow-sm sm:p-6">
      <h2
        className={cn(
          typography.headlineSm,
          "font-bold text-balance text-brand-primary"
        )}
      >
        Jefatura de Instrucción y Entrenamiento Aerocivil
      </h2>
      <p
        className={cn(
          typography.labelSm,
          "order-first flex items-start gap-1 font-bold tracking-wider text-brand-secondary uppercase"
        )}
      >
        <EmergencyLineIcon aria-hidden="true" className="size-3.5 shrink-0" />
        Soporte y Trámites
      </p>
      <p className={cn(typography.bodySm, "text-muted-foreground")}>
        Para renovaciones de certificados o actualización de bitácora,
        comunícate con instrucción:
      </p>
      <div className="mt-auto flex flex-col gap-1 pt-2">
        <a
          href="mailto:instruccion@aircrew.aero"
          className={cn(
            typography.labelLg,
            // wrap-anywhere: el correo puede partirse en pantallas estrechas sin desbordar.
            "inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 self-start rounded-sm font-bold wrap-anywhere text-brand-secondary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-hidden lg:min-h-9"
          )}
        >
          <MailIcon aria-hidden="true" className="size-4 shrink-0" />
          instruccion@aircrew.aero
        </a>
        <p
          className={cn(
            typography.labelMd,
            "flex items-start gap-2 font-semibold text-muted-foreground"
          )}
        >
          <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
          Ext. 4022 • Operaciones Base SKBO
        </p>
      </div>
    </div>
  )
}

export default InstructionSupportCard
