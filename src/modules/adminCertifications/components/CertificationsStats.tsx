import { useQuery } from "@tanstack/react-query"

import {
  CertificationIcon,
  ClockIcon,
  CriticalAlertIcon,
  PositionIcon,
} from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"
import { getCertificationsStats } from "@/modules/adminCertifications/data/adminCertifications.data"
import { CERTIFICATION_STATUS } from "@/modules/adminCertifications/utils/certificationStatus"

// Bloque 2: indicadores de la tripulación. Comparte la consulta
// ["certifications", "adminStats"] con los conteos de los filtros (CertificationsToolbar):
// TanStack Query la pide una sola vez.
const CertificationsStats = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["certifications", "adminStats"],
    queryFn: getCertificationsStats,
  })

  // Estados de la consulta: cargando (status) o error (alert). Si falla, solo esta
  // sección muestra el error; la tabla y la barra siguen funcionando.
  if (isPending) {
    return (
      <p
        role="status"
        className={cn(typography.bodySm, "text-muted-foreground")}
      >
        Cargando indicadores…
      </p>
    )
  }

  if (isError) {
    return (
      <p role="alert" className={cn(typography.bodySm, "text-destructive")}>
        No se pudieron cargar los indicadores.
      </p>
    )
  }

  // Los cuatro indicadores de la referencia: ícono, valor, etiqueta y color del ícono.
  const stats = [
    {
      icon: PositionIcon,
      value: data.total,
      label: "Tripulantes",
      iconBox: "border-brand-border bg-brand-neutral text-brand-secondary",
    },
    {
      icon: CertificationIcon,
      value: data.byStatus.verificado,
      label: "Verificados",
      iconBox: CERTIFICATION_STATUS.verificado.iconBox,
    },
    {
      icon: ClockIcon,
      value: data.byStatus.por_verificar,
      label: "Por verificar",
      iconBox: CERTIFICATION_STATUS.por_verificar.iconBox,
    },
    {
      icon: CriticalAlertIcon,
      value: data.byStatus.sin_certificado,
      label: "Sin certificado",
      iconBox: CERTIFICATION_STATUS.sin_certificado.iconBox,
    },
  ]

  return (
    // Lista de pares etiqueta/valor. Celular y tablet: 2 columnas. Desde lg: las 4 en
    // una fila; en xl, al lado del título sin encogerse (como en Usuarios).
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:shrink-0">
      {stats.map(({ icon: Icon, value, label, iconBox }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm"
        >
          {/* Ícono decorativo: el indicador ya se nombra con su etiqueta. */}
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md border",
              iconBox
            )}
          >
            <Icon className="size-4.5" />
          </span>
          {/* flex-col-reverse: el número se ve arriba, pero el lector lee primero la etiqueta. */}
          <div className="flex min-w-0 flex-col-reverse">
            <dt
              className={cn(
                typography.labelSm,
                "text-muted-foreground uppercase"
              )}
            >
              {label}
            </dt>
            <dd
              className={cn(
                typography.headlineSm,
                "font-bold text-brand-primary tabular-nums"
              )}
            >
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

export default CertificationsStats
