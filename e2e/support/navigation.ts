import { expect, type Locator, type Page } from "@playwright/test"

import { CUENTAS, type Rol } from "./auth.ts"

// Menú del navbar. En escritorio (lg+) está siempre a la vista; por debajo de lg se abre
// con «Abrir menú». El de escritorio está oculto con CSS en móvil, así que solo hay una
// «Navegación principal» accesible a la vez.
export async function openMainNav(page: Page): Promise<Locator> {
  const abrir = page.getByRole("button", { name: "Abrir menú" })
  if (await abrir.isVisible()) await abrir.click()
  const nav = page.getByRole("navigation", { name: "Navegación principal" })
  await expect(nav).toBeVisible()
  return nav
}

// Va a una sección del rol con el navbar (sin recargar: la sesión no sobrevive a page.goto).
export async function goToSection(page: Page, label: string, h1: string) {
  const nav = await openMainNav(page)
  await nav.getByRole("link", { name: label, exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible()
}

// Abre el menú de perfil del navbar.
export async function openProfileMenu(page: Page, rol: Rol) {
  await page
    .getByRole("button", {
      name: `Menú de perfil de ${CUENTAS[rol].displayName}`,
    })
    .click()
}

// Va a /configuracion desde el menú de perfil.
export async function goToConfiguracion(page: Page, rol: Rol) {
  await openProfileMenu(page, rol)
  await page.getByRole("menuitem", { name: "Configuración" }).click()
  await expect(page).toHaveURL("/configuracion")
}

// Navega con el router de la app sin recargar la página: React Router escucha popstate y
// vuelve a leer la URL. Sirve para escribir una ruta a mano conservando la sesión en memoria.
export async function navigateInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState(null, "", to)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, path)
}

// Espera a que no quede ningún estado de carga («Cargando…») en el contenido.
export async function waitForLoaded(page: Page) {
  await expect(
    page
      .getByRole("main")
      .getByRole("status")
      .filter({ hasText: /^Cargando/ })
  ).toHaveCount(0)
}
