import AbsenceTrackingBoard from "@/modules/absenceTracking/components/AbsenceTrackingBoard"
import AbsenceTrackingHeader from "@/modules/absenceTracking/components/AbsenceTrackingHeader"

// Seguimiento de ausencias del supervisor (/supervisor/ausencias). Solo compone.
const AusenciasPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <AbsenceTrackingHeader />
      <AbsenceTrackingBoard />
    </div>
  )
}

export default AusenciasPage
