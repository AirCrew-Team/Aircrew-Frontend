import type { ReportAbsenceInput } from "@/App/types/absences.types"

// Simulación del envío para las cuentas demo, con la misma entrada que reportAbsence de
// App/actions/absences (la usa la sesión real).

export interface AbsenceReportReceipt {
  reportId: string
  startDate: string
  endDate: string
}

// Tarda unos 400 ms para que se vea el estado «Enviando aviso…». No persiste nada.
export const submitAbsenceReport = (
  input: ReportAbsenceInput
): Promise<AbsenceReportReceipt> =>
  new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          reportId: `AUS-${Date.now()}`,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
      400
    )
  })
