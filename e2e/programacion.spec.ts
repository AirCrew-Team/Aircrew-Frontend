import { expect, test } from "@playwright/test"

import { loginAs } from "./support/auth.ts"
import { waitForLoaded } from "./support/navigation.ts"
import {
  dayButtons,
  dayGroup,
  dayLabel,
  flightTab,
  goToProgramacion,
  HOY_MAS_5,
  openAV4021,
  slotRow,
  toast,
} from "./support/programacion.ts"

// PG-16 (spec programacion-supervisor): completar AV-4021 en escritorio y el selector de día en
// móvil. Los datos simulados viven en memoria y se reinician con cada página nueva, así que
// cada prueba (y cada repetición) empieza con AV-4021 en 3 de 6.

const SUMMARY = (family: string, hours: number) =>
  `Habilitado en ${family} · ${hours} h de 90 este mes · descanso cumplido`
const RATIONALE = (hours: number) =>
  `Cumple todas las reglas y es quien tiene más margen de horas este mes (${hours} h de 90).`

test("PG-16 el supervisor completa AV-4021 desde el menú: asigna a mano al Primer Oficial, la IA sugiere los 2 puestos restantes y confirma la tripulación", async ({
  page,
}) => {
  await loginAs(page, "supervisor")
  const { panel } = await openAV4021(page)
  const tab = flightTab(page, "AV-4021")
  await expect(panel.getByText("3 de 6 puestos", { exact: true })).toBeVisible()

  // 1. Asignar a mano a Sebastián Castro como Primer Oficial (PG-05, PG-06).
  await panel
    .getByRole("button", { name: "Asignar Primer Oficial", exact: true })
    .click()
  await expect(
    panel.getByText("3 cumplen las reglas", { exact: true })
  ).toBeVisible()
  await panel
    .getByRole("button", {
      name: "Asignar a Sebastián Castro como Primer Oficial",
    })
    .click()

  const cambiarPrimerOficial = panel.getByRole("button", {
    name: "Cambiar Primer Oficial",
    exact: true,
  })
  await expect(cambiarPrimerOficial).toBeFocused()
  const primerOficial = slotRow(panel, "Cambiar Primer Oficial")
  await expect(primerOficial).toContainText("Sebastián Castro")
  await expect(primerOficial).toContainText(SUMMARY("A320", 48))
  await expect(primerOficial).not.toContainText("Sugerido por la IA")
  // La lista de candidatos se cerró (la tarjeta de la IA también dice «cumplen las reglas»).
  await expect(
    panel.getByText(/^(\d+ cumplen|1 cumple) las reglas$/)
  ).toHaveCount(0)
  await expect(
    panel.getByRole("button", { name: /^Ocultar candidatos/ })
  ).toHaveCount(0)
  await expect(panel.getByText("4 de 6 puestos", { exact: true })).toBeVisible()
  await expect(tab).toContainText("4 de 6")

  // 2. La IA sugiere los 2 puestos vacíos: Capitán y TCP 3 (PG-08).
  await panel
    .getByRole("button", { name: "Sugerir para 2 puestos", exact: true })
    .click()

  await expect(
    toast(page, "La IA sugirió 2 tripulantes para AV-4021")
  ).toBeVisible()
  await expect(
    panel.getByRole("button", { name: "Cambiar Capitán", exact: true })
  ).toBeFocused()
  await expect(panel.getByText("Sugerido por la IA")).toHaveCount(2)

  const capitan = slotRow(panel, "Cambiar Capitán")
  await expect(capitan).toContainText("Andrés Valencia")
  await expect(capitan).toContainText("Sugerido por la IA")
  await expect(capitan).toContainText(RATIONALE(62))

  const tcp3 = slotRow(panel, "Cambiar TCP 3")
  await expect(tcp3).toContainText("Daniela Torres")
  await expect(tcp3).toContainText("Sugerido por la IA")
  await expect(tcp3).toContainText(RATIONALE(40))

  await expect(panel.getByText("6 de 6 puestos", { exact: true })).toBeVisible()
  await expect(tab).toContainText("Lista para confirmar")
  await expect(
    panel.getByRole("button", { name: /^Sugerir para/ })
  ).toHaveCount(0)
  await expect(panel).toContainText(
    "Tripulación completa. Al confirmar se avisará a los 6 tripulantes."
  )

  // 3. Confirmar la tripulación (PG-09, PG-12).
  const confirmar = panel.getByRole("button", {
    name: "Confirmar tripulación",
  })
  await expect(confirmar).toBeEnabled()
  await confirmar.click()

  const confirmada = toast(page, "Tripulación confirmada para AV-4021")
  await expect(confirmada).toBeVisible()
  await expect(confirmada).toContainText("Se avisó a los 6 tripulantes.")

  const persistente = panel.getByText(
    "Tripulación confirmada. Se avisó a los 6 tripulantes.",
    { exact: true }
  )
  await expect(persistente).toBeVisible()
  await expect(persistente).toBeFocused()
  // Solo lectura: sin botones de acción en la ficha.
  await expect(
    panel.getByRole("button", {
      name: /^(Asignar|Cambiar|Quitar|Ocultar candidatos|Sugerir|Confirmar tripulación)/,
    })
  ).toHaveCount(0)

  await expect(tab).toContainText("Confirmada")
  await expect(tab).not.toContainText(/\d+ de \d+/)
  await expect(dayButtons(page).nth(HOY_MAS_5)).toContainText(
    "6 vuelos · 2 por completar"
  )
})

// En el móvil emulado (Pixel 7) el grupo «Día» es una fila con scroll horizontal; desde lg es
// una rejilla de 7 columnas sin scroll, por eso esta prueba va solo en el proyecto «movil».
test("PG-16 en móvil, el selector de 7 días hace scroll horizontal sin desbordar la página: el día pulsado se ve y se llega al último @solo-movil", async ({
  page,
}) => {
  await loginAs(page, "supervisor")
  await goToProgramacion(page)
  const group = dayGroup(page)
  const buttons = dayButtons(page)
  await expect(buttons).toHaveCount(7)
  // Con los resúmenes ya cargados (cambian el ancho de los botones).
  await waitForLoaded(page)
  await expect(buttons.first()).toContainText(/vuelos · /)

  const pageFits = () =>
    page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))

  // La página no se desborda: el scroll queda dentro del grupo.
  await expect(async () => {
    const { scrollWidth, innerWidth } = await pageFits()
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  }).toPass({ timeout: 2_000 })
  const groupScroll = await group.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
  }))
  expect(groupScroll.overflowX).toBe("auto")
  expect(
    groupScroll.scrollWidth,
    "los 7 días no caben: el grupo tiene scroll horizontal"
  ).toBeGreaterThan(groupScroll.clientWidth)

  // El último día empieza fuera de la vista.
  const last = buttons.nth(6)
  await expect(last).not.toBeInViewport()

  // El día hoy + 5 se pulsa (Playwright lo desplaza a la vista) y se sigue viendo entero.
  const domingo = await dayLabel(page, HOY_MAS_5)
  const target = buttons.nth(HOY_MAS_5)
  await target.click()
  await expect(target).toHaveAttribute("aria-pressed", "true")
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 2, name: domingo.heading, exact: true })
  ).toBeVisible()
  await expect(target).toBeInViewport({ ratio: 1 })

  // Se llega al último día deslizando el grupo.
  await group.hover()
  await page.mouse.wheel(1_000, 0)
  await expect(last).toBeInViewport({ ratio: 1 })
  const ultimo = await dayLabel(page, 6)
  await last.click()
  await expect(last).toHaveAttribute("aria-pressed", "true")
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 2, name: ultimo.heading, exact: true })
  ).toBeVisible()

  const { scrollWidth, innerWidth } = await pageFits()
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})
