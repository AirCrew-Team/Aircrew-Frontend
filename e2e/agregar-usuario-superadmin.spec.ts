import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-12: textos de src/tests/users/UsuariosPage.createUser.test.tsx. Cuenta demo: los
// datos son los de ejemplo (users.data.ts), sin backend.
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
  await form.getByRole("button", { name: "Crear usuario" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Usuario creado" })
  await expect(toast).toContainText(
    "Se envió un correo a laura.gomez@aircrew-ops.com para que Laura Gómez active la cuenta."
  )
  await expect(form).toBeHidden()
  await expect(main.getByRole("button", { name: "Todos (185)" })).toBeVisible()

  // Queda en la tabla con el código que asigna el backend y pendiente de activación.
  await main.getByRole("searchbox", { name: "Buscar usuario" }).fill("Laura")
  const fila = main.getByRole("row").filter({ hasText: "Laura Gómez" })
  await expect(fila).toContainText("AC-6001")
  await expect(fila).toContainText("Comandante")
  await expect(fila).toContainText("Pendiente de activación")
})
