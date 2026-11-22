import apiClient from "@/service/api-client"

// Turno actual del servicio crew (GET /api/crew/shifts/current), a través del gateway y
// con la cookie de sesión. Sin base junta todas las bases con la hora de Nueva York (así
// lo pide el admin, que no tiene base).

export type ShiftCode = "morning" | "afternoon" | "night"

interface ApiCurrentShift {
  shift: ShiftCode
  flights_today: number
  standby_total: number
  standby_ready: number
  // Siempre 0: el backend aún no lo calcula, así que no se expone.
  staffing_delays: number
}

export interface CurrentShift {
  shift: ShiftCode
  flightsToday: number
  standbyTotal: number
  standbyReady: number
}

export const getCurrentShift = async (): Promise<CurrentShift> => {
  const { data } = await apiClient.get<ApiCurrentShift>(
    "/api/crew/shifts/current"
  )
  return {
    shift: data.shift,
    flightsToday: data.flights_today,
    standbyTotal: data.standby_total,
    standbyReady: data.standby_ready,
  }
}
