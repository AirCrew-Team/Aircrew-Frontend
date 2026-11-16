import { ChevronRightIcon } from "@/App/utils/icons"
import { typography } from "@/App/utils/typography"
import { cn } from "@/lib/utils"

// Bloque 1: ruta de navegación, título y descripción de la pantalla, como en Usuarios y
// Certificaciones. Estático: no pide datos.
const AircraftHeader = () => (
  <div className="flex min-w-0 flex-col gap-1">
    {/* Ruta de navegación (breadcrumb): ol dentro de nav, con la página actual marcada. */}
    <nav aria-label="Ruta de navegación">
      <ol
        className={cn(
          typography.labelSm,
          "flex flex-wrap items-center gap-1.5 uppercase"
        )}
      >
        <li className="text-muted-foreground">Operaciones de vuelo</li>
        <li aria-hidden="true">
          <ChevronRightIcon className="size-3.5 text-muted-foreground" />
        </li>
        <li aria-current="page" className="text-brand-secondary">
          Control de flota
        </li>
      </ol>
    </nav>
    {/* Único h1 de la pantalla. */}
    <h1
      className={cn(
        typography.headlineLg,
        "font-bold tracking-tight text-brand-primary"
      )}
    >
      Aeronaves
    </h1>
    <p className={cn(typography.bodyMd, "text-muted-foreground")}>
      Inventario de flota, configuración técnica y asignación de destinos.
    </p>
  </div>
)

export default AircraftHeader
