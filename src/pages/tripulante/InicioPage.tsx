import AbsenceCard from "@/modules/home/components/AbsenceCard"
import AssignmentStatus from "@/modules/home/components/AssignmentStatus"
import CertificationsCard from "@/modules/home/components/CertificationsCard"
import NextFlightCard from "@/modules/home/components/NextFlightCard"
import ReplacementAssignmentBanner from "@/modules/home/components/ReplacementAssignmentBanner"
import WelcomeHeader from "@/modules/home/components/WelcomeHeader"

const InicioPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <WelcomeHeader />
      <AssignmentStatus />
      <ReplacementAssignmentBanner />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <NextFlightCard />
        <CertificationsCard />
        <AbsenceCard />
      </div>
    </div>
  )
}

export default InicioPage
