import { FlightIcon, PositionIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { OperatorProfile } from "@/modules/operatorProfile/types/operatorProfile.types"

// Credencial digital (tarjeta oscura): título y licencia. Solo lectura.
const OperatorCredentialCard = ({
  credential,
}: {
  credential: OperatorProfile["credential"]
}) => (
  <section
    aria-label="Credencial digital"
    className="flex flex-col gap-3 rounded-xl bg-brand-primary p-5 text-white shadow-sm"
  >
    <p
      className={cn(
        typography.labelSm,
        "flex items-center gap-1.5 text-white/70 uppercase"
      )}
    >
      <PositionIcon aria-hidden="true" className="size-4" />
      Credencial digital
    </p>
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10"
      >
        <FlightIcon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className={cn(typography.labelLg, "font-bold")}>
          {credential.title}
        </p>
        <p className={cn(typography.bodySm, "break-words text-white/70")}>
          {credential.license}
        </p>
      </div>
    </div>
  </section>
)

export default OperatorCredentialCard
