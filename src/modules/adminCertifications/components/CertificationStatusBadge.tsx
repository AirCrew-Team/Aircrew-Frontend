import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import type { CertificationState } from "@/modules/adminCertifications/types/adminCertifications.types"
import { CERTIFICATION_STATUS } from "@/modules/adminCertifications/utils/certificationStatus"

// Etiqueta del estado de la certificación (Verificado, Por verificar, Sin certificado).
const CertificationStatusBadge = ({
  status,
}: {
  status: CertificationState
}) => {
  const { label, badge, dot } = CERTIFICATION_STATUS[status]
  return (
    <span
      className={cn(
        typography.labelSm,
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap uppercase",
        badge
      )}
    >
      {/* Punto decorativo: el estado ya se dice con el texto. */}
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", dot)}
      />
      {label}
    </span>
  )
}

export default CertificationStatusBadge
