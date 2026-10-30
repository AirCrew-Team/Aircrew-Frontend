import type { CSSProperties } from "react"
import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

// Variables CSS de sonner enlazadas a los colores del tema de la app
const toasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as CSSProperties

// Contenedor de notificaciones (toasts) con íconos y tema personalizados
const Toaster = ({ ...props }: ToasterProps) => {
  // Tema actual de la app ("system" si no hay uno definido)
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      className="toaster group"
      // Un ícono por tipo de notificación
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={toasterStyle}
      theme={theme as ToasterProps["theme"]}
      // Clase para personalizar el estilo de cada toast desde el CSS
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }