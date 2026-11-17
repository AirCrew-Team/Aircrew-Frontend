import type {
  AbsenceReportInput,
  AbsenceReportReceipt,
  AffectedFlight,
} from "@/modules/absences/types/absences.types"

// Datos simulados con la forma de las acciones reales: se moverán a App/actions cuando exista la API.

const MINUTE = 60_000

// La salida es "ahora + 5 h 48 min" redondeado al minuto hacia abajo, y la presentación
// 90 min antes: la cuenta a presentación empieza en «04h : 18m».
export const getAffectedFlight = (): Promise<AffectedFlight> => {
  const departure =
    Math.floor((Date.now() + (5 * 60 + 48) * MINUTE) / MINUTE) * MINUTE

  return Promise.resolve({
    flightNumber: "AV-8520",
    aircraft: "Airbus A320",
    origin: "BOG",
    destination: "CLO",
    departureAt: new Date(departure).toISOString(),
    presentationAt: new Date(departure - 90 * MINUTE).toISOString(),
    flightRole: "Primer Oficial",
    gate: "A4",
    airport: "SKBO",
  })
}

// Tarda unos 400 ms para que se vea el estado «Enviando aviso…». No persiste nada.
export const submitAbsenceReport = (
  input: AbsenceReportInput
): Promise<AbsenceReportReceipt> =>
  new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          reportId: `AUS-${Date.now()}`,
          flightNumber: input.flightNumber,
        }),
      400
    )
  })
