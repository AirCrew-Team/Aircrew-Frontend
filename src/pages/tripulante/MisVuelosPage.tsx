import FlightMetrics from "@/modules/flights/components/FlightMetrics"
import FlightsBrowser from "@/modules/flights/components/FlightsBrowser"
import FlightsHeader from "@/modules/flights/components/FlightsHeader"

const MisVuelosPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <FlightsHeader />
      <FlightMetrics />
      <FlightsBrowser />
    </div>
  )
}

export default MisVuelosPage
