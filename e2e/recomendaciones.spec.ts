import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-04: textos de la spec recomendaciones-supervisor (RS-06, RS-07) y de
// src/tests/recommendations/RecomendacionesPage.test.tsx.
test("E2E-04 el supervisor aprueba el primer candidato de la primera solicitud: sale el toast y la solicitud deja la cola", async ({
  page,
}) => {
  await loginAs(page, "supervisor")
  await goToSection(page, "Recomendaciones", "Recomendaciones de Reemplazo")
  await waitForLoaded(page)
  const main = page.getByRole("main")

  await expect(
    main.getByRole("heading", { level: 2, name: "Pendientes (5)" })
  ).toBeVisible()
  const primera = main.getByRole("tab").first()
  await expect(primera).toContainText("AV-9344")
  await expect(primera).toHaveAttribute("aria-selected", "true")

  const candidato = main.getByRole("article", { name: "Juan Pablo Navarro" })
  await candidato.getByRole("button", { name: "Confirmar asignación" }).click()
  const dialogo = page.getByRole("alertdialog", {
    name: "Confirmar asignación",
  })
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole("button", { name: "Asignar" }).click()

  await expect(dialogo).toBeHidden()
  const toast = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: "Juan Pablo Navarro asignado al vuelo AV-9344" })
  await expect(toast).toBeVisible()
  await expect(toast).toContainText("Se notificó al tripulante.")

  // Estado de decidida (RS-07): sale de la cola y la siguiente queda seleccionada.
  await expect(
    main.getByRole("heading", { level: 2, name: "Pendientes (4)" })
  ).toBeVisible()
  await expect(main.getByRole("tab")).toHaveCount(4)
  await expect(
    main.getByRole("tab").filter({ hasText: "AV-9344" })
  ).toHaveCount(0)
  const siguiente = main.getByRole("tab").filter({ hasText: "AV-8120" })
  await expect(siguiente).toHaveAttribute("aria-selected", "true")
  await expect(siguiente).toBeFocused()
  await expect(main.getByRole("article", { name: "Laura Gómez" })).toBeVisible()
})
