import { useEffect, useState } from "react"
import { useLocation, useSearchParams } from "react-router"

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
  // ?vuelo=<id>&fecha=<día> (aviso de la campana) elige ese día (si no está entre los 7,
  // hoy) y ese vuelo, una vez por navegación. Luego se quitan de la URL, así el mismo aviso
  // vuelve a elegirlos. `requested.key` remonta el tablero aunque ya esté en ese día.
  const [searchParams, setSearchParams] = useSearchParams()
  const { key: locationKey } = useLocation()
  const [requested, setRequested] = useState<{
    key: string
    flightId: string
  } | null>(null)
  const flightParam = searchParams.get("vuelo")
  if (flightParam && requested?.key !== locationKey) {
    setRequested({ key: locationKey, flightId: flightParam })
    setDayIndex(Math.max(dates.indexOf(searchParams.get("fecha") ?? ""), 0))
  }
  useEffect(() => {
    if (flightParam) setSearchParams({}, { replace: true })
  }, [flightParam, setSearchParams])
  const date = dates[dayIndex]

  return (
    <>
      <DaySelector
        dates={dates}
        selectedIndex={dayIndex}
        onSelect={(index) => {
          // El día ya elegido no reinicia el tablero (ni la selección que trajo un aviso).
          if (index === dayIndex) return
          setDayIndex(index)
          setRequested(null)
        }}
      />
      {/* key: cambiar de día (o llegar desde un aviso) reinicia el filtro, el corte, la
          selección y la alerta. */}
      <FlightBoard
        key={`${date}:${requested?.key ?? ""}`}
        date={date}
        initialFlightId={requested?.flightId}
      />
    </>
  )
}

export default ScheduleBoard
