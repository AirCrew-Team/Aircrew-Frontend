import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Versión simulada, como en la referencia; se tomará del despliegue cuando exista.
const APP_VERSION = "v2.4.8-PROD"

// Pie del Inicio del admin: identificación de la consola y versión.
// Estático: no pide datos. flex-wrap: en móvil la versión baja de línea si no cabe.
const OpsDeckFooter = () => (
  <footer
    className={cn(
      typography.labelSm,
      "flex flex-wrap items-center justify-between gap-2 border-t border-brand-border pt-4 font-medium text-muted-foreground"
    )}
  >
    <p>AirCrew Operational Deck • UTC Synchronized</p>
    <p>{APP_VERSION}</p>
  </footer>
)

export default OpsDeckFooter
