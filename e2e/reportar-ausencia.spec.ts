import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-05: textos de la spec reportar-ausencia (RA-07, RA-11) y de
// src/tests/absences/ReportarAusenciaPage.form.test.tsx.
const NOTAS = "Fiebre alta desde la madrugada."

test("E2E-05 el tripulante envía el aviso de ausencia: sale la confirmación y el formulario queda bloqueado", async ({
  page,
}) => {
  await loginAs(page, "tripulante")
  await goToSection(page, "Reportar Ausencia", "Reportar Novedad de Ausencia")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  await expect(main.getByRole("form")).toContainText("AV-8520")

  const motivo = main.getByRole("combobox", { name: "Motivo de la Ausencia" })
  const notas = main.getByRole("textbox", { name: "Observaciones Adicionales" })
  // «Fatiga operacional / RAC 212» no exige soporte (RA-07).
  await motivo.selectOption({ label: "Fatiga operacional / RAC 212" })
  await notas.fill(NOTAS)
  await main.getByRole("button", { name: "Enviar Aviso a Despacho" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Aviso enviado al supervisor" })
  await expect(toast).toBeVisible()
  await expect(toast).toContainText(
    "Se buscará el mejor reemplazo para tu posición en el vuelo AV-8520 y el supervisor lo aprobará."
  )

  await expect(motivo).toBeDisabled()
  await expect(motivo).toHaveValue("fatiga")
  await expect(notas).toBeDisabled()
  await expect(notas).toHaveValue(NOTAS)
  await expect(
    main.getByText("Aviso enviado al supervisor para el vuelo AV-8520.")
  ).toBeVisible()
  await expect(
    main.getByRole("button", { name: "Enviar Aviso a Despacho" })
  ).toHaveCount(0)
  await expect(
    main.getByRole("link", { name: "Volver al Inicio" })
  ).toBeFocused()
})
