import { expect, test, type Page } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-05: textos de la spec reportar-ausencia (RA-07, RA-11), de la spec ausencias-reales
// (AU-04: el formulario es por fechas) y de src/tests/absences/ReportarAusenciaPage.form.test.tsx.
// Con la cuenta demo el envío sigue siendo simulado y el formulario queda bloqueado.
const NOTAS = "Fiebre alta desde la madrugada."

// «YYYY-MM-DD» del día local `offset` días después de hoy, calculado en el navegador
// (su zona horaria es la que usa el formulario).
const fechaLocal = (page: Page, offset: number) =>
  page.evaluate((dias) => {
    const fecha = new Date()
    fecha.setHours(12, 0, 0, 0)
    fecha.setDate(fecha.getDate() + dias)
    const dos = (valor: number) => String(valor).padStart(2, "0")
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
  }, offset)

// «YYYY-MM-DD» → «21 nov», como lo escribe la pantalla.
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]
const diaCorto = (fecha: string) => {
  const [, mes, dia] = fecha.split("-").map(Number)
  return `${dia} ${MESES[mes - 1]}`
}

test("E2E-05 el tripulante envía el aviso de ausencia por fechas: sale la confirmación y el formulario queda bloqueado", async ({
  page,
}) => {
  await loginAs(page, "tripulante")
  await goToSection(page, "Reportar Ausencia", "Reportar Novedad de Ausencia")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  const formulario = main.getByRole("form")
  // AU-04: ya no hay vuelo afectado.
  await expect(formulario).not.toContainText("Vuelo o Turno Afectado")
  await expect(formulario).not.toContainText("AV-8520")

  const inicio = formulario.getByLabel(/Fecha de inicio/)
  const fin = formulario.getByLabel(/Fecha de fin/)
  const motivo = main.getByRole("combobox", { name: "Motivo de la Ausencia" })
  const notas = main.getByRole("textbox", { name: "Observaciones Adicionales" })
  const desde = await fechaLocal(page, 1)
  const hasta = await fechaLocal(page, 3)
  await inicio.fill(desde)
  await fin.fill(hasta)
  // «Fatiga operacional / 14 CFR 117.5» no exige soporte (RA-07).
  await motivo.selectOption({ label: "Fatiga operacional / 14 CFR 117.5" })
  await notas.fill(NOTAS)
  await main.getByRole("button", { name: "Enviar Aviso a Despacho" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Aviso enviado al supervisor" })
  await expect(toast).toBeVisible()
  const periodo = `del ${diaCorto(desde)} al ${diaCorto(hasta)}`
  await expect(toast).toContainText(
    `Se buscará el mejor reemplazo para tu posición ${periodo} y el supervisor lo aprobará.`
  )

  await expect(inicio).toBeDisabled()
  await expect(inicio).toHaveValue(desde)
  await expect(fin).toBeDisabled()
  await expect(fin).toHaveValue(hasta)
  await expect(motivo).toBeDisabled()
  await expect(motivo).toHaveValue("fatiga")
  await expect(notas).toBeDisabled()
  await expect(notas).toHaveValue(NOTAS)
  await expect(
    main.getByText(`Aviso enviado al supervisor para tu ausencia ${periodo}.`, {
      exact: true,
    })
  ).toBeVisible()
  await expect(
    main.getByRole("button", { name: "Enviar Aviso a Despacho" })
  ).toHaveCount(0)
  await expect(
    main.getByRole("link", { name: "Volver al Inicio" })
  ).toBeFocused()
})
