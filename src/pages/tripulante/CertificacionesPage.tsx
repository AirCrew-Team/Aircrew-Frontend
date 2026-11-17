import CertificationsBrowser from "@/modules/certifications/components/CertificationsBrowser"
import CertificationsHeader from "@/modules/certifications/components/CertificationsHeader"
import CertificationsSummary from "@/modules/certifications/components/CertificationsSummary"
import InstructionSupportCard from "@/modules/certifications/components/InstructionSupportCard"
import RecurrentTrainingCard from "@/modules/certifications/components/RecurrentTrainingCard"
import SyncStatusCard from "@/modules/certifications/components/SyncStatusCard"

const CertificacionesPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <CertificationsHeader />
      <CertificationsSummary />
      <CertificationsBrowser />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SyncStatusCard />
        <RecurrentTrainingCard />
        <InstructionSupportCard />
      </div>
    </div>
  )
}

export default CertificacionesPage
