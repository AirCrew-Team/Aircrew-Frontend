import { expect, test } from "@playwright/test"

import { CUENTAS, loginAs, submitLogin, type Rol } from "./support/auth.ts"
import {
  navigateInApp,
  openMainNav,
  openProfileMenu,
  profileButton,
} from "./support/navigation.ts"

// Spec e2e-playwright: E2E-01 (login por rol, en móvil), E2E-02 (credenciales incorrectas)
// y E2E-03 (protección por rol). Menús de NAV_ITEMS_BY_ROLE (spec navbar-rutas-por-rol).
const MENU: Record<Rol, string[]> = {
  tripulante: ["Inicio", "Mis Vuelos", "Certificaciones", "Reportar Ausencia"],
  supervisor: ["Inicio", "Recomendaciones", "Tripulación", "Ausencias"],
  admin: ["Inicio", "Usuarios", "Aeronaves", "Certificaciones"],
}

test.describe("E2E-01 Login por rol", () => {
  for (const rol of Object.keys(CUENTAS) as Rol[]) {
    test(`E2E-01 la cuenta de ${rol} llega a ${CUENTAS[rol].inicio}, ve solo su menú y al cerrar sesión vuelve a /login @movil`, async ({
      page,
    }) => {
      await loginAs(page, rol)
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)

      const nav = await openMainNav(page)
      await expect(nav.getByRole("link")).toHaveText(MENU[rol])

      await openProfileMenu(page, rol)
      await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
      await expect(page).toHaveURL("/login")
      await expect(
        page.getByRole("heading", { level: 1, name: "Bienvenido de nuevo" })
      ).toBeVisible()
    })
  }
})

// FX-03 (spec fix-e2e-hallazgos): el toast de bienvenida sale debajo del navbar. Antes
// tapaba el botón del perfil (y en móvil todo el navbar) durante sus 4,5 s, y el clic
// esperaba a que se fuera. El clic tiene un plazo corto y el toast debe seguir a la vista
// después: si lo tapara, el clic agotaría el plazo o solo saldría tras irse el toast.
test("E2E-01 (FX-03) justo después de entrar, el botón del perfil se puede pulsar con el toast de bienvenida a la vista, sin solaparse con el navbar @movil", async ({
  page,
}) => {
  const cuenta = CUENTAS.tripulante
  await loginAs(page, "tripulante")
  const bienvenida = page
    .getByRole("region", { name: /Notificaciones/ })
    .getByRole("listitem")
    .filter({ hasText: `Bienvenido a AirCrew, ${cuenta.rolLabel}.` })
  const navbar = page.getByRole("banner")
  await expect(bienvenida).toBeVisible()

  // Las cajas no se cortan en vertical: el toast empieza bajo el borde inferior del navbar.
  // toPass: sonner lo hace entrar deslizándose desde arriba.
  await expect(async () => {
    const toastBox = await bienvenida.boundingBox()
    const navbarBox = await navbar.boundingBox()
    expect(toastBox, "caja del toast").not.toBeNull()
    expect(navbarBox, "caja del navbar").not.toBeNull()
    expect(toastBox!.y).toBeGreaterThanOrEqual(navbarBox!.y + navbarBox!.height)
  }).toPass({ timeout: 2_000 })

  await profileButton(page, "tripulante").click({ timeout: 1_500 })

  await expect(
    page.getByRole("menuitem", { name: "Configuración" })
  ).toBeVisible()
  await expect(bienvenida).toBeVisible()
})

test("E2E-02 con una contraseña errónea aparece el error del Login y se sigue en /login", async ({
  page,
}) => {
  await submitLogin(page, CUENTAS.tripulante.email, "clave-incorrecta")

  await expect(page.getByRole("alert")).toHaveText(
    "Correo o contraseña incorrectos."
  )
  await expect(page).toHaveURL("/login")
  await expect(page.getByRole("textbox", { name: "Correo" })).toBeVisible()
})

test.describe("E2E-03 Protección por rol", () => {
  test("E2E-03 sin sesión, /supervisor/ausencias lleva a /login", async ({
    page,
  }) => {
    await page.goto("/supervisor/ausencias")

    await expect(page).toHaveURL("/login")
    await expect(
      page.getByRole("heading", { level: 1, name: "Bienvenido de nuevo" })
    ).toBeVisible()
  })

  test("E2E-03 con sesión de tripulante, /supervisor/ausencias lleva al Inicio del tripulante", async ({
    page,
  }) => {
    await loginAs(page, "tripulante")

    // page.goto recargaría la app y perdería la sesión (iría a /login): se cambia la URL
    // con el router de la app, como si el usuario la abriera desde un enlace interno.
    await navigateInApp(page, "/supervisor/ausencias")

    await expect(page).toHaveURL(CUENTAS.tripulante.inicio)
    await expect(
      page.getByRole("heading", { level: 1, name: CUENTAS.tripulante.h1 })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 1, name: "Ausencias" })
    ).toHaveCount(0)
  })
})
