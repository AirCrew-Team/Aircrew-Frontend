import { expect, test, type Page } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { goToSection, waitForLoaded } from "./support/navigation.ts"

// E2E-07: textos de la spec tripulacion-supervisor (TC-10, TC-18) y de
// src/tests/shiftCrew/TripulacionPage.test.tsx.
const GUARDIA = [
  "Camila Herrera",
  "Juan Pablo Navarro",
  "Felipe Vargas",
  "Diego Ruiz",
  "Sebastián Castro",
  "Laura Gómez",
  "Valentina Ortiz",
  "Mateo Morales",
  "Carlos Mejía",
  "Ricardo Peña",
  "Andrés Restrepo",
  "Simón Echeverri",
]
const AV_4021 = [
  "Héctor Bermúdez",
  "Paola Jiménez",
  "Gabriela Torres",
  "Esteban Molina",
]

const openTripulacion = async (page: Page) => {
  await loginAs(page, "supervisor")
  await goToSection(page, "Tripulación", "Tripulación")
  await waitForLoaded(page)
  const main = page.getByRole("main")
  return {
    main,
    lista: main.getByRole("list", { name: "Tripulantes del turno" }),
    filtros: main.getByRole("group", { name: "Filtrar por estado" }),
    buscador: main.getByRole("searchbox", {
      name: "Buscar tripulante o vuelo",
    }),
  }
}

test("E2E-07 con el filtro «De guardia (12)» la lista muestra solo a los 12 tripulantes de guardia", async ({
  page,
}) => {
  const { main, lista, filtros } = await openTripulacion(page)
  const deGuardia = filtros.getByRole("button", { name: "De guardia (12)" })

  await deGuardia.click()

  await expect(deGuardia).toHaveAttribute("aria-pressed", "true")
  const tarjetas = lista.getByRole("article")
  await expect(tarjetas).toHaveCount(GUARDIA.length)
  for (const nombre of GUARDIA) {
    const tarjeta = lista.getByRole("article", { name: nombre, exact: true })
    await expect(tarjeta).toBeVisible()
    await expect(tarjeta).toContainText("De guardia")
  }
  await expect(main.getByRole("status")).toHaveText("12 tripulantes")
})

test("E2E-07 al buscar el vuelo «AV-4021» aparecen los 4 tripulantes que lo operan", async ({
  page,
}) => {
  const { main, lista, buscador } = await openTripulacion(page)

  await buscador.fill("AV-4021")

  const tarjetas = lista.getByRole("article")
  await expect(tarjetas).toHaveCount(AV_4021.length)
  for (const nombre of AV_4021) {
    const tarjeta = lista.getByRole("article", { name: nombre, exact: true })
    await expect(tarjeta).toBeVisible()
    await expect(tarjeta).toContainText("AV-4021")
  }
  await expect(main.getByRole("status")).toHaveText("4 tripulantes")
})
