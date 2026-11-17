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

// E2E-12: textos de src/tests/users/UsuariosPage.createUser.test.tsx.
test("E2E-12 el super admin añade una comandante: sale la confirmación, aparece en la tabla y sube el conteo", async ({
  page,
}) => {
  await loginAs(page, "admin")
  await goToSection(page, "Usuarios", "Usuarios")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  await expect(main.getByRole("button", { name: "Todos (184)" })).toBeVisible()

  await main.getByRole("button", { name: "Añadir usuario" }).click()
  const form = page.getByRole("dialog", { name: "Añadir usuario" })
  await form.getByLabel(/^Nombres/).fill("Laura")
  await form.getByLabel(/^Apellidos/).fill("Gómez")
  await form.getByLabel(/^Correo/).fill("laura.gomez@aircrew-ops.com")
  await form.getByLabel(/^Celular/).fill("404 555 0123")
  await form.getByLabel(/^Rol/).selectOption("tripulacion")
  await form.getByLabel(/^Cargo/).selectOption("Comandante")
  await form.getByLabel(/^Base/).selectOption("ATL")
  await form.getByLabel(/^Número de licencia/).fill("FAA ATP #7001-US")
  for (const certificado of [
    "Airline Transport Pilot (ATP)",
    "Instrument Rating (IR)",
    "Multi-Engine (ME)",
  ]) {
    await marcarChip(form.getByRole("checkbox", { name: certificado }))
  }
  await form.getByRole("button", { name: "Crear usuario" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Usuario creado" })
  await expect(toast).toContainText(
    "Laura Gómez quedó registrado con el ID AC-6001."
  )
  await expect(form).toBeHidden()
  await expect(main.getByRole("button", { name: "Todos (185)" })).toBeVisible()

  await main.getByRole("searchbox", { name: "Buscar usuario" }).fill("Laura")
  const fila = main.getByRole("row").filter({ hasText: "Laura Gómez" })
  await expect(fila).toContainText("AC-6001")
  await expect(fila).toContainText("Comandante")
})
