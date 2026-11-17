import { useQuery } from "@tanstack/react-query"

import { VerifiedIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCrewProfile } from "@/modules/profile/data/profile.data"

interface MedicalCertificateNoticeProps {
  userId: string
}

// I4 (tripulante): aviso del certificado médico vigente y su próxima renovación.
const MedicalCertificateNotice = ({
  userId,
}: MedicalCertificateNoticeProps) => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["profile", "crew", userId],
    queryFn: () => getCrewProfile(userId),
  })

  return (
    <section className="flex items-start gap-2.5 rounded-xl border border-brand-border bg-muted p-4">
      {isPending ? (
        <p
          role="status"
          className={cn(typography.bodySm, "text-muted-foreground")}
        >
          Cargando datos de vuelo…
        </p>
      ) : isError ? (
        <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
          No se pudieron cargar los datos de vuelo.
        </p>
      ) : (
        <>
          <VerifiedIcon
            aria-hidden="true"
            className="size-5.5 shrink-0 text-brand-secondary"
          />
          <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
            <h2
              className={cn(typography.labelMd, "font-bold text-brand-primary")}
            >
              Certificado Médico {data.medicalCertificate.medicalClass} Vigente
            </h2>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              Próxima renovación programada para el{" "}
              {data.medicalCertificate.nextRenewal} en{" "}
              {data.medicalCertificate.center}.
            </p>
          </div>
        </>
      )}
    </section>
  )
}

export default MedicalCertificateNotice
