import AbsenceCard from "@/modules/home/components/AbsenceCard"
import AvailabilitySelector from "@/modules/home/components/AvailabilitySelector"
import CertificationsCard from "@/modules/home/components/CertificationsCard"
import NextFlightCard from "@/modules/home/components/NextFlightCard"
import ReplacementRequestBanner from "@/modules/home/components/ReplacementRequestBanner"
import WelcomeHeader from "@/modules/home/components/WelcomeHeader"

const InicioPage = () => {
  return (
    <>
      <title>Inicio | AirCrew</title>
      <div className="flex flex-col gap-6">
        <WelcomeHeader />
        <AvailabilitySelector />
        <ReplacementRequestBanner />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <NextFlightCard />
          <CertificationsCard />
          <AbsenceCard />
        </div>
      </div>
    </>
  )
}

export default InicioPage
