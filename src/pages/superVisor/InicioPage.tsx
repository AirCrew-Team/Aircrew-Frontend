import OpsDeckFooter from "@/modules/shared/opsHome/components/OpsDeckFooter"
import AbsencesCard from "@/modules/supervisorHome/components/AbsencesCard"
import CrewCard from "@/modules/supervisorHome/components/CrewCard"
import ReplacementRequestsCard from "@/modules/supervisorHome/components/ReplacementRequestsCard"
import ShiftStatusHero from "@/modules/supervisorHome/components/ShiftStatusHero"
import SupervisorWelcomeHeader from "@/modules/supervisorHome/components/SupervisorWelcomeHeader"

// Inicio del supervisor (/supervisor). Como toda página, solo ordena los módulos:
// cada sección pide sus propios datos y maneja su carga y su error.
const InicioPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Bienvenida, sede y reloj maestro UTC. */}
      <SupervisorWelcomeHeader />

      {/* 2. Estado del turno sobre la foto. */}
      <ShiftStatusHero />

      {/* 3. Accesos a los módulos del supervisor (misma rejilla que el Inicio del admin).
          Móvil: 1 columna. Tablet: 2 columnas, y la última tarjeta ocupa la fila
          completa para no quedar sola a media pantalla. Escritorio: 3 columnas. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 md:[&>:last-child]:col-span-2 lg:[&>:last-child]:col-span-1">
        <ReplacementRequestsCard />
        <AbsencesCard />
        <CrewCard />
      </div>

      {/* 4. Pie con la identificación de la consola y la versión. */}
      <OpsDeckFooter />
    </div>
  )
}

export default InicioPage
