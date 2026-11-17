import { AiSuggestIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

interface SuggestCrewCardProps {
  // Puestos vacíos del vuelo (la tarjeta solo se muestra si hay alguno).
  emptyCount: number
  disabled: boolean
  onSuggest: () => void
}

// Tarjeta oscura de la IA: propone a alguien para cada puesto vacío; el supervisor decide.
const SuggestCrewCard = ({
  emptyCount,
  disabled,
  onSuggest,
}: SuggestCrewCardProps) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-primary bg-linear-135 from-brand-primary to-brand-primary-dark p-4 text-white shadow-sm sm:p-5">
    <div className="flex min-w-0 grow basis-64 flex-col gap-1">
      <h3 className={cn(typography.headlineSm, "font-bold")}>
        Sugerir tripulación
      </h3>
      <p className={cn(typography.bodyMd, "max-w-[60ch] text-white/80")}>
        La IA propone a alguien para cada puesto vacío entre quienes cumplen las
        reglas, y explica por qué. Tú decides.
      </p>
    </div>
    <button
      type="button"
      data-focus-id="suggest"
      disabled={disabled}
      onClick={onSuggest}
      className={cn(
        typography.labelLg,
        "inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-brand-primary transition-colors hover:bg-brand-neutral focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary focus-visible:outline-hidden active:bg-brand-border disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none sm:w-auto lg:min-h-9"
      )}
    >
      <AiSuggestIcon aria-hidden="true" className="size-4 shrink-0" />
      {emptyCount === 1
        ? "Sugerir para 1 puesto"
        : `Sugerir para ${emptyCount} puestos`}
    </button>
  </div>
)

export default SuggestCrewCard
