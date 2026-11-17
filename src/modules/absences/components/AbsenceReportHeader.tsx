import { UrgentAlertIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import PresentationCountdown from "@/modules/absences/components/PresentationCountdown"

// C: antetítulo, h1 y descripción; a la derecha (debajo en móvil) la cuenta a presentación.
const AbsenceReportHeader = () => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className={cn(
            typography.labelSm,
            "flex items-center gap-1 tracking-wider text-brand-secondary uppercase"
          )}
        >
          <UrgentAlertIcon aria-hidden="true" className="size-4 shrink-0" />
          OCC Crew Operations • Novedades de Tripulación
        </p>
        <h1
          // AbsenceReportForm usa este id para nombrar el formulario.
          id="reportar-ausencia-titulo"
          className={cn(
            typography.headlineLg,
            "font-bold tracking-tight text-balance text-brand-primary"
          )}
        >
          Reportar Novedad de Ausencia
        </h1>
        <p className={cn(typography.bodyMd, "max-w-3xl text-muted-foreground")}>
          Notifica a la supervisión de operaciones (OCC) sobre cualquier
          indisponibilidad médica, fatiga o calamidad imprevista para tu próximo
          servicio programado.
        </p>
      </div>
      <PresentationCountdown />
    </div>
  )
}

export default AbsenceReportHeader
