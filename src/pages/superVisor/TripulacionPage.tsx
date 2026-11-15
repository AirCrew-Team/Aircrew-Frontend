import ShiftCrewBoard from "@/modules/shiftCrew/components/ShiftCrewBoard"
import ShiftCrewHeader from "@/modules/shiftCrew/components/ShiftCrewHeader"

// Tripulación del turno del supervisor (/supervisor/tripulacion). Solo compone.
const TripulacionPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <ShiftCrewHeader />
      <ShiftCrewBoard />
    </div>
  )
}

export default TripulacionPage
