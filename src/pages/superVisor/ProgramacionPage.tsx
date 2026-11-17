import ProgramacionHeader from "@/modules/flightAssignment/components/ProgramacionHeader"
import ScheduleBoard from "@/modules/flightAssignment/components/ScheduleBoard"

// Programación de tripulaciones del supervisor (/supervisor/programacion). Solo compone:
// el tablero lleva el selector de día, la lista de vuelos y la ficha del vuelo.
const ProgramacionPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <ProgramacionHeader />
      <ScheduleBoard />
    </div>
  )
}

export default ProgramacionPage
