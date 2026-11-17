import { useState } from "react"

import DaySelector from "@/modules/flightAssignment/components/DaySelector"
import FlightBoard from "@/modules/flightAssignment/components/FlightBoard"
import { dayFromToday } from "@/modules/flightAssignment/components/scheduleDates"

const SCHEDULE_DAYS = 7

// Selector de día y vuelos del día elegido. Las fechas se calculan aquí (hoy a hoy + 6), así la
// lista de vuelos no espera a los resúmenes de los días.
const ScheduleBoard = () => {
  const [dayIndex, setDayIndex] = useState(0)
  const dates = Array.from({ length: SCHEDULE_DAYS }, (_, index) =>
    dayFromToday(index)
  )
  const date = dates[dayIndex]

  return (
    <>
      <DaySelector
        dates={dates}
        selectedIndex={dayIndex}
        onSelect={setDayIndex}
      />
      {/* key: cambiar de día reinicia el filtro, el corte, la selección y la alerta. */}
      <FlightBoard key={date} date={date} />
    </>
  )
}

export default ScheduleBoard
