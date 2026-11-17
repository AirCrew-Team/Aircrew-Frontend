import { expect, type Locator, type Page } from "@playwright/test"

import { goToSection } from "./navigation.ts"

// Programación del supervisor (spec programacion-supervisor). Las fechas del selector son
// «hoy + N» en fecha local, con las tablas propias de la spec (sin Intl ni punto).
//
// El reloj no se finge: page.clock.install() también simula setTimeout (la latencia de 400 ms
// y los toasts quedarían parados) y setFixedTime congela los relojes del navbar. En su lugar
// la etiqueta se calcula DENTRO del navegador con la misma cuenta que dayFromToday, así no
// importa la zona horaria de Node ni la de Chromium.
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const LONG_WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
]
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

// El ejemplo de la spec: AV-4021 sale el día hoy + 5.
export const HOY_MAS_5 = 5

export interface DayLabel {
  // «Hoy · mar» en el primero; «dom» en los demás.
  weekday: string
  // «22 nov».
  date: string
  // h2 de la lista: «Vuelos del domingo 22».
  heading: string
}

export async function dayLabel(page: Page, offset: number): Promise<DayLabel> {
  const { weekday, day, month } = await page.evaluate((days) => {
    const now = new Date()
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + days
    )
    return {
      weekday: date.getDay(),
      day: date.getDate(),
      month: date.getMonth(),
    }
  }, offset)
  return {
    weekday: offset === 0 ? `Hoy · ${WEEKDAYS[weekday]}` : WEEKDAYS[weekday],
    date: `${day} ${MONTHS[month]}`,
    heading: `Vuelos del ${LONG_WEEKDAYS[weekday]} ${day}`,
  }
}

export const H1 = "Programación"

export const dayGroup = (page: Page) =>
  page.getByRole("main").getByRole("group", { name: "Día" })

export const dayButtons = (page: Page) => dayGroup(page).getByRole("button")

// Pestaña de un vuelo en la lista (por su número; el nombre accesible junta los spans).
export const flightTab = (page: Page, flight: string) =>
  page.getByRole("main").getByRole("tab").filter({ hasText: flight })

// La ficha del vuelo seleccionado.
export const flightPanel = (page: Page) =>
  page.getByRole("main").getByRole("tabpanel")

// Fila (li) de un puesto, por uno de sus botones («Cambiar Capitán», «Asignar TCP 3»…).
export const slotRow = (panel: Locator, buttonName: string) =>
  panel.getByRole("listitem").filter({
    has: panel.page().getByRole("button", { name: buttonName, exact: true }),
  })

// Un toast de sonner, por su texto.
export const toast = (page: Page, text: string) =>
  page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: text })

export async function goToProgramacion(page: Page) {
  await goToSection(page, H1, H1)
  await expect(page).toHaveURL("/supervisor/programacion")
}

// Pulsa el día hoy + offset y espera su h2.
export async function selectDay(page: Page, offset: number) {
  const label = await dayLabel(page, offset)
  const button = dayButtons(page).nth(offset)
  await expect(button).toContainText(label.weekday)
  await expect(button).toContainText(label.date)
  await button.click()
  await expect(button).toHaveAttribute("aria-pressed", "true")
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 2, name: label.heading, exact: true })
  ).toBeVisible()
  return label
}

// Programación en el día hoy + 5 con AV-4021 seleccionado (primer vuelo por completar).
export async function openAV4021(page: Page) {
  await goToProgramacion(page)
  const label = await selectDay(page, HOY_MAS_5)
  await expect(flightTab(page, "AV-4021")).toHaveAttribute(
    "aria-selected",
    "true"
  )
  const panel = flightPanel(page)
  await expect(
    panel.getByRole("heading", {
      level: 2,
      name: "AV-4021 · Bogotá (BOG) → Cartagena (CTG)",
    })
  ).toBeVisible()
  return { label, panel }
}
