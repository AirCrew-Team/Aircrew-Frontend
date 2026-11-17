import OpsDeckFooter from "@/modules/shared/opsHome/components/OpsDeckFooter"
import AbsencesCard from "@/modules/supervisorHome/components/AbsencesCard"
import CrewCard from "@/modules/supervisorHome/components/CrewCard"
import ProgramacionCard from "@/modules/supervisorHome/components/ProgramacionCard"
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

      {/* 3. Accesos a los módulos del supervisor, en el orden del menú.
          Móvil: 1 columna. Tablet: 2 columnas. Escritorio: 4 columnas. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <ProgramacionCard />
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
