import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-15: textos de src/tests/adminFlights/VuelosPage.form.test.tsx.
test("E2E-15 el super admin crea un vuelo: sale la confirmación, sube el conteo y el vuelo queda programado y sin tripulación", async ({
  page,
}) => {
  await loginAs(page, "admin")
  await goToSection(page, "Vuelos", "Vuelos")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  await expect(main.getByRole("button", { name: "Todos (8)" })).toBeVisible()

  await main.getByRole("button", { name: "Crear vuelo" }).click()
  const form = page.getByRole("dialog", { name: "Crear vuelo" })
  await form.getByLabel(/^Número de vuelo/).fill("DL1234")
  await form.getByLabel(/^Puerta/).fill("A12")
  await form.getByLabel(/^Origen/).selectOption("ATL")
  await form.getByLabel(/^Destino/).selectOption("BOS")
  await form.getByLabel(/^Fecha de salida/).fill("2030-04-10")
  await form.getByLabel(/^Hora de salida/).fill("08:00")
  // La llegada se propone sola: ATL → BOS ≈ 2 h 20 min.
  await expect(form.getByLabel(/^Fecha de llegada/)).toHaveValue("2030-04-10")
  await expect(form.getByLabel(/^Hora de llegada/)).toHaveValue("10:20")
  await form.getByLabel(/^Fecha de llegada/).fill("2030-04-10")
  await form.getByLabel(/^Hora de llegada/).fill("10:30")
  await form
    .getByLabel(/^Aeronave/)
    .selectOption({ label: "N122DU · Airbus A220-300 · 130 sillas" })
  await expect(form.getByText("Duración: 2 h 30 min")).toBeVisible()
  await form.getByRole("button", { name: "Crear vuelo" }).click()

  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Vuelo DL1234 creado" })
  await expect(toast).toContainText(
    "Ya aparece en Programación para que el supervisor asigne la tripulación."
  )
  await expect(form).toBeHidden()
  await expect(main.getByRole("button", { name: "Todos (9)" })).toBeVisible()

  await main.getByRole("searchbox", { name: "Buscar vuelo" }).fill("DL1234")
  const fila = main.getByRole("row").filter({ hasText: "DL1234" })
  await expect(fila).toContainText("10 abr · 08:00 → 10:30")
  await expect(fila).toContainText("Sin asignar")
  await expect(fila).toContainText("Programado")
})
