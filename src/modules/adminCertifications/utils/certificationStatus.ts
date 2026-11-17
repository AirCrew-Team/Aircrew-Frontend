import type { CertificationState } from "@/modules/adminCertifications/types/adminCertifications.types"

// Texto y colores de cada estado, compartidos por la etiqueta de la tabla y los
// indicadores. El sistema de diseño no tiene verde ni ámbar: «Verificado» y «Por
// verificar» usan la paleta de Tailwind (emerald y amber) en tonos con buen contraste,
// como en la referencia. «Sin certificado» usa los tokens de error del proyecto.
export const CERTIFICATION_STATUS: Record<
  CertificationState,
  {
    label: string
    // Etiqueta de la columna Estado.
    badge: string
    dot: string
    // Recuadro del ícono en el indicador del encabezado.
    iconBox: string
  }
> = {
  verificado: {
    label: "Verificado",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-600",
    iconBox: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  por_verificar: {
    label: "Por verificar",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    iconBox: "border-amber-200 bg-amber-50 text-amber-700",
  },
  sin_certificado: {
    label: "Sin certificado",
    badge: "bg-error-container text-on-error-container",
    dot: "bg-destructive",
    iconBox: "border-error-container bg-error-container/50 text-destructive",
  },
}

// Orden de los filtros y de los indicadores, como en la referencia.
export const CERTIFICATION_STATES: CertificationState[] = [
  "verificado",
  "por_verificar",
  "sin_certificado",
]
