import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-06 (solo escritorio): el scroll de cada columna muestra 2 tarjetas completas.
// Textos de la spec ausencias-supervisor (AS-05, AS-06, AS-20) y de
// src/tests/absenceTracking/AusenciasPage.test.tsx.
const TOLERANCIA = 2

test("E2E-06 en «Por aprobar (7)» se ven completas las 2 primeras tarjetas, la 3.ª queda fuera o cortada, el área tiene scroll y «Ver 2 más» añade tarjetas", async ({
  page,
}) => {
  await loginAs(page, "supervisor")
  await goToSection(page, "Ausencias", "Ausencias")
  await waitForLoaded(page)

  const columna = page
    .getByRole("main")
    .getByRole("region", { name: "Por aprobar (7)", exact: true })
  const lista = columna.getByRole("list")
  await expect(lista.getByRole("listitem")).toHaveCount(5)

  // La zona con scroll no tiene rol: es el padre de la lista. Las medidas no reintentan
  // solas, y el alto lo pone un efecto tras medir las tarjetas: se repite hasta que cuadre.
  await expect(async () => {
    const medidas = await lista.evaluate((ul) => {
      const area = ul.parentElement as HTMLElement
      const [, segunda, tercera] = Array.from(ul.children)
      return {
        areaBottom: area.getBoundingClientRect().bottom,
        segundaBottom: segunda.getBoundingClientRect().bottom,
        terceraBottom: tercera.getBoundingClientRect().bottom,
        scrollHeight: area.scrollHeight,
        clientHeight: area.clientHeight,
      }
    })
    expect(
      medidas.segundaBottom,
      "la 2.ª tarjeta se ve completa"
    ).toBeLessThanOrEqual(medidas.areaBottom + TOLERANCIA)
    expect(
      medidas.terceraBottom,
      "la 3.ª tarjeta queda fuera o cortada"
    ).toBeGreaterThan(medidas.areaBottom + TOLERANCIA)
    expect(medidas.scrollHeight, "el área tiene scroll").toBeGreaterThan(
      medidas.clientHeight
    )
  }).toPass()

  const verMas = columna.getByRole("button", {
    name: "Ver 2 más de Por aprobar",
  })
  await expect(verMas).toHaveText("Ver 2 más")
  await expect(columna.getByText("Mostrando 5 de 7")).toBeVisible()
  await verMas.click()

  await expect(lista.getByRole("listitem")).toHaveCount(7)
  await expect(columna.getByText("Mostrando 7 de 7")).toBeVisible()
  await expect(
    columna.getByRole("button", { name: "Mostrar menos de Por aprobar" })
  ).toBeVisible()
})
