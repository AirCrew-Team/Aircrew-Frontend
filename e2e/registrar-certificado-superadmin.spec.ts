import { expect, test, type Locator } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// Los certificados son chips: la casilla real está oculta a la vista (sr-only) dentro de
// su etiqueta, que es lo que se ve y se pulsa. Se pulsa el chip, como haría una persona,
// y se comprueba que la casilla quedó marcada.
const marcarChip = async (casilla: Locator) => {
  await casilla.locator("xpath=..").click()
  await expect(casilla).toBeChecked()
}

// E2E-14: textos de src/tests/certifications/AdminCertificacionesPage.forms.test.tsx.
test("E2E-14 el super admin registra y verifica el certificado de un copiloto: sale la confirmación, la tabla lo muestra verificado y sube el conteo", async ({
  page,
}) => {
  await loginAs(page, "admin")
  await goToSection(page, "Certificaciones", "Certificaciones")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  await expect(
    main.getByRole("button", { name: "Verificados (4)" })
  ).toBeVisible()

  await main.getByRole("button", { name: "Registrar certificado" }).click()
  const form = page.getByRole("dialog", { name: "Registrar certificado" })
  // Solo se ofrecen los tripulantes sin certificado.
  await form.getByLabel(/^Tripulante/).selectOption("AC-4455")
  await form.getByLabel(/^Número de certificado/).fill("5550123")
  await marcarChip(
    form.getByRole("checkbox", { name: "Commercial Pilot (CPL)" })
  )
  await marcarChip(form.getByRole("checkbox", { name: "Multi-Engine (ME)" }))
  await form
    .getByRole("checkbox", {
      name: "Confirmo que los datos coinciden con la FAA",
    })
    .check()
  await form.getByRole("button", { name: "Guardar y verificar" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Certificado verificado" })
  await expect(toast).toContainText(
    "La certificación de Daniel Herrera quedó verificada."
  )
  await expect(form).toBeHidden()
  await expect(
    main.getByRole("button", { name: "Verificados (5)" })
  ).toBeVisible()

  await main
    .getByRole("searchbox", { name: "Buscar certificación" })
    .fill("Daniel")
  const fila = main.getByRole("row").filter({ hasText: "Daniel Herrera" })
  await expect(fila).toContainText("5550123")
  await expect(fila).toContainText("Verificado")
})
