import AbsenceReportForm from "@/modules/absences/components/AbsenceReportForm"
import AbsenceReportHeader from "@/modules/absences/components/AbsenceReportHeader"
import EmergencyLineCard from "@/modules/absences/components/EmergencyLineCard"
import MedicalServiceNotice from "@/modules/absences/components/MedicalServiceNotice"
import ReportingPolicyCard from "@/modules/absences/components/ReportingPolicyCard"

const ReportarAusenciaPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <AbsenceReportHeader />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <AbsenceReportForm />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <ReportingPolicyCard />
          <EmergencyLineCard />
          <MedicalServiceNotice />
        </div>
      </div>
    </div>
  )
}

export default ReportarAusenciaPage
