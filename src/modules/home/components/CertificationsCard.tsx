import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"

import { ArrowRightIcon, CertificationIcon, ClockIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCertifications } from "@/modules/shared/certifications/data/certifications.data"
import type { Certification } from "@/modules/shared/certifications/types/certifications.types"
import { getExpiryInfo } from "@/modules/shared/certifications/utils/expiry"
import { PATHS } from "@/routes/paths"

// Aptas = vigentes y vitalicias; la próxima es la de menos días que aún no venció.
const summarize = (certifications: Certification[], today: Date) => {
  let validCount = 0
  let expiredCount = 0
  let next: { name: string; days: number } | null = null
  for (const certification of certifications) {
    const { status, days } = getExpiryInfo(certification.expiresAt, today)
    if (status === "vigente" || status === "vitalicio") validCount += 1
    if (status === "vencido") expiredCount += 1
    if (days !== null && days >= 0 && (next === null || days < next.days)) {
      next = { name: certification.name, days }
    }
  }
  return { validCount, expiredCount, next }
}

const formatDays = (days: number) =>
  days === 0 ? "Hoy" : days === 1 ? "En 1 día" : `En ${days} días`

// Tarjeta 2: resumen calculado de certificaciones y acceso a las licencias.
const CertificationsCard = () => {
  const {
    data: certifications,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["certifications", "list"],
    queryFn: getCertifications,
  })
  const summary = certifications
    ? summarize(certifications, new Date())
    : undefined

  return (
    <article className="flex flex-col justify-between gap-6 rounded-xl bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        {isPending ? (
          <p
            role="status"
            className={cn(typography.bodySm, "pt-2 text-muted-foreground")}
          >
            Cargando certificaciones…
          </p>
        ) : isError ? (
          <p
            role="alert"
            className={cn(typography.bodySm, "pt-2 text-destructive")}
          >
            No se pudo cargar el resumen de certificaciones.
          </p>
        ) : summary ? (
          <>
            <div className="flex flex-col pt-2">
              <h2
                className={cn(
                  typography.headlineMd,
                  "font-bold text-brand-primary"
                )}
              >
                Certificaciones
              </h2>
              <p className={cn(typography.bodySm, "text-muted-foreground")}>
                Resumen de licencias y chequeos periódicos
              </p>
            </div>
            <div
              className={cn(
                typography.bodySm,
                "flex flex-col gap-2 rounded-md bg-muted p-2.5 text-foreground"
              )}
            >
              <p className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-brand-secondary"
                  />
                  Certificaciones Aptas:
                </span>
                <span className="font-semibold text-brand-primary">
                  {summary.validCount} Requisitos
                </span>
              </p>
              {summary.next ? (
                <p className="flex items-center justify-between gap-2 rounded-sm bg-card p-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ClockIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand-secondary"
                    />
                    {summary.next.name}
                  </span>
                  <span
                    className={cn(
                      typography.labelSm,
                      "shrink-0 rounded-sm bg-brand-neutral px-2 py-0.5 text-brand-primary"
                    )}
                  >
                    {formatDays(summary.next.days)}
                  </span>
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {/* Después del h2 en el DOM (orden de lectura); order-first lo muestra arriba. */}
        <div className="order-first flex items-center justify-between gap-2">
          <p
            className={cn(
              typography.labelSm,
              "flex items-center gap-2 tracking-wider text-muted-foreground uppercase"
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-neutral text-brand-secondary"
            >
              <CertificationIcon aria-hidden="true" className="size-5" />
            </span>
            Habilitaciones RAC
          </p>
          {summary ? (
            <p
              className={cn(
                typography.labelSm,
                "shrink-0 rounded-sm px-2 py-0.5",
                summary.expiredCount === 0
                  ? "bg-brand-neutral text-brand-primary"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {summary.expiredCount === 0
                ? "Vigente"
                : `${summary.expiredCount} ${summary.expiredCount === 1 ? "vencida" : "vencidas"}`}
            </p>
          ) : null}
        </div>
      </div>
      <Link
        to={PATHS.tripulante.certificaciones}
        className={cn(
          typography.labelMd,
          "inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-md bg-muted px-4 py-2.5 font-semibold text-brand-primary transition-colors hover:bg-brand-secondary hover:text-white focus-visible:ring-2 focus-visible:ring-brand-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-hidden lg:min-h-9"
        )}
      >
        Consultar Licencias
        <ArrowRightIcon aria-hidden="true" className="size-4.5 shrink-0" />
      </Link>
    </article>
  )
}

export default CertificationsCard
