import { expect, test } from "@playwright/test"

import { CUENTAS, loginAs } from "./support/auth.ts"

// E2E-10 (solo móvil, Pixel 7): el menú del navbar se abre con «Abrir menú» y navega.
test("E2E-10 en móvil, el supervisor abre el menú del navbar y va a Ausencias: cambia el h1 @solo-movil", async ({
  page,
}) => {
  await loginAs(page, "supervisor")
  const abrir = page.getByRole("button", { name: "Abrir menú" })
  const nav = page.getByRole("navigation", { name: "Navegación principal" })
  // Por debajo de lg el menú horizontal está oculto: solo se llega abriendo el panel.
  await expect(nav).toBeHidden()
  await expect(abrir).toHaveAttribute("aria-expanded", "false")

  await abrir.click()

  const cerrar = page.getByRole("button", { name: "Cerrar menú" })
  await expect(cerrar).toHaveAttribute("aria-expanded", "true")
  await expect(nav).toBeVisible()
  await nav.getByRole("link", { name: "Ausencias", exact: true }).click()

  await expect(page).toHaveURL("/supervisor/ausencias")
  await expect(
    page.getByRole("heading", { level: 1, name: "Ausencias" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 1, name: CUENTAS.supervisor.h1 })
  ).toHaveCount(0)
  // Al navegar, el panel se cierra solo.
  await expect(nav).toBeHidden()
  await expect(abrir).toHaveAttribute("aria-expanded", "false")
})
