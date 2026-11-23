import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page, type Route } from "@playwright/test"

import { CUENTAS, loginAs, type Rol } from "./support/auth.ts"
import { goToConfiguracion, waitForLoaded } from "./support/navigation.ts"

// E2E-08 (spec configuracion-real, «Cuentas demo» y CF-07): las cuentas demo no tienen
// backend. Ven la misma pantalla que las reales, con el nombre y el rol del auth store,
// un aviso fijo de demostración, todo deshabilitado, ninguna petición a la API y ningún
// dato inventado.
// E2E-08R: con una sesión real y el backend simulado con page.route, la foto carga de
// verdad, el foco tras cambiar la contraseña, el ojo y axe con el panel abierto. Guardar
// y los errores los cubren los tests de Vitest con MSW (src/tests/profile).

const H1 = "Mi perfil y configuración"
const AVISO_DEMO =
  "Cuenta de demostración: inicia sesión con una cuenta real para ver y guardar tus datos."

// Interruptores de notificaciones de cada rol. El admin no tiene (Ampliación B, CF-13).
const INTERRUPTORES: Record<Rol, string[]> = {
  tripulante: ["Asignación de reemplazo"],
  supervisor: ["Nuevas ausencias reportadas", "Ausencias cubiertas"],
  admin: [],
}

// Textos inventados de las pantallas anteriores (CF-01) y datos de ejemplo.
const INVENTADOS = [
  "FDP",
  "Atlanta",
  "FAA",
  "SMS",
  "RAC 121",
  "Turno",
  "aircrew-ops.com",
  "El Dorado",
  "310 445 8899",
  "315 220 1478",
  "300 118 9032",
]

// Cuenta las peticiones a la API desde que se llama (después del login: /login pide
// /auth/me al cargar, y eso no es de Configuración).
const contarPeticionesApi = (page: Page) => {
  const peticiones: string[] = []
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      peticiones.push(`${request.method()} ${request.url()}`)
    }
  })
  return peticiones
}

const abrirConfiguracionDemo = async (page: Page, rol: Rol) => {
  await loginAs(page, rol)
  const peticiones = contarPeticionesApi(page)
  await goToConfiguracion(page, rol)
  await expect(page.getByRole("heading", { level: 1, name: H1 })).toBeVisible()
  const main = page.getByRole("main")
  await expect(main.getByText(AVISO_DEMO, { exact: true })).toBeVisible()
  return { main, peticiones }
}

test.describe("E2E-08 Configuración con cuentas demo", () => {
  for (const rol of ["tripulante", "supervisor", "admin"] as const) {
    test(`E2E-08 con ${rol}: aviso de demostración, su nombre, todo deshabilitado y ninguna petición @movil`, async ({
      page,
    }) => {
      const { main, peticiones } = await abrirConfiguracionDemo(page, rol)

      // Nombre y rol del auth store.
      await expect(
        main.getByText(CUENTAS[rol].fullName, { exact: true })
      ).toBeVisible()
      await expect(
        main.getByText(CUENTAS[rol].rolLabel, { exact: true })
      ).toBeVisible()

      // Campos, interruptores, foto y botones deshabilitados.
      await expect(main.getByLabel(/^Celular/)).toBeDisabled()
      await expect(main.getByLabel(/^Ciudad de residencia/)).toBeDisabled()
      for (const nombre of INTERRUPTORES[rol]) {
        await expect(
          main.getByRole("switch", { name: nombre, exact: true })
        ).toBeDisabled()
      }
      // Sin interruptores, tampoco el bloque «Notificaciones» (CF-13).
      if (INTERRUPTORES[rol].length === 0) {
        await expect(main.getByRole("switch")).toHaveCount(0)
        await expect(
          main.getByRole("heading", { name: /Notificaciones/ })
        ).toHaveCount(0)
      }
      await expect(main.getByLabel(/^Subir foto/)).toBeDisabled()
      await expect(
        main.getByRole("button", { name: "Guardar cambios", exact: true })
      ).toBeDisabled()
      await expect(
        main.getByRole("button", { name: "Cambiar contraseña", exact: true })
      ).toBeDisabled()

      // Ningún dato inventado: campos vacíos y sin textos de ejemplo.
      await expect(main.getByLabel(/^Correo/)).toHaveValue("")
      await expect(main.getByLabel(/^Celular/)).toHaveValue("")
      await expect(main.getByLabel(/^Ciudad de residencia/)).toHaveValue("")
      const texto = (await main.textContent()) ?? ""
      for (const inventado of INVENTADOS) {
        expect(texto, `no debe aparecer «${inventado}»`).not.toContain(
          inventado
        )
      }
      expect(texto).not.toMatch(/hace \d+ días/)

      // Ninguna petición a la API desde que se entró a Configuración.
      expect(peticiones).toEqual([])
    })
  }
})

// --- Sesión real con el backend simulado (page.route) ---

// La app (vite preview en :4173) llama al gateway de VITE_URL_API_BACKEND con la cookie:
// las respuestas simuladas llevan CORS con credenciales.
const ORIGEN = "http://localhost:4173"
const CORS = {
  "Access-Control-Allow-Origin": ORIGEN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// PNG válido de 1×1 px (el mismo de los mocks de Vitest).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

const TRIPULANTE_REAL = {
  id: "u-e2e-crew-1",
  name: "Laura Méndez Ríos",
  email: "laura.mendez@aircrew.test",
  role: "crew",
}

// Datos de prueba sin aspecto de secreto (Gitleaks): derivados de una palabra simple.
const PALABRA = "Bitacora"
const ACTUAL = `${PALABRA}#2026ok`
const NUEVA = `${PALABRA}#2027ok`

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, headers: CORS, json: body })

// Responde el preflight de CORS (PATCH y POST con JSON) si llega a la ruta.
const esPreflight = async (route: Route) => {
  if (route.request().method() !== "OPTIONS") return false
  await route.fulfill({ status: 204, headers: CORS })
  return true
}

// Simula el backend de una cuenta real de tripulante. El comodín se registra primero
// (Playwright prueba las rutas en orden inverso al registro): lo que no se simula se
// aborta y nada llega a un backend real.
const simularBackend = async (page: Page) => {
  const perfil = {
    ...TRIPULANTE_REAL,
    is_active: true,
    created_at: "2026-03-15T15:00:00.000Z",
    phone: "+573001234567",
    residence: "Miami, FL",
    password_changed_at: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000
    ).toISOString(),
    photo_updated_at: "2026-11-10T08:30:00.000Z",
    notifications: { replacement_assigned: false },
    // Ampliación A1: solo el supervisor tiene datos laborales en la cuenta.
    employment: null,
  }

  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/admin/auth/me", async (route) => {
    if (await esPreflight(route)) return
    await json(route, TRIPULANTE_REAL)
  })
  await page.route("**/api/crew/crew-members/me", async (route) => {
    if (await esPreflight(route)) return
    await json(route, {
      employee_code: "EMP-100",
      position: "Auxiliar de vuelo",
      current_location: "MDE",
      status: "on_duty",
      created_at: "2026-11-18T12:00:00.000Z",
    })
  })
  // Ampliación A2: catálogo de ciudades de EE. UU. del <datalist> de la residencia.
  await page.route("**/api/admin/catalogs/us-cities", async (route) => {
    if (await esPreflight(route)) return
    await json(route, ["Atlanta, GA", "Boston, MA", "Miami, FL", "Seattle, WA"])
  })
  await page.route("**/api/admin/users/me", async (route) => {
    if (await esPreflight(route)) return
    if (route.request().method() === "PATCH") {
      Object.assign(perfil, route.request().postDataJSON())
    }
    await json(route, perfil)
  })
  await page.route("**/api/admin/auth/change-password", async (route) => {
    if (await esPreflight(route)) return
    perfil.password_changed_at = new Date().toISOString()
    await json(route, { password_changed_at: perfil.password_changed_at })
  })
  // La URL de la foto lleva ?v={photo_updated_at}: un glob exacto no la casaría.
  await page.route(/\/api\/admin\/users\/me\/photo(\?.*)?$/, async (route) => {
    if (await esPreflight(route)) return
    await route.fulfill({
      status: 200,
      headers: { ...CORS, "Content-Type": "image/png" },
      body: PNG_1X1,
    })
  })
}

// Entra directo a /configuracion: SessionGate restaura la sesión con /auth/me.
const abrirConfiguracionReal = async (page: Page) => {
  await simularBackend(page)
  await page.goto("/configuracion")
  await expect(page.getByRole("heading", { level: 1, name: H1 })).toBeVisible()
  const main = page.getByRole("main")
  await expect(main.getByLabel(/^Correo/)).toHaveValue(TRIPULANTE_REAL.email)
  return main
}

const abrirPanelContrasena = async (page: Page) => {
  const main = await abrirConfiguracionReal(page)
  await main
    .getByRole("button", { name: "Cambiar contraseña", exact: true })
    .click()
  const panel = main.getByRole("group", { name: "Cambiar contraseña" })
  await expect(panel).toBeVisible()
  return { main, panel }
}

test.describe("E2E-08R Configuración con sesión real (backend simulado)", () => {
  test("E2E-08R carga los datos reales y la foto se descarga de verdad @movil", async ({
    page,
  }) => {
    const main = await abrirConfiguracionReal(page)

    await expect(
      main.getByText(TRIPULANTE_REAL.name, { exact: true })
    ).toBeVisible()
    await expect(main.getByLabel(/^Ciudad de residencia/)).toHaveValue(
      "Miami, FL"
    )
    await expect(main.getByText("EMP-100", { exact: true })).toBeVisible()
    await expect(main.getByText(AVISO_DEMO, { exact: true })).toHaveCount(0)

    const foto = main.getByRole("img", {
      name: `Foto de perfil de ${TRIPULANTE_REAL.name}`,
    })
    await expect(foto).toBeVisible()
    await expect
      .poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)

    // Ampliación A2: el <datalist> de la residencia tiene las ciudades del catálogo.
    const lista = await main
      .getByLabel(/^Ciudad de residencia/)
      .getAttribute("list")
    expect(lista, "la residencia debe tener el atributo list").toBeTruthy()
    await expect(page.locator(`datalist[id="${lista}"] option`)).toHaveCount(4)

    // Ampliación A4: el avatar del navbar también descarga la foto.
    const avatar = page
      .getByRole("button", { name: /^Menú de perfil de/ })
      .locator("img")
    await expect
      .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
  })

  test("E2E-08R tras cambiar la contraseña, el foco vuelve a «Cambiar contraseña» (FX-01)", async ({
    page,
  }) => {
    const { main, panel } = await abrirPanelContrasena(page)

    await panel.getByLabel(/^Contraseña Actual/).fill(ACTUAL)
    await panel.getByLabel(/^Nueva Contraseña/).fill(NUEVA)
    await panel.getByLabel(/^Confirmar Contraseña/).fill(NUEVA)
    await panel.getByRole("button", { name: "Actualizar contraseña" }).click()

    await expect(
      page
        .getByRole("region", { name: /Notificaciones/ })
        .getByText("Contraseña actualizada.", { exact: true })
    ).toBeVisible()
    await expect(panel).toHaveCount(0)
    await expect(
      main.getByRole("button", { name: "Cambiar contraseña", exact: true })
    ).toBeFocused()
    await expect(
      main.getByText(/Último cambio de contraseña:\s*hoy/)
    ).toBeVisible()
  })

  test("E2E-08R el ojo muestra y oculta la contraseña", async ({ page }) => {
    const { panel } = await abrirPanelContrasena(page)
    const actual = panel.getByLabel(/^Contraseña Actual/)
    await actual.fill(ACTUAL)
    await expect(actual).toHaveAttribute("type", "password")

    await panel
      .getByRole("button", { name: "Mostrar contraseña actual", exact: true })
      .click()
    await expect(actual).toHaveAttribute("type", "text")
    await expect(actual).toHaveValue(ACTUAL)

    await panel
      .getByRole("button", { name: "Ocultar contraseña actual", exact: true })
      .click()
    await expect(actual).toHaveAttribute("type", "password")
  })

  // Mismo criterio que E2E-11 (accesibilidad.spec.ts): WCAG 2.1 A/AA, sin violaciones
  // critical ni serious y sin los toasts. Se replica aquí porque un spec de Playwright
  // no puede importar otro.
  test("E2E-08R con el panel de contraseña abierto no hay violaciones critical ni serious de WCAG 2.1 A/AA", async ({
    page,
  }) => {
    await abrirPanelContrasena(page)
    await waitForLoaded(page)

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude("[data-sonner-toaster]")
      .analyze()
    const graves = violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => ({
        regla: v.id,
        impacto: v.impact,
        nodos: v.nodes.map((node) => ({
          selector: node.target.join(" "),
          html: node.html.slice(0, 160),
        })),
      }))
    expect(graves).toEqual([])
  })
})
