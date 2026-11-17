import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-13: textos de src/tests/aircraft/AeronavesPage.test.tsx.

// PNG válido de 1×1 px, generado en la prueba (no hay archivos de prueba en el repo).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

test("E2E-13 el super admin registra una aeronave con su foto: sale la confirmación, queda primera en la tabla y sube el total @movil", async ({
  page,
}) => {
  await loginAs(page, "admin")
  await goToSection(page, "Aeronaves", "Aeronaves")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  await expect(main.getByRole("button", { name: "Todas (18)" })).toBeVisible()

  await main.getByRole("button", { name: "Registrar Aeronave" }).click()
  const form = page.getByRole("dialog", { name: "Registrar aeronave" })
  // Sin foto elegida solo se ve el espacio vacío.
  await expect(form.getByText("Sin foto")).toBeVisible()
  await form.getByLabel("Subir foto").setInputFiles({
    name: "n402dx.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  })
  // Vista previa real (jsdom no la puede probar): la imagen carga y se ve.
  const foto = form.getByRole("img", { name: "Foto de la aeronave" })
  await expect
    .poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  await form.getByLabel(/^Matrícula/).fill("n402dx")
  await form.getByLabel(/^Número de serie/).fill("2041")
  await form.getByLabel(/^Año de fabricación/).fill("2020")
  await form.getByLabel(/^En la flota desde/).fill("2021-03-15")
  await form.getByLabel(/^Modelo/).selectOption("a330neo")
  await form.getByLabel(/^Base principal/).selectOption("SEA")
  await form.getByRole("button", { name: "Registrar aeronave" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Aeronave registrada" })
  await expect(toast).toContainText(
    "N402DX quedó en la flota con base en Seattle (SEA)."
  )
  await expect(form).toBeHidden()
  // La matrícula se guarda en mayúsculas y la aeronave queda primera.
  const fila = main.getByRole("row").nth(1)
  await expect(fila).toContainText("N402DX")
  await expect(fila).toContainText("Airbus A330-900neo")
  await expect(fila).toContainText("Operativa")
  await expect(main.getByRole("button", { name: "Todas (19)" })).toBeVisible()
})
