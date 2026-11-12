import { useQuery } from "@tanstack/react-query"

import {
  ConfirmedIcon,
  ExpiryReminderIcon,
  WarningIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCertifications } from "@/modules/shared/certifications/data/certifications.data"
import { getExpiryInfo } from "@/modules/shared/certifications/utils/expiry"

// R: contadores por estado, calculados sobre la misma query que la lista.
const CertificationsSummary = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "list"],
    queryFn: getCertifications,
  })

  if (isPending) {
    return (
      <p
        role="status"
        className={cn(typography.bodySm, "text-muted-foreground")}
      >
        Cargando resumen de certificaciones…
      </p>
    )
  }

  if (isError) {
    return (
      <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
        No se pudo cargar el resumen de certificaciones.
      </p>
    )
  }

  const today = new Date()
  const current: string[] = []
  const upcoming: string[] = []
  const expired: string[] = []
  for (const certification of data) {
    const { status } = getExpiryInfo(certification.expiresAt, today)
    if (status === "vencido") expired.push(certification.name)
    else if (status === "proximo") upcoming.push(certification.name)
    else current.push(certification.name)
  }

  // Tonos de la referencia: vigente en azul de marca, próximo con el número en azul y
  // vencido en gris mientras no haya ninguno (en rojo si lo hay).
  const cards = [
    {
      title: "Vigente / Al día",
      count: current.length,
      note: "Aptos para despacho inmediato",
      Icon: ConfirmedIcon,
      dotClass: "bg-brand-secondary",
      countClass: "text-brand-primary",
      unitClass: "text-muted-foreground",
      iconClass: "bg-brand-border text-brand-primary",
    },
    {
      title: "Próximo a vencer (<60 días)",
      count: upcoming.length,
      note:
        upcoming.length > 0
          ? upcoming.join(", ")
          : "Sin vencimientos en los próximos 60 días",
      Icon: ExpiryReminderIcon,
      dotClass: "bg-brand-tertiary",
      countClass: "text-brand-secondary",
      unitClass: "text-brand-secondary",
      iconClass: "bg-brand-neutral text-brand-secondary",
    },
    {
      title: "Vencido / No apto",
      count: expired.length,
      note:
        expired.length > 0
          ? expired.join(", ")
          : "Sin suspensiones reglamentarias",
      Icon: WarningIcon,
      dotClass:
        expired.length > 0 ? "bg-destructive" : "bg-brand-border-strong",
      countClass:
        expired.length > 0 ? "text-destructive" : "text-brand-primary",
      unitClass: "text-muted-foreground",
      iconClass:
        expired.length > 0
          ? "bg-error-container text-on-error-container"
          : "bg-brand-neutral text-muted-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* pr-22 deja sitio al cuadro del ícono (48 px + 24 px de margen + 16 px de aire).
          Entre md y lg las tres columnas son estrechas: el ícono decorativo se oculta. */}
      {cards.map(
        ({
          title,
          count,
          note,
          Icon,
          dotClass,
          countClass,
          unitClass,
          iconClass,
        }) => (
          <div
            key={title}
            className="relative flex flex-col justify-center gap-1 rounded-xl border border-brand-border/70 bg-card p-5 pr-22 shadow-sm sm:p-6 sm:pr-22 md:max-lg:pr-6"
          >
            <div className="flex items-start gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-2.5 shrink-0 rounded-full",
                  dotClass
                )}
              />
              <h2
                className={cn(
                  typography.labelSm,
                  "tracking-wider text-muted-foreground uppercase"
                )}
              >
                {title}
              </h2>
              {/* Cuadro de 48 px con el padding del propio svg: sin envoltorio en el DOM. */}
              <Icon
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 right-5 size-12 shrink-0 -translate-y-1/2 rounded-xl p-3 sm:right-6 md:max-lg:hidden",
                  iconClass
                )}
              />
            </div>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span
                className={cn(
                  typography.displayLg,
                  "leading-none tabular-nums md:leading-none",
                  countClass
                )}
              >
                {count}
              </span>{" "}
              <span className={cn(typography.labelMd, unitClass)}>
                {count === 1 ? "Certificado" : "Certificados"}
              </span>
            </p>
            <p className={cn(typography.bodySm, "text-muted-foreground")}>
              {note}
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default CertificationsSummary
